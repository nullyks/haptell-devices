#include <Wire.h>
#include <WiFiS3.h>
#include <WiFiUdp.h>
#include <Adafruit_DRV2605.h>

#include "secrets.example.h"

const char DEVICE_ID[] = "haptell-02-drv2605l-shape";
const unsigned int UDP_PORT = 4444;
const uint8_t DRV2605_LRA_LIBRARY = 6;

const byte MAX_SHAPE_POINTS = 30;
const unsigned int MAX_SHAPE_DURATION_MS = 15000;
const unsigned long SHAPE_UPDATE_INTERVAL_MS = 10;
const bool ENABLE_DRIVE_SERIAL_PLOTTER = true;
const unsigned int SERIAL_PLOTTER_TARGET_SAMPLES = 240;
const uint8_t SERIAL_PLOTTER_Y_MIN = 0;
const uint8_t SERIAL_PLOTTER_Y_MAX = 255;

struct ShapePoint {
  unsigned int timeMs;
  uint8_t intensity;
};

WiFiUDP udp;
Adafruit_DRV2605 drv;

ShapePoint shapePoints[MAX_SHAPE_POINTS];
byte shapePointCount = 0;
bool serialOutputReady = false;
bool serialPlotterShapeActive = false;
unsigned long serialPlotterShapeStartedAt = 0;
unsigned long serialPlotterNextSampleAtMs = 0;
unsigned long serialPlotterSampleIntervalMs = SHAPE_UPDATE_INTERVAL_MS;

char packetBuffer[768];
bool drvReady = false;

void setup() {
  Serial.begin(115200);
  serialOutputReady = true;
  delay(500);

  Serial.println("Haptell DRV2605L LRA shape-only blocking firmware starting");
  Serial.print("Device ID: ");
  Serial.println(DEVICE_ID);

  connectToWiFi();
  udp.begin(UDP_PORT);
  Serial.print("Listening for UDP shape commands on port ");
  Serial.println(UDP_PORT);

  Wire.begin();
  if (!drv.begin()) {
    Serial.println("DRV2605L not found. Check I2C wiring.");
  } else {
    drvReady = true;
    prepareLibraryPlayback();
    Serial.println("DRV2605L ready in LRA mode");
  }
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

  if (!ENABLE_DRIVE_SERIAL_PLOTTER) {
    Serial.print("UDP command: ");
    Serial.println(command);
  }

  handleCommand(command);
}

void handleCommand(String command) {
  String target = nextToken(command);
  String action = nextToken(command);

  if (target != DEVICE_ID) {
    Serial.println("Ignored: command target does not match this shape-only device");
    return;
  }

  if (!drvReady && action != "stop") {
    Serial.println("Ignored: DRV2605L is not ready");
    return;
  }

  if (action == "shape") {
    playShape(command);
  } else if (action == "stop") {
    stopHaptics();
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

  if (!ENABLE_DRIVE_SERIAL_PLOTTER) {
    Serial.print("Playing blocking DRV2605L realtime shape for ");
    Serial.print(durationMs);
    Serial.print(" ms with ");
    Serial.print(shapePointCount);
    Serial.println(" points");
  }

  beginSerialPlotterShape((unsigned int)durationMs);
  configureUnsignedUnidirectionalRtp();
  drv.setMode(DRV2605_MODE_REALTIME);

  unsigned long startedAt = millis();
  unsigned long lastUpdateAt = 0;

  while (millis() - startedAt < (unsigned long)durationMs) {
    unsigned long now = millis();
    unsigned long elapsed = now - startedAt;

    if (lastUpdateAt == 0 || now - lastUpdateAt >= SHAPE_UPDATE_INTERVAL_MS) {
      setRealtimeDriveValue(shapeIntensityAt(elapsed));
      lastUpdateAt = now;
    }

    delay(1);
  }

  setRealtimeDriveValue(0);
  prepareLibraryPlayback();
  endSerialPlotterShape();
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

      long segmentElapsedMs = (long)constrain(elapsedMs - previous.timeMs, 0UL, (unsigned long)segmentDuration);
      long segmentDurationMs = (long)segmentDuration;
      long delta = (long)next.intensity - (long)previous.intensity;
      long value = (long)previous.intensity + (delta * segmentElapsedMs / segmentDurationMs);
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

void stopHaptics() {
  if (!drvReady) {
    return;
  }

  setRealtimeDriveValue(0);
  drv.stop();
  prepareLibraryPlayback();
}

void setRealtimeDriveValue(uint8_t driveValue) {
  drv.setRealtimeValue(driveValue);
  plotDriveValue(driveValue);
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

void beginSerialPlotterShape(unsigned int durationMs) {
  if (!ENABLE_DRIVE_SERIAL_PLOTTER || !serialOutputReady) {
    return;
  }

  serialPlotterShapeActive = true;
  serialPlotterShapeStartedAt = millis();
  serialPlotterNextSampleAtMs = 0;
  serialPlotterSampleIntervalMs =
    max(SHAPE_UPDATE_INTERVAL_MS, ((unsigned long)durationMs + SERIAL_PLOTTER_TARGET_SAMPLES - 1) / SERIAL_PLOTTER_TARGET_SAMPLES);
}

void endSerialPlotterShape() {
  if (!ENABLE_DRIVE_SERIAL_PLOTTER || !serialPlotterShapeActive) {
    return;
  }

  printSerialPlotterSample(0);
  serialPlotterShapeActive = false;
}

void plotDriveValue(uint8_t driveValue) {
  if (!ENABLE_DRIVE_SERIAL_PLOTTER || !serialOutputReady || !serialPlotterShapeActive) {
    return;
  }

  unsigned long elapsedMs = millis() - serialPlotterShapeStartedAt;
  if (elapsedMs < serialPlotterNextSampleAtMs) {
    return;
  }

  printSerialPlotterSample(driveValue);
  do {
    serialPlotterNextSampleAtMs += serialPlotterSampleIntervalMs;
  } while (serialPlotterNextSampleAtMs <= elapsedMs);
}

void printSerialPlotterSample(uint8_t driveValue) {
  // The min/max traces keep Arduino Serial Plotter's Y scale pinned to 0..255.
  Serial.print("drive:");
  Serial.print(driveValue);
  Serial.print("\tmin:");
  Serial.print(SERIAL_PLOTTER_Y_MIN);
  Serial.print("\tmax:");
  Serial.println(SERIAL_PLOTTER_Y_MAX);
}
