#include <WiFiS3.h>
#include <WiFiUdp.h>

#include "secrets.h"

const char DEVICE_ID[] = "haptell-04-triple-dc-shape";
const unsigned int UDP_PORT = 4444;

const byte MOTOR_COUNT = 3;
const int MOTOR_PWM_PINS[MOTOR_COUNT] = { 9, 10, 11 };

const byte MAX_SHAPE_POINTS = 30;
const unsigned int MAX_SHAPE_DURATION_MS = 15000;
const unsigned long SHAPE_UPDATE_INTERVAL_MS = 10;
const bool ENABLE_PWM_SERIAL_PLOTTER = true;
const unsigned int SERIAL_PLOTTER_TARGET_SAMPLES = 240;
const uint8_t SERIAL_PLOTTER_Y_MIN = 0;
const uint8_t SERIAL_PLOTTER_Y_MAX = 255;

struct ShapePoint {
  unsigned int timeMs;
  uint8_t intensity[MOTOR_COUNT];
};

WiFiUDP udp;
ShapePoint shapePoints[MAX_SHAPE_POINTS];
byte shapePointCount = 0;
bool serialOutputReady = false;
bool serialPlotterShapeActive = false;
unsigned long serialPlotterShapeStartedAt = 0;
unsigned long serialPlotterNextSampleAtMs = 0;
unsigned long serialPlotterSampleIntervalMs = SHAPE_UPDATE_INTERVAL_MS;

char packetBuffer[1200];

void setup() {
  for (byte motor = 0; motor < MOTOR_COUNT; motor++) {
    pinMode(MOTOR_PWM_PINS[motor], OUTPUT);
    analogWrite(MOTOR_PWM_PINS[motor], 0);
  }

  Serial.begin(115200);
  serialOutputReady = true;
  delay(500);

  Serial.println("Haptell 04 triple DC shape-only blocking firmware starting");
  Serial.print("Device ID: ");
  Serial.println(DEVICE_ID);

  connectToWiFi();
  udp.begin(UDP_PORT);
  Serial.print("Listening for UDP triple-motor shape commands on port ");
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

  if (!ENABLE_PWM_SERIAL_PLOTTER) {
    Serial.print("UDP command: ");
    Serial.println(command);
  }

  handleCommand(command);
}

void handleCommand(String command) {
  String target = nextToken(command);
  String action = nextToken(command);

  if (target != DEVICE_ID) {
    Serial.println("Ignored: command target does not match this haptell-04 device");
    return;
  }

  if (action == "shape") {
    playShape(command);
  } else if (action == "stop") {
    stopMotors();
  } else {
    Serial.println("Ignored: this firmware only supports shape and stop");
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
    Serial.println("Ignored: shape duration must be 1-15000 ms");
    return;
  }

  String pointsText = getStringParam(command, "points", "");
  if (!loadShapePoints(pointsText, (unsigned int)durationMs)) {
    Serial.println("Ignored: points must be sorted time:m1:m2:m3 values from 0 to duration and end with all motors at 0");
    return;
  }

  if (!ENABLE_PWM_SERIAL_PLOTTER) {
    Serial.print("Playing blocking triple DC PWM shape for ");
    Serial.print(durationMs);
    Serial.print(" ms with ");
    Serial.print(shapePointCount);
    Serial.println(" points");
  }

  beginSerialPlotterShape((unsigned int)durationMs);
  for (byte i = 1; i < shapePointCount; i++) {
    ShapePoint previous = shapePoints[i - 1];
    ShapePoint next = shapePoints[i];
    playSegment(previous, next);
  }

  stopMotors();
  endSerialPlotterShape();
}

void playSegment(ShapePoint from, ShapePoint to) {
  unsigned long durationMs = to.timeMs - from.timeMs;
  if (durationMs == 0) {
    writeMotorPwmValues(to.intensity);
    return;
  }

  unsigned long startedAt = millis();
  unsigned long elapsed = 0;
  uint8_t values[MOTOR_COUNT];

  while (elapsed < durationMs) {
    for (byte motor = 0; motor < MOTOR_COUNT; motor++) {
      values[motor] = interpolate(from.intensity[motor], to.intensity[motor], elapsed, durationMs);
    }
    writeMotorPwmValues(values);
    delay(SHAPE_UPDATE_INTERVAL_MS);
    elapsed = millis() - startedAt;
  }

  writeMotorPwmValues(to.intensity);
}

