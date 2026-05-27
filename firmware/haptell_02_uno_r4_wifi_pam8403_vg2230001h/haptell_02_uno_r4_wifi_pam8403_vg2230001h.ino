#include <WiFiS3.h>
#include <WiFiUdp.h>
#include "dac.h"

#include "secrets.h"

const char DEVICE_ID[] = "haptell-02";
const unsigned int UDP_PORT = 4444;
const unsigned long WIFI_RETRY_INTERVAL_MS = 10000;

const byte MAX_SHAPE_POINTS = 24;
const unsigned int MAX_SHAPE_DURATION_MS = 5000;
const unsigned long ENVELOPE_UPDATE_INTERVAL_MS = 5;

const float CARRIER_FREQUENCY_HZ = 70.0;
const byte SINE_TABLE_SIZE = 32;
const unsigned long CARRIER_SAMPLE_RATE_HZ = 2240;
const unsigned long CARRIER_SAMPLE_INTERVAL_US = 1000000UL / CARRIER_SAMPLE_RATE_HZ;

const int DAC_MIDPOINT = 2048;
const int DAC_MAX_VALUE = 4095;

// Safe starting value for a 5 V UNO R4 DAC feeding a PAM8403 input.
// Increase only after measuring Vrms across the actuator.
const uint16_t MAX_DAC_SWING_COUNTS = 120;

struct ShapePoint {
  unsigned int timeMs;
  uint8_t intensity;
};

WiFiUDP udp;

ShapePoint shapePoints[MAX_SHAPE_POINTS];
byte shapePointCount = 0;
unsigned int shapeDurationMs = 0;
unsigned long shapeStartedAt = 0;
unsigned long lastEnvelopeUpdateAt = 0;
bool shapePlaying = false;

int16_t sineTable[SINE_TABLE_SIZE];
byte sineIndex = 0;
unsigned long nextCarrierSampleAtUs = 0;
bool carrierRunning = false;
uint8_t currentDrive = 0;

char packetBuffer[512];
unsigned long lastWifiAttemptAt = 0;

void setup() {
  Serial.begin(115200);
  delay(500);

  prepareSineTable();
  setupDacOutput();

  Serial.println("Haptell haptell-02 PAM8403/VG2230001H starting");
  Serial.print("Carrier frequency: ");
  Serial.print(CARRIER_FREQUENCY_HZ);
  Serial.println(" Hz");

  connectToWiFi();
  udp.begin(UDP_PORT);
  Serial.print("Listening for UDP commands on port ");
  Serial.println(UDP_PORT);
}

void loop() {
  updateCarrier();
  keepWiFiConnected();
  readUdpCommand();
  updateEnvelopePlayer();
  updateCarrier();
}

void prepareSineTable() {
  for (byte i = 0; i < SINE_TABLE_SIZE; i++) {
    float phase = (2.0 * PI * i) / SINE_TABLE_SIZE;
    sineTable[i] = (int16_t)(sin(phase) * 32767.0);
  }
}

void setupDacOutput() {
  analogWriteResolution(12);
  _dac12[0].init();
  writeDac12(DAC_MIDPOINT);
}

