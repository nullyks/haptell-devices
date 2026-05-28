#include <Wire.h>
#include <WiFiS3.h>
#include <WiFiUdp.h>
#include <Adafruit_DRV2605.h>

#include "secrets.h"

const char DEVICE_ID[] = "haptell-02";
const unsigned int UDP_PORT = 4444;
const unsigned long WIFI_RETRY_INTERVAL_MS = 10000;

const byte MAX_EFFECT_STEPS = 8;
const byte MAX_SHAPE_POINTS = 24;
const uint8_t DRV2605_LRA_LIBRARY = 6;
const unsigned int MAX_SHAPE_DURATION_MS = 5000;
const unsigned long SHAPE_UPDATE_INTERVAL_MS = 12;

struct EffectStep {
  uint8_t effect;
  unsigned long holdMs;
};

struct ShapePoint {
  unsigned int timeMs;
  uint8_t intensity;
};

WiFiUDP udp;
Adafruit_DRV2605 drv;

EffectStep effectSteps[MAX_EFFECT_STEPS];
byte effectStepCount = 0;
byte currentEffectStep = 0;
unsigned long effectStepStartedAt = 0;
bool sequencePlaying = false;

ShapePoint shapePoints[MAX_SHAPE_POINTS];
byte shapePointCount = 0;
unsigned int shapeDurationMs = 0;
unsigned long shapeStartedAt = 0;
unsigned long lastShapeUpdateAt = 0;
bool shapePlaying = false;

char packetBuffer[512];
unsigned long lastWifiAttemptAt = 0;
bool drvReady = false;

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("Haptell haptell-02 starting");
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
  keepWiFiConnected();
  readUdpCommand();
  updateEffectPlayer();
  updateShapePlayer();
}

void connectToWiFi() {
  Serial.print("Connecting to ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  lastWifiAttemptAt = millis();

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  delay(3000);

  Serial.println();
  Serial.print("Connected. IP address: ");
  Serial.println(WiFi.localIP());
}

void keepWiFiConnected() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  unsigned long now = millis();
  if (now - lastWifiAttemptAt < WIFI_RETRY_INTERVAL_MS) {
    return;
  }

  Serial.println("WiFi disconnected. Reconnecting...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  lastWifiAttemptAt = now;
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

  if (!drvReady && action != "stop") {
    Serial.println("Ignored: DRV2605L is not ready");
    return;
  }

  if (action == "pulse") {
    playPulse(getIntParam(command, "intensity", 180));
  } else if (action == "double") {
    playDoubleTap(getIntParam(command, "intensity", 220), getIntParam(command, "gap", 120));
  } else if (action == "ramp") {
    playRamp(getIntParam(command, "from", 60), getIntParam(command, "to", 255));
  } else if (action == "shape") {
    playShape(command);
  } else if (action == "stop") {
    stopPlayback();
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

void playPulse(int intensity) {
  stopShape();
  clearEffects();
  addEffect(effectForIntensity(intensity), 180);
  startEffects();
}

void playDoubleTap(int intensity, int gapMs) {
  stopShape();
  uint8_t effect = effectForIntensity(intensity);
  clearEffects();
  addEffect(effect, 120);
  addEffect(0, max(1, gapMs));
  addEffect(effect, 160);
  startEffects();
}

void playRamp(int fromIntensity, int toIntensity) {
  stopShape();
  clearEffects();
  addEffect(effectForIntensity(fromIntensity), 120);
  addEffect(effectForIntensity((fromIntensity + toIntensity) / 2), 140);
  addEffect(effectForIntensity(toIntensity), 220);
  startEffects();
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

  stopEffects();
  startShape((unsigned int)durationMs);
}

uint8_t effectForIntensity(int intensity) {
  int value = constrain(intensity, 0, 255);
  if (value < 80) {
    return 3;  // Soft click
  }
  if (value < 170) {
    return 2;  // Medium click
  }
  return 1;    // Strong click
}

void clearEffects() {
  effectStepCount = 0;
  currentEffectStep = 0;
  sequencePlaying = false;
}

void addEffect(uint8_t effect, unsigned long holdMs) {
  if (effectStepCount >= MAX_EFFECT_STEPS) {
    return;
  }

  effectSteps[effectStepCount++] = { effect, holdMs };
}

void startEffects() {
  if (effectStepCount == 0) {
    stopEffects();
    return;
  }

  prepareLibraryPlayback();
  currentEffectStep = 0;
  sequencePlaying = true;
  playCurrentEffectStep();
}

void updateEffectPlayer() {
  if (!sequencePlaying) {
    return;
  }

  unsigned long now = millis();
  if (now - effectStepStartedAt < effectSteps[currentEffectStep].holdMs) {
    return;
  }

  currentEffectStep++;
  if (currentEffectStep >= effectStepCount) {
    stopEffects();
    return;
  }

  playCurrentEffectStep();
}

void playCurrentEffectStep() {
  effectStepStartedAt = millis();

  uint8_t effect = effectSteps[currentEffectStep].effect;
  if (effect == 0) {
    drv.stop();
    return;
  }

  drv.setWaveform(0, effect);
  drv.setWaveform(1, 0);
  drv.go();
}

void stopEffects() {
  sequencePlaying = false;
  effectStepCount = 0;
  currentEffectStep = 0;
  if (!drvReady) {
    return;
  }

  prepareLibraryPlayback();
  drv.stop();
}

void startShape(unsigned int durationMs) {
  shapeDurationMs = durationMs;
  shapeStartedAt = millis();
  lastShapeUpdateAt = 0;
  shapePlaying = true;

  configureUnsignedUnidirectionalRtp();
  drv.setMode(DRV2605_MODE_REALTIME);
  drv.setRealtimeValue(shapePoints[0].intensity);

  Serial.print("Playing shape for ");
  Serial.print(shapeDurationMs);
  Serial.print(" ms with ");
  Serial.print(shapePointCount);
  Serial.println(" points");
}

void updateShapePlayer() {
  if (!shapePlaying) {
    return;
  }

  unsigned long now = millis();
  unsigned long elapsed = now - shapeStartedAt;

  if (elapsed >= shapeDurationMs) {
    stopShape();
    return;
  }

  if (lastShapeUpdateAt != 0 && now - lastShapeUpdateAt < SHAPE_UPDATE_INTERVAL_MS) {
    return;
  }

  lastShapeUpdateAt = now;
  drv.setRealtimeValue(shapeIntensityAt(elapsed));
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

void stopShape() {
  shapePlaying = false;
  shapePointCount = 0;
  shapeDurationMs = 0;

  if (!drvReady) {
    return;
  }

  drv.setRealtimeValue(0);
  prepareLibraryPlayback();
  drv.stop();
}

void stopPlayback() {
  stopShape();
  stopEffects();
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