uint8_t interpolate(uint8_t from, uint8_t to, unsigned long elapsed, unsigned long duration) {
  if (duration == 0 || from == to) {
    return to;
  }

  long delta = (long)to - (long)from;
  long elapsedMs = (long)constrain(elapsed, 0, duration);
  long durationMs = (long)duration;
  long value = (long)from + (delta * elapsedMs / durationMs);
  return (uint8_t)constrain(value, 0, 255);
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

    ShapePoint point;
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

  ShapePoint first = shapePoints[0];
  ShapePoint last = shapePoints[shapePointCount - 1];
  return first.timeMs == 0 &&
         last.timeMs == durationMs &&
         last.intensity[0] == 0 &&
         last.intensity[1] == 0 &&
         last.intensity[2] == 0;
}

bool parseShapePoint(String text, ShapePoint *point) {
  int values[4];
  int start = 0;

  for (byte field = 0; field < 4; field++) {
    int separator = text.indexOf(':', start);
    bool isLastField = field == 3;

    if ((isLastField && separator >= 0) || (!isLastField && separator < 0)) {
      return false;
    }

    String valueText = isLastField ? text.substring(start) : text.substring(start, separator);
    if (!parseNonNegativeInt(valueText, &values[field])) {
      return false;
    }

    start = separator + 1;
  }

  if (values[0] < 0 || values[0] > MAX_SHAPE_DURATION_MS) {
    return false;
  }

  for (byte motor = 0; motor < MOTOR_COUNT; motor++) {
    if (values[motor + 1] < 0 || values[motor + 1] > 255) {
      return false;
    }
  }

  point->timeMs = (unsigned int)values[0];
  for (byte motor = 0; motor < MOTOR_COUNT; motor++) {
    point->intensity[motor] = (uint8_t)values[motor + 1];
  }

  return true;
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

void stopMotors() {
  uint8_t zeroValues[MOTOR_COUNT] = { 0, 0, 0 };
  writeMotorPwmValues(zeroValues);
}

void writeMotorPwmValues(const uint8_t values[MOTOR_COUNT]) {
  for (byte motor = 0; motor < MOTOR_COUNT; motor++) {
    analogWrite(MOTOR_PWM_PINS[motor], values[motor]);
  }
  plotPwmValues(values);
}

void beginSerialPlotterShape(unsigned int durationMs) {
  if (!ENABLE_PWM_SERIAL_PLOTTER || !serialOutputReady) {
    return;
  }

  serialPlotterShapeActive = true;
  serialPlotterShapeStartedAt = millis();
  serialPlotterNextSampleAtMs = 0;
  serialPlotterSampleIntervalMs =
    max(SHAPE_UPDATE_INTERVAL_MS, ((unsigned long)durationMs + SERIAL_PLOTTER_TARGET_SAMPLES - 1) / SERIAL_PLOTTER_TARGET_SAMPLES);
}

void endSerialPlotterShape() {
  if (!ENABLE_PWM_SERIAL_PLOTTER || !serialPlotterShapeActive) {
    return;
  }

  uint8_t zeroValues[MOTOR_COUNT] = { 0, 0, 0 };
  printSerialPlotterSample(zeroValues);
  serialPlotterShapeActive = false;
}

void plotPwmValues(const uint8_t values[MOTOR_COUNT]) {
  if (!ENABLE_PWM_SERIAL_PLOTTER || !serialOutputReady || !serialPlotterShapeActive) {
    return;
  }

  unsigned long elapsedMs = millis() - serialPlotterShapeStartedAt;
  if (elapsedMs < serialPlotterNextSampleAtMs) {
    return;
  }

  printSerialPlotterSample(values);
  do {
    serialPlotterNextSampleAtMs += serialPlotterSampleIntervalMs;
  } while (serialPlotterNextSampleAtMs <= elapsedMs);
}

void printSerialPlotterSample(const uint8_t values[MOTOR_COUNT]) {
  Serial.print("m1:");
  Serial.print(values[0]);
  Serial.print("\tm2:");
  Serial.print(values[1]);
  Serial.print("\tm3:");
  Serial.print(values[2]);
  Serial.print("\tmin:");
  Serial.print(SERIAL_PLOTTER_Y_MIN);
  Serial.print("\tmax:");
  Serial.println(SERIAL_PLOTTER_Y_MAX);
}
