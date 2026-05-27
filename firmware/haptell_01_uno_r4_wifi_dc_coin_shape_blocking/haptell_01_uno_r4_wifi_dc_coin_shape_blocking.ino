#include <WiFiS3.h>
#include <WiFiUdp.h>

#include "secrets.h"

const char DEVICE_ID[] = "haptell-01-dc-shape";
const unsigned int UDP_PORT = 4444;
const int MOTOR_PWM_PIN = 9;

const byte MAX_SHAPE_POINTS = 30;
const unsigned int MAX_SHAPE_DURATION_MS = 15000;
const unsigned long SHAPE_UPDATE_INTERVAL_MS = 10;

struct ShapePoint {
  unsigned int timeMs;
  uint8_t intensity;
};

WiFiUDP udp;
ShapePoint shapePoints[MAX_SHAPE_POINTS];
byte shapePointCount = 0;

char packetBuffer[768];

void setup() {
  pinMode(MOTOR_PWM_PIN, OUTPUT);
  stopMotor();

  Serial.begin(115200);
  delay(500);

  Serial.println("Haptell DC shape-only blocking firmware starting");
  Serial.print("Device ID: ");
  Serial.println(DEVICE_ID);

  connectToWiFi();
  udp.begin(UDP_PORT);
  Serial.print("Listening for UDP shape commands on port ");
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

  if (target != DEVICE_ID) {
    Serial.println("Ignored: command target does not match this shape-only device");
    return;
  }

  if (action == "shape") {
    playShape(command);
  } else if (action == "stop") {
    stopMotor();
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
    Serial.println("Ignored: points must start at time 0, end at duration with intensity 0, and stay sorted");
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
  return (uint8_t)constrain(from + (delta * elapsed / duration), 0, 255);
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
    shapePoints[shapePointCount].intensity = (uint8_t)intensity;
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
  return first.timeMs == 0 && last.timeMs == durationMs && last.intensity == 0;
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

void stopMotor() {
  analogWrite(MOTOR_PWM_PIN, 0);
}
