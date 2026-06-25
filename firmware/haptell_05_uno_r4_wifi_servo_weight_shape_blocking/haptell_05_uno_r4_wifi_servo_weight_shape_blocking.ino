#include <Servo.h>
#include <WiFiS3.h>
#include <WiFiUdp.h>

#include "secrets.h"

const char DEVICE_ID[] = "haptell-05-servo-shape";
const unsigned int UDP_PORT = 4444;

const int SERVO_PIN = 9;
const int SERVO_MIN_ANGLE_DEG = 0;
const int SERVO_MAX_ANGLE_DEG = 270;
const int SERVO_NEUTRAL_ANGLE_DEG = 135;
const int SERVO_MIN_US = 500;
const int SERVO_MAX_US = 2500;

const byte MAX_SHAPE_POINTS = 30;
const unsigned int MAX_SHAPE_DURATION_MS = 15000;
const unsigned long SHAPE_UPDATE_INTERVAL_MS = 10;
const bool ENABLE_SERVO_SERIAL_PLOTTER = true;
const unsigned int SERIAL_PLOTTER_TARGET_SAMPLES = 240;

enum Easing {
  EASE_LINEAR,
  EASE_IN,
  EASE_OUT,
  EASE_IN_OUT
};

struct ServoShapePoint {
  unsigned int timeMs;
  int angleDeg;
  Easing easing;
};

WiFiUDP udp;
Servo servo;
ServoShapePoint shapePoints[MAX_SHAPE_POINTS];
byte shapePointCount = 0;
bool serialOutputReady = false;
bool serialPlotterShapeActive = false;
unsigned long serialPlotterShapeStartedAt = 0;
unsigned long serialPlotterNextSampleAtMs = 0;
unsigned long serialPlotterSampleIntervalMs = SHAPE_UPDATE_INTERVAL_MS;

char packetBuffer[1400];

void setup() {
  servo.attach(SERVO_PIN, SERVO_MIN_US, SERVO_MAX_US);
  writeServoAngle(SERVO_NEUTRAL_ANGLE_DEG);

  Serial.begin(115200);
  serialOutputReady = true;
  delay(500);

  Serial.println("Haptell 05 servo shape-only blocking firmware starting");
  Serial.print("Device ID: ");
  Serial.println(DEVICE_ID);
  Serial.print("Servo pin: D");
  Serial.println(SERVO_PIN);

  connectToWiFi();
  udp.begin(UDP_PORT);
  Serial.print("Listening for UDP servo-shape commands on port ");
  Serial.println(UDP_PORT);
}

void loop() {
  readUdpCommand();
}

