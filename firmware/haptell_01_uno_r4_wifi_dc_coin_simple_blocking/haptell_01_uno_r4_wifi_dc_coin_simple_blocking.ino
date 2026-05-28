#include <WiFiS3.h>
#include <WiFiUdp.h>

#include "secrets.h"

const char DEVICE_ID[] = "haptell-01";
const unsigned int UDP_PORT = 4444;
const int MOTOR_PWM_PIN = 9;

const byte MAX_SHAPE_POINTS = 24;
const unsigned int MAX_SHAPE_DURATION_MS = 5000;
const unsigned long SHAPE_UPDATE_INTERVAL_MS = 10;

struct ShapePoint {
  unsigned int timeMs;
  uint8_t intensity;
};

WiFiUDP udp;
ShapePoint shapePoints[MAX_SHAPE_POINTS];
byte shapePointCount = 0;

char packetBuffer[512];

void setup() {
  pinMode(MOTOR_PWM_PIN, OUTPUT);
  stopMotor();

  Serial.begin(115200);
  delay(500);

  Serial.println("Haptell haptell-01 simple blocking starting");
  connectToWiFi();
  udp.begin(UDP_PORT);
  Serial.print("Listening for UDP commands on port ");
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

  Serial.print("UDP command: ");
  Serial.println(command);

  handleCommand(command);
}

void handleCommand(String command) {
  String target = nextToken(command);
  String action = nextToken(command);

  if (!isAddressedToThisDevice(target)) {
    Serial.println("Ignored: command target does not match this device");
    return;
  }

  if (action == "pulse") {
    playPulse(
      getIntParam(command, "intensity", 180),
      getIntParam(command, "duration", 800)
    );
  } else if (action == "double") {
    playDoubleTap(
      getIntParam(command, "intensity", 220),
      getIntParam(command, "gap", 120)
    );
  } else if (action == "ramp") {
    playRamp(
      getIntParam(command, "from", 60),
      getIntParam(command, "to", 255),
      getIntParam(command, "duration", 1200)
    );
  } else if (action == "shape") {
    playShape(command);
  } else if (action == "stop") {
    stopMotor();
  } else {
    Serial.println("Ignored: unknown action");
  }
}

bool isAddressedToThisDevice(String target) {
  return target == DEVICE_ID || target == "all";
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

void playPulse(int intensity, int durationMs) {
  uint8_t level = constrainIntensity(intensity);
  playSegment(0, level, 25);
  analogWrite(MOTOR_PWM_PIN, level);
  delay(max(1, durationMs));
  playSegment(level, 0, 80);
  stopMotor();
}

void playDoubleTap(int intensity, int gapMs) {
  uint8_t level = constrainIntensity(intensity);
  playSegment(0, level, 15);
  delay(90);
  playSegment(level, 0, 45);
  stopMotor();
  delay(max(1, gapMs));
  playSegment(0, level, 15);
  delay(90);
  playSegment(level, 0, 80);
  stopMotor();
}

void playRamp(int fromIntensity, int toIntensity, int durationMs) {
  uint8_t from = constrainIntensity(fromIntensity);
  uint8_t to = constrainIntensity(toIntensity);
  playSegment(from, to, max(1, durationMs));
  playSegment(to, 0, 100);
  stopMotor();
}

void playShape(String command) {
  int durationMs = getIntParam(command, "duration", -1);
  if (durationMs <= 0 || durationMs > MAX_SHAPE_DURATION_MS) {
    Serial.println("Ignored: shape duration must be 1-5000 ms");
    return;
  }

  String pointsText = getStringParam(command, "points", "");
  if (!loadShapePoints(pointsText, (unsigned int)durationMs)) {
    Serial.println("Ignored: shape points must be sorted time:intensity pairs from 0 to duration");
    return;
  }

  Serial.print("Playing blocking DC PWM shape for ");
  Serial.print(durationMs);
  Serial.print(" ms with ");
  Serial.print(shapePointCount);
  Serial.println(" points");

  for (byte i = 1; i < shapePointCount; i++) {
    ShapePoint previous = shapePoints[i - 1];
    ShapePoint next = shapePoints[i];
    playSegment(previous.intensity, next.intensity, next.timeMs - previous.timeMs);
  }

  stopMotor();
}

void playSegment(uint8_t from, uint8_t to, unsigned long durationMs) {
  if (durationMs == 0) {
    analogWrite(MOTOR_PWM_PIN, to);
    return;
  }

  unsigned long startedAt = millis();
  unsigned long elapsed = 0;

  while (elapsed < durationMs) {
    analogWrite(MOTOR_PWM_PIN, interpolate(from, to, elapsed, durationMs));
    delay(SHAPE_UPDATE_INTERVAL_MS);
    elapsed = millis() - startedAt;
  }

  analogWrite(MOTOR_PWM_PIN, to);
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
    String pair = comma < 0 ? pointsText.substring(start) : pointsText.substring(start, comma);
    pair.trim();

    int separator = pair.indexOf(':');
    if (separator <= 0 || separator >= pair.length() - 1) {
      return false;
    }

    int timeMs = 0;
    int intensity = 0;
    if (!parseNonNegativeInt(pair.substring(0, separator), &timeMs) ||
        !parseNonNegativeInt(pair.substring(separator + 1), &intensity)) {
      return false;
    }

    if (timeMs < 0 || timeMs > durationMs || intensity < 0 || intensity > 255) {
      return false;
    }

    if (shapePointCount > 0 && timeMs <= shapePoints[shapePointCount - 1].timeMs) {
      return false;
    }

    shapePoints[shapePointCount].timeMs = (unsigned int)timeMs;
    shapePoints[shapePointCount].intensity = constrainIntensity(intensity);
    shapePointCount++;

    if (comma < 0) {
      break;
    }
    start = comma + 1;
  }

  if (shapePointCount < 2) {
    return false;
  }

  return shapePoints[0].timeMs == 0 && shapePoints[shapePointCount - 1].timeMs == durationMs;
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

uint8_t constrainIntensity(int value) {
  return (uint8_t)constrain(value, 0, 255);
}

void stopMotor() {
  analogWrite(MOTOR_PWM_PIN, 0);
}