void writeDac12(int value) {
  int constrained = constrain(value, 0, DAC_MAX_VALUE);
  _dac12[0].set((uint16_t)constrained << 4);
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

void playPulse(int intensity, int durationMs) {
  uint8_t level = constrainIntensity(intensity);
  unsigned int holdMs = (unsigned int)constrain(durationMs, 1, MAX_SHAPE_DURATION_MS - 100);
  unsigned int totalMs = holdMs + 100;

  shapePointCount = 0;
  addShapePoint(0, 0);
  addShapePoint(20, level);
  addShapePoint(20 + holdMs, level);
  addShapePoint(totalMs, 0);
  startShape(totalMs);
}

void playDoubleTap(int intensity, int gapMs) {
  uint8_t level = constrainIntensity(intensity);
  unsigned int gap = (unsigned int)constrain(gapMs, 1, MAX_SHAPE_DURATION_MS - 390);
  unsigned int totalMs = 390 + gap;

  shapePointCount = 0;
  addShapePoint(0, 0);
  addShapePoint(20, level);
  addShapePoint(110, level);
  addShapePoint(160, 0);
  addShapePoint(160 + gap, 0);
  addShapePoint(180 + gap, level);
  addShapePoint(270 + gap, level);
  addShapePoint(totalMs, 0);
  startShape(totalMs);
}

void playRamp(int fromIntensity, int toIntensity, int durationMs) {
  uint8_t from = constrainIntensity(fromIntensity);
  uint8_t to = constrainIntensity(toIntensity);
  unsigned int rampMs = (unsigned int)constrain(durationMs, 1, MAX_SHAPE_DURATION_MS - 100);
  unsigned int totalMs = rampMs + 100;

  shapePointCount = 0;
  addShapePoint(0, from);
  addShapePoint(rampMs, to);
  addShapePoint(totalMs, 0);
  startShape(totalMs);
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

  startShape((unsigned int)durationMs);
}

void addShapePoint(unsigned int timeMs, uint8_t intensity) {
  if (shapePointCount >= MAX_SHAPE_POINTS) {
    return;
  }

  shapePoints[shapePointCount++] = { timeMs, intensity };
}

void startShape(unsigned int durationMs) {
  if (shapePointCount == 0) {
    stopPlayback();
    return;
  }

  shapeDurationMs = durationMs;
  shapeStartedAt = millis();
  lastEnvelopeUpdateAt = 0;
  shapePlaying = true;

  sineIndex = 0;
  currentDrive = shapeIntensityAt(0);
  nextCarrierSampleAtUs = micros();
  carrierRunning = true;

  Serial.print("Playing 70 Hz envelope for ");
  Serial.print(shapeDurationMs);
  Serial.print(" ms with ");
  Serial.print(shapePointCount);
  Serial.println(" points");
}

void updateEnvelopePlayer() {
  if (!shapePlaying) {
    return;
  }

  unsigned long now = millis();
  unsigned long elapsed = now - shapeStartedAt;

  if (elapsed >= shapeDurationMs) {
    stopPlayback();
    return;
  }

  if (lastEnvelopeUpdateAt != 0 && now - lastEnvelopeUpdateAt < ENVELOPE_UPDATE_INTERVAL_MS) {
    return;
  }

  lastEnvelopeUpdateAt = now;
  currentDrive = shapeIntensityAt(elapsed);
}

void updateCarrier() {
  if (!carrierRunning) {
    return;
  }

  unsigned long now = micros();
  if ((long)(now - nextCarrierSampleAtUs) < 0) {
    return;
  }

  writeCarrierSample();

  sineIndex = (sineIndex + 1) % SINE_TABLE_SIZE;
  nextCarrierSampleAtUs += CARRIER_SAMPLE_INTERVAL_US;

  if ((long)(now - nextCarrierSampleAtUs) >= 0) {
    unsigned long skipped = ((now - nextCarrierSampleAtUs) / CARRIER_SAMPLE_INTERVAL_US) + 1;
    sineIndex = (sineIndex + skipped) % SINE_TABLE_SIZE;
    nextCarrierSampleAtUs += skipped * CARRIER_SAMPLE_INTERVAL_US;
  }
}

void writeCarrierSample() {
  uint16_t swing = (uint32_t)currentDrive * MAX_DAC_SWING_COUNTS / 255;
  long offset = ((long)sineTable[sineIndex] * swing) / 32767L;
  writeDac12(DAC_MIDPOINT + offset);
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

    addShapePoint((unsigned int)timeMs, constrainIntensity(intensity));

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

void stopPlayback() {
  shapePlaying = false;
  shapePointCount = 0;
  shapeDurationMs = 0;
  currentDrive = 0;
  carrierRunning = false;
  writeDac12(DAC_MIDPOINT);
}