void connectToWiFi() {
  Serial.print("Connecting to ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  delay(3000);

  Serial.println();
  Serial.print("Connected. IP address: ");
  Serial.println(WiFi.localIP());
}

void readUdpCommand() {
  int packetSize = udp.parsePacket();
  if (packetSize <= 0) {
    return;
  }

  int length = udp.read(packetBuffer, sizeof(packetBuffer) - 1);
  if (length <= 0) {
    return;
  }

  packetBuffer[length] = '\0';
  String command = String(packetBuffer);
  command.trim();

  if (!ENABLE_SERVO_SERIAL_PLOTTER) {
    Serial.print("UDP command: ");
    Serial.println(command);
  }

  handleCommand(command);
}

void handleCommand(String command) {
  String firstToken = nextToken(command);

  if (firstToken == "servo-shape") {
    playShape(command);
    return;
  }

  if (firstToken == "stop") {
    stopServo();
    return;
  }

  if (firstToken != DEVICE_ID && firstToken != "haptell-05") {
    Serial.println("Ignored: command is not for this haptell-05 servo device");
    return;
  }

  String action = nextToken(command);
  if (action == "servo-shape") {
    playShape(command);
  } else if (action == "stop") {
    stopServo();
  } else {
    Serial.println("Ignored: this firmware only supports servo-shape and stop");
  }
}

String nextToken(String &text) {
  text.trim();
  int separator = text.indexOf(' ');
  if (separator < 0) {
    String token = text;
    text = "";
    return token;
  }

  String token = text.substring(0, separator);
  text = text.substring(separator + 1);
  text.trim();
  return token;
}

int getIntParam(String text, const char *name, int fallback) {
  String key = String(name) + "=";
  int start = text.indexOf(key);
  if (start < 0) {
    return fallback;
  }

  start += key.length();
  int end = text.indexOf(' ', start);
  String value = end < 0 ? text.substring(start) : text.substring(start, end);
  value.trim();

  if (value.length() == 0) {
    return fallback;
  }

  return value.toInt();
}

String getStringParam(String text, const char *name, const char *fallback) {
  String key = String(name) + "=";
  int start = text.indexOf(key);
  if (start < 0) {
    return String(fallback);
  }

  start += key.length();
  int end = text.indexOf(' ', start);
  String value = end < 0 ? text.substring(start) : text.substring(start, end);
  value.trim();

  if (value.length() == 0) {
    return String(fallback);
  }

  return value;
}

void playShape(String command) {
  int durationMs = getIntParam(command, "duration", -1);
  if (durationMs <= 0 || durationMs > MAX_SHAPE_DURATION_MS) {
    Serial.println("Ignored: servo-shape duration must be 1-15000 ms");
    return;
  }

  String pointsText = getStringParam(command, "points", "");
  if (!loadShapePoints(pointsText, (unsigned int)durationMs)) {
    Serial.println("Ignored: points must be sorted time:angle:easing values from 0 to duration");
    return;
  }

  if (!ENABLE_SERVO_SERIAL_PLOTTER) {
    Serial.print("Playing blocking servo shape for ");
    Serial.print(durationMs);
    Serial.print(" ms with ");
    Serial.print(shapePointCount);
    Serial.println(" points");
  }

  writeServoAngle(shapePoints[0].angleDeg);
  beginSerialPlotterShape((unsigned int)durationMs);
  for (byte i = 1; i < shapePointCount; i++) {
    ServoShapePoint previous = shapePoints[i - 1];
    ServoShapePoint next = shapePoints[i];
    playSegment(previous, next);
  }

  writeServoAngle(shapePoints[shapePointCount - 1].angleDeg);
  endSerialPlotterShape();
}

void playSegment(ServoShapePoint from, ServoShapePoint to) {
  unsigned long durationMs = to.timeMs - from.timeMs;
  if (durationMs == 0) {
    writeServoAngle(to.angleDeg);
    return;
  }

  unsigned long startedAt = millis();
  unsigned long elapsed = 0;

  while (elapsed < durationMs) {
    int angle = interpolateAngle(from.angleDeg, to.angleDeg, elapsed, durationMs, to.easing);
    writeServoAngle(angle);
    delay(SHAPE_UPDATE_INTERVAL_MS);
    elapsed = millis() - startedAt;
  }

  writeServoAngle(to.angleDeg);
}

int interpolateAngle(int from, int to, unsigned long elapsed, unsigned long duration, Easing easing) {
  if (duration == 0 || from == to) {
    return to;
  }

  float t = (float)constrain(elapsed, 0, duration) / (float)duration;
  float progress = easeProgress(t, easing);
  float angle = (float)from + ((float)to - (float)from) * progress;
  return constrain((int)(angle + 0.5f), SERVO_MIN_ANGLE_DEG, SERVO_MAX_ANGLE_DEG);
}

float easeProgress(float t, Easing easing) {
  t = constrain(t, 0.0f, 1.0f);

  if (easing == EASE_IN) {
    return t * t;
  }

  if (easing == EASE_OUT) {
    float u = 1.0f - t;
    return 1.0f - u * u;
  }

  if (easing == EASE_IN_OUT) {
    if (t < 0.5f) {
      return 2.0f * t * t;
    }

    float u = -2.0f * t + 2.0f;
    return 1.0f - (u * u) / 2.0f;
  }

  return t;
}

bool loadShapePoints(String pointsText, unsigned int durationMs) {
  pointsText.trim();
  if (pointsText.length() == 0) {
    return false;
  }

  shapePointCount = 0;
  int start = 0;

  while (start < pointsText.length()) {
    if (shapePointCount >= MAX_SHAPE_POINTS) {
      return false;
    }

    int comma = pointsText.indexOf(',', start);
    String pointText = comma < 0 ? pointsText.substring(start) : pointsText.substring(start, comma);
    pointText.trim();

    ServoShapePoint point;
    if (!parseShapePoint(pointText, &point)) {
      return false;
    }

    if (point.timeMs > durationMs) {
      return false;
    }

    if (shapePointCount > 0 && point.timeMs <= shapePoints[shapePointCount - 1].timeMs) {
      return false;
    }

    shapePoints[shapePointCount] = point;
    shapePointCount++;

    if (comma < 0) {
      break;
    }
    start = comma + 1;
  }

  if (shapePointCount < 2) {
    return false;
  }

  ServoShapePoint first = shapePoints[0];
  ServoShapePoint last = shapePoints[shapePointCount - 1];
  return first.timeMs == 0 && last.timeMs == durationMs;
}

bool parseShapePoint(String text, ServoShapePoint *point) {
  int firstSeparator = text.indexOf(':');
  int secondSeparator = text.indexOf(':', firstSeparator + 1);

  if (firstSeparator < 0 || secondSeparator < 0 || text.indexOf(':', secondSeparator + 1) >= 0) {
    return false;
  }

  int timeMs = 0;
  int angleDeg = 0;
  Easing easing = EASE_LINEAR;

  if (!parseNonNegativeInt(text.substring(0, firstSeparator), &timeMs)) {
    return false;
  }

  if (!parseNonNegativeInt(text.substring(firstSeparator + 1, secondSeparator), &angleDeg)) {
    return false;
  }

  if (!parseEasing(text.substring(secondSeparator + 1), &easing)) {
    return false;
  }

  if (timeMs < 0 || timeMs > MAX_SHAPE_DURATION_MS) {
    return false;
  }

  if (angleDeg < SERVO_MIN_ANGLE_DEG || angleDeg > SERVO_MAX_ANGLE_DEG) {
    return false;
  }

  point->timeMs = (unsigned int)timeMs;
  point->angleDeg = angleDeg;
  point->easing = easing;

  return true;
}

bool parseEasing(String text, Easing *easing) {
  text.trim();

  if (text == "linear") {
    *easing = EASE_LINEAR;
    return true;
  }

  if (text == "easeIn") {
    *easing = EASE_IN;
    return true;
  }

  if (text == "easeOut") {
    *easing = EASE_OUT;
    return true;
  }

  if (text == "easeInOut") {
    *easing = EASE_IN_OUT;
    return true;
  }

  return false;
}

bool parseNonNegativeInt(String text, int *value) {
  text.trim();
  if (text.length() == 0) {
    return false;
  }

  long result = 0;
  for (unsigned int i = 0; i < text.length(); i++) {
    char c = text.charAt(i);
    if (c < '0' || c > '9') {
      return false;
    }

    result = result * 10 + (c - '0');
    if (result > 32767) {
      return false;
    }
  }

  *value = (int)result;
  return true;
}

void stopServo() {
  writeServoAngle(SERVO_NEUTRAL_ANGLE_DEG);
  Serial.println("Servo returned to neutral");
}

void writeServoAngle(int angleDeg) {
  int safeAngle = constrain(angleDeg, SERVO_MIN_ANGLE_DEG, SERVO_MAX_ANGLE_DEG);
  int pulseUs = angleToPulseUs(safeAngle);
  servo.writeMicroseconds(pulseUs);
  plotServoSample(safeAngle, pulseUs);
}

int angleToPulseUs(int angleDeg) {
  long pulse = SERVO_MIN_US + ((long)angleDeg * (SERVO_MAX_US - SERVO_MIN_US) + SERVO_MAX_ANGLE_DEG / 2) / SERVO_MAX_ANGLE_DEG;
  return (int)constrain(pulse, SERVO_MIN_US, SERVO_MAX_US);
}

void beginSerialPlotterShape(unsigned int durationMs) {
  if (!ENABLE_SERVO_SERIAL_PLOTTER || !serialOutputReady) {
    return;
  }

  serialPlotterShapeActive = true;
  serialPlotterShapeStartedAt = millis();
  serialPlotterNextSampleAtMs = 0;
  serialPlotterSampleIntervalMs =
    max(SHAPE_UPDATE_INTERVAL_MS, ((unsigned long)durationMs + SERIAL_PLOTTER_TARGET_SAMPLES - 1) / SERIAL_PLOTTER_TARGET_SAMPLES);
}

void endSerialPlotterShape() {
  if (!ENABLE_SERVO_SERIAL_PLOTTER || !serialPlotterShapeActive) {
    return;
  }

  writeServoAngle(shapePoints[shapePointCount - 1].angleDeg);
  serialPlotterShapeActive = false;
}

void plotServoSample(int angleDeg, int pulseUs) {
  if (!ENABLE_SERVO_SERIAL_PLOTTER || !serialOutputReady || !serialPlotterShapeActive) {
    return;
  }

  unsigned long elapsedMs = millis() - serialPlotterShapeStartedAt;
  if (elapsedMs < serialPlotterNextSampleAtMs) {
    return;
  }

  Serial.print("angle:");
  Serial.print(angleDeg);
  Serial.print("\tpulse:");
  Serial.print(pulseUs);
  Serial.print("\tneutral:");
  Serial.print(SERVO_NEUTRAL_ANGLE_DEG);
  Serial.print("\tmin:");
  Serial.print(SERVO_MIN_ANGLE_DEG);
  Serial.print("\tmax:");
  Serial.println(SERVO_MAX_ANGLE_DEG);

  do {
    serialPlotterNextSampleAtMs += serialPlotterSampleIntervalMs;
  } while (serialPlotterNextSampleAtMs <= elapsedMs);
}
