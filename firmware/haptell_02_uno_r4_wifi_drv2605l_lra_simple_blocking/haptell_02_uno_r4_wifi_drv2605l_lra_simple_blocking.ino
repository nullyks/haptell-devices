#include <Wire.h>
#include <WiFiS3.h>
#include <WiFiUdp.h>
#include <Adafruit_DRV2605.h>

#include "secrets.h"

const char DEVICE_ID[] = "haptell-02";
const unsigned int UDP_PORT = 4444;
const uint8_t DRV2605_LRA_LIBRARY = 6;
const byte MAX_SHAPE_POINTS = 24;
const unsigned int MAX_SHAPE_DURATION_MS = 5000;
const unsigned long SHAPE_UPDATE_INTERVAL_MS = 12;

struct ShapePoint {
  unsigned int timeMs;
  uint8_t intensity;
};

WiFiUDP udp;
Adafruit_DRV2605 drv;

ShapePoint shapePoints[MAX_SHAPE_POINTS];
byte shapePointCount = 0;

char packetBuffer[512];
bool drvReady = false;

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("Haptell haptell-02 simple blocking example starting");

  connectToWiFi();
  udp.begin(UDP_PORT);
  Serial.print("Listening for UDP commands on port ");
  Serial.println(UDP_PORT);

  Wire.begin();
  if (!drv.begin()) {
    Serial.println("DRV2605L not found. Check I2C wiring.");
  } else {
    drvReady = true;
    drv.useLRA();
    prepareLibraryPlayback();
    Serial.println("DRV2605L ready in LRA mode");
  }
}

void loop() {
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

void handleCommand(String command) {
  String target = nextToken(command);
  String action = nextToken(command);

  if (target != DEVICE_ID && target != "all") {
    Serial.println("Ignored: command target does not match this device");
    return;
  }

  if (!drvReady && action != "stop") {
    Serial.println("Ignored: DRV2605L is not ready");
    return;
  }

  if (action == "pulse") {
    playPulse();
  } else if (action == "double") {
    playDoubleTap();
  } else if (action == "ramp") {
    playRamp();
  } else if (action == "shape") {
    playShape(command);
  } else if (action == "custom") {
    playCustomRealtimeShape();
  } else if (action == "stop") {
    stopHaptics();
  } else {
    Serial.println("Ignored: unknown action");
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

void playPulse() {
  Serial.println("Playing pulse using a built-in DRV2605L effect");
  prepareLibraryPlayback();
  playLibraryEffect(1, 250);  // Strong click
}

void playDoubleTap() {
  Serial.println("Playing double tap using built-in DRV2605L effects");
  prepareLibraryPlayback();
  playLibraryEffect(2, 160);  // Medium click
  delay(120);
  playLibraryEffect(2, 220);
}

void playRamp() {
  Serial.println("Playing ramp-like sequence using built-in DRV2605L effects");
  prepareLibraryPlayback();
  playLibraryEffect(3, 140);   // Soft click
  playLibraryEffect(2, 160);   // Medium click
  playLibraryEffect(1, 260);   // Strong click
}

void playLibraryEffect(uint8_t effect, int waitMs) {
  drv.setWaveform(0, effect);
  drv.setWaveform(1, 0);
  drv.go();
  delay(waitMs);
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

  Serial.print("Playing blocking shape for ");
  Serial.print(durationMs);
  Serial.print(" ms with ");
  Serial.print(shapePointCount);
  Serial.println(" points");

  configureUnsignedUnidirectionalRtp();
  drv.setMode(DRV2605_MODE_REALTIME);

  unsigned long startedAt = millis();
  unsigned long lastUpdateAt = 0;

  while (true) {
    unsigned long now = millis();
    unsigned long elapsed = now - startedAt;

    if (elapsed >= (unsigned long)durationMs) {
      break;
    }

    if (lastUpdateAt == 0 || now - lastUpdateAt >= SHAPE_UPDATE_INTERVAL_MS) {
      drv.setRealtimeValue(shapeIntensityAt(elapsed));
      lastUpdateAt = now;
    }

    delay(1);
  }

  drv.setRealtimeValue(0);
  prepareLibraryPlayback();
}

uint8_t shapeIntensityAt(unsigned long elapsedMs) {
  if (shapePointCount == 0) {
    return 0;
  }

  if (elapsedMs <= shapePoints[0].timeMs) {
    return shapePoints[0].intensity;
  }

  for (byte i = 1; i < shapePointCount; i++) {
    if (elapsedMs <= shapePoints[i].timeMs) {
      ShapePoint previous = shapePoints[i - 1];
      ShapePoint next = shapePoints[i];
      unsigned int segmentDuration = next.timeMs - previous.timeMs;

      if (segmentDuration == 0) {
        return next.intensity;
      }

      unsigned long segmentElapsed = elapsedMs - previous.timeMs;
      long delta = (long)next.intensity - (long)previous.intensity;
      long value = previous.intensity + (delta * segmentElapsed / segmentDuration);
      return (uint8_t)constrain(value, 0, 255);
    }
  }

  return shapePoints[shapePointCount - 1].intensity;
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
    shapePoints[shapePointCount].intensity = (uint8_t)constrain(intensity, 0, 255);
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

void playCustomRealtimeShape() {
  Serial.println("Playing custom realtime shape without built-in effect numbers");

  configureUnsignedUnidirectionalRtp();
  drv.setMode(DRV2605_MODE_REALTIME);

  for (uint8_t value = 0; value < 180; value += 10) {
    drv.setRealtimeValue(value);
    delay(15);
  }

  delay(120);

  for (int value = 180; value >= 0; value -= 10) {
    drv.setRealtimeValue((uint8_t)value);
    delay(20);
  }

  drv.setRealtimeValue(0);
  prepareLibraryPlayback();
}

void stopHaptics() {
  Serial.println("Stopping haptics");
  if (!drvReady) {
    return;
  }

  drv.setRealtimeValue(0);
  drv.stop();
  prepareLibraryPlayback();
}

void prepareLibraryPlayback() {
  restoreSignedBidirectionalInput();
  drv.useLRA();
  drv.selectLibrary(DRV2605_LRA_LIBRARY);
  drv.setMode(DRV2605_MODE_INTTRIG);
}

void configureUnsignedUnidirectionalRtp() {
  uint8_t control2 = drv.readRegister8(DRV2605_REG_CONTROL2);
  uint8_t control3 = drv.readRegister8(DRV2605_REG_CONTROL3);

  drv.writeRegister8(DRV2605_REG_CONTROL2, control2 & ~0x80);
  drv.writeRegister8(DRV2605_REG_CONTROL3, control3 | 0x08);
}

void restoreSignedBidirectionalInput() {
  uint8_t control2 = drv.readRegister8(DRV2605_REG_CONTROL2);
  uint8_t control3 = drv.readRegister8(DRV2605_REG_CONTROL3);

  drv.writeRegister8(DRV2605_REG_CONTROL2, control2 | 0x80);
  drv.writeRegister8(DRV2605_REG_CONTROL3, control3 & ~0x08);
}
