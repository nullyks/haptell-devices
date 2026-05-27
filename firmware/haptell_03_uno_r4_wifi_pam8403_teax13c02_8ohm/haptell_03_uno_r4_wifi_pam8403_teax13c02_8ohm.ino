#include <WiFiS3.h>
#include <WiFiUdp.h>
#include "dac.h"

#include "secrets.h"

const char DEVICE_ID[] = "haptell-03";
const unsigned int UDP_PORT = 4444;
const unsigned long WIFI_RETRY_INTERVAL_MS = 10000;

const byte MAX_PATTERN_POINTS = 32;
const unsigned int MAX_PATTERN_DURATION_MS = 5000;
const unsigned long CONTROL_UPDATE_INTERVAL_MS = 5;

const uint16_t MIN_FREQUENCY_HZ = 40;
const uint16_t MAX_FREQUENCY_HZ = 1500;
const uint16_t DEFAULT_FREQUENCY_HZ = 560;

const uint16_t SINE_TABLE_SIZE = 256;
const unsigned long CARRIER_SAMPLE_RATE_HZ = 8000;
const unsigned long CARRIER_SAMPLE_INTERVAL_US = 1000000UL / CARRIER_SAMPLE_RATE_HZ;

const int DAC_MIDPOINT = 2048;
const int DAC_MAX_VALUE = 4095;

// Conservative start for a 5 V UNO R4 DAC feeding a PAM8403 input.
// Increase only after measuring differential AC Vrms across the exciter.
const uint16_t MAX_DAC_SWING_COUNTS = 120;

struct PatternPoint {
  unsigned int timeMs;
  uint8_t amplitude;
  uint16_t frequencyHz;
};

struct DriveState {
  uint8_t amplitude;
  uint16_t frequencyHz;
};

WiFiUDP udp;

PatternPoint patternPoints[MAX_PATTERN_POINTS];
byte patternPointCount = 0;
unsigned int patternDurationMs = 0;
unsigned long patternStartedAt = 0;
unsigned long lastControlUpdateAt = 0;
bool patternPlaying = false;

int16_t sineTable[SINE_TABLE_SIZE];
uint32_t phaseAccumulator = 0;
uint32_t phaseIncrement = 0;
unsigned long nextCarrierSampleAtUs = 0;
bool carrierRunning = false;
uint8_t currentAmplitude = 0;
uint16_t currentFrequencyHz = DEFAULT_FREQUENCY_HZ;

char packetBuffer[1024];
unsigned long lastWifiAttemptAt = 0;

void setup() {
  Serial.begin(115200);
  delay(500);

  prepareSineTable();
  setupDacOutput();
  phaseIncrement = phaseIncrementForFrequency(DEFAULT_FREQUENCY_HZ);

  Serial.println("Haptell haptell-03 PAM8403/TEAX13C02-8ohm starting");
  Serial.print("Frequency range: ");
  Serial.print(MIN_FREQUENCY_HZ);
  Serial.print("-");
  Serial.print(MAX_FREQUENCY_HZ);
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
  updatePatternPlayer();
  updateCarrier();
}

void prepareSineTable() {
  for (uint16_t i = 0; i < SINE_TABLE_SIZE; i++) {
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

  if (action == "pattern") {
    playPattern(command);
  } else if (action == "tone") {
    playTone(
      getIntParam(command, "amplitude", getIntParam(command, "intensity", 128)),
      getIntParam(command, "frequency", DEFAULT_FREQUENCY_HZ),
      getIntParam(command, "duration", 500)
    );
  } else if (action == "sweep") {
    playSweep(
      getIntParam(command, "amplitude", 150),
      getIntParam(command, "from", 180),
      getIntParam(command, "to", 900),
      getIntParam(command, "duration", 1000)
    );
  } else if (action == "pulse") {
    playPulse(
      getIntParam(command, "amplitude", getIntParam(command, "intensity", 180)),
      getIntParam(command, "frequency", DEFAULT_FREQUENCY_HZ),
      getIntParam(command, "duration", 800)
    );
  } else if (action == "double") {
    playDoubleTap(
      getIntParam(command, "amplitude", getIntParam(command, "intensity", 220)),
      getIntParam(command, "frequency", DEFAULT_FREQUENCY_HZ),
      getIntParam(command, "gap", 120)
    );
  } else if (action == "ramp") {
    playRamp(
      getIntParam(command, "from", 60),
      getIntParam(command, "to", 220),
      getIntParam(command, "frequency", DEFAULT_FREQUENCY_HZ),
      getIntParam(command, "duration", 1200)
    );
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

void playPattern(String command) {
  int durationMs = getIntParam(command, "duration", -1);
  if (durationMs <= 0 || durationMs > MAX_PATTERN_DURATION_MS) {
    Serial.println("Ignored: pattern duration must be 1-5000 ms");
    return;
  }

  String pointsText = getStringParam(command, "points", "");
  if (!loadPatternPoints(pointsText, (unsigned int)durationMs)) {
    Serial.println("Ignored: pattern points must be sorted time:amplitude:frequency triples from 0 to duration");
    return;
  }

  startPattern((unsigned int)durationMs);
}

void playTone(int amplitude, int frequencyHz, int durationMs) {
  uint8_t level = constrainAmplitude(amplitude);
  uint16_t frequency = constrainFrequency(frequencyHz);
  unsigned int totalMs = (unsigned int)constrain(durationMs, 1, MAX_PATTERN_DURATION_MS);

  patternPointCount = 0;
  if (totalMs <= 40) {
    addPatternPoint(0, level, frequency);
    addPatternPoint(totalMs, level, frequency);
  } else {
    addPatternPoint(0, 0, frequency);
    addPatternPoint(20, level, frequency);
    addPatternPoint(totalMs - 20, level, frequency);
    addPatternPoint(totalMs, 0, frequency);
  }
  startPattern(totalMs);
}

void playSweep(int amplitude, int fromFrequencyHz, int toFrequencyHz, int durationMs) {
  uint8_t level = constrainAmplitude(amplitude);
  uint16_t fromFrequency = constrainFrequency(fromFrequencyHz);
  uint16_t toFrequency = constrainFrequency(toFrequencyHz);
  unsigned int totalMs = (unsigned int)constrain(durationMs, 1, MAX_PATTERN_DURATION_MS);

  patternPointCount = 0;
  if (totalMs <= 40) {
    addPatternPoint(0, level, fromFrequency);
    addPatternPoint(totalMs, level, toFrequency);
  } else {
    addPatternPoint(0, 0, fromFrequency);
    addPatternPoint(20, level, fromFrequency);
    addPatternPoint(totalMs - 20, level, toFrequency);
    addPatternPoint(totalMs, 0, toFrequency);
  }
  startPattern(totalMs);
}

void playPulse(int amplitude, int frequencyHz, int durationMs) {
  uint8_t level = constrainAmplitude(amplitude);
  uint16_t frequency = constrainFrequency(frequencyHz);
  unsigned int holdMs = (unsigned int)constrain(durationMs, 1, MAX_PATTERN_DURATION_MS - 100);
  unsigned int totalMs = holdMs + 100;

  patternPointCount = 0;
  addPatternPoint(0, 0, frequency);
  addPatternPoint(20, level, frequency);
  addPatternPoint(20 + holdMs, level, frequency);
  addPatternPoint(totalMs, 0, frequency);
  startPattern(totalMs);
}

void playDoubleTap(int amplitude, int frequencyHz, int gapMs) {
  uint8_t level = constrainAmplitude(amplitude);
  uint16_t frequency = constrainFrequency(frequencyHz);
  unsigned int gap = (unsigned int)constrain(gapMs, 1, MAX_PATTERN_DURATION_MS - 390);
  unsigned int totalMs = 390 + gap;

  patternPointCount = 0;
  addPatternPoint(0, 0, frequency);
  addPatternPoint(20, level, frequency);
  addPatternPoint(110, level, frequency);
  addPatternPoint(160, 0, frequency);
  addPatternPoint(160 + gap, 0, frequency);
  addPatternPoint(180 + gap, level, frequency);
  addPatternPoint(270 + gap, level, frequency);
  addPatternPoint(totalMs, 0, frequency);
  startPattern(totalMs);
}

void playRamp(int fromAmplitude, int toAmplitude, int frequencyHz, int durationMs) {
  uint8_t from = constrainAmplitude(fromAmplitude);
  uint8_t to = constrainAmplitude(toAmplitude);
  uint16_t frequency = constrainFrequency(frequencyHz);
  unsigned int rampMs = (unsigned int)constrain(durationMs, 1, MAX_PATTERN_DURATION_MS - 100);
  unsigned int totalMs = rampMs + 100;

  patternPointCount = 0;
  addPatternPoint(0, from, frequency);
  addPatternPoint(rampMs, to, frequency);
  addPatternPoint(totalMs, 0, frequency);
  startPattern(totalMs);
}

void addPatternPoint(unsigned int timeMs, uint8_t amplitude, uint16_t frequencyHz) {
  if (patternPointCount >= MAX_PATTERN_POINTS) {
    return;
  }

  patternPoints[patternPointCount++] = { timeMs, amplitude, frequencyHz };
}

void startPattern(unsigned int durationMs) {
  if (patternPointCount == 0) {
    stopPlayback();
    return;
  }

  patternDurationMs = durationMs;
  patternStartedAt = millis();
  lastControlUpdateAt = 0;
  patternPlaying = true;

  phaseAccumulator = 0;
  applyDriveState(patternStateAt(0));
  nextCarrierSampleAtUs = micros();
  carrierRunning = true;

  Serial.print("Playing frequency pattern for ");
  Serial.print(patternDurationMs);
  Serial.print(" ms with ");
  Serial.print(patternPointCount);
  Serial.println(" points");
}

void updatePatternPlayer() {
  if (!patternPlaying) {
    return;
  }

  unsigned long now = millis();
  unsigned long elapsed = now - patternStartedAt;

  if (elapsed >= patternDurationMs) {
    stopPlayback();
    return;
  }

  if (lastControlUpdateAt != 0 && now - lastControlUpdateAt < CONTROL_UPDATE_INTERVAL_MS) {
    return;
  }

  lastControlUpdateAt = now;
  applyDriveState(patternStateAt(elapsed));
}

void applyDriveState(DriveState state) {
  currentAmplitude = state.amplitude;

  if (state.frequencyHz != currentFrequencyHz || phaseIncrement == 0) {
    currentFrequencyHz = state.frequencyHz;
    phaseIncrement = phaseIncrementForFrequency(currentFrequencyHz);
  }
}

uint32_t phaseIncrementForFrequency(uint16_t frequencyHz) {
  uint16_t constrained = constrainFrequency(frequencyHz);
  return (uint32_t)(((uint64_t)constrained * 4294967296ULL) / CARRIER_SAMPLE_RATE_HZ);
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
  phaseAccumulator += phaseIncrement;
  nextCarrierSampleAtUs += CARRIER_SAMPLE_INTERVAL_US;

  if ((long)(now - nextCarrierSampleAtUs) >= 0) {
    unsigned long skipped = ((now - nextCarrierSampleAtUs) / CARRIER_SAMPLE_INTERVAL_US) + 1;
    phaseAccumulator += phaseIncrement * (uint32_t)skipped;
    nextCarrierSampleAtUs += skipped * CARRIER_SAMPLE_INTERVAL_US;
  }
}

void writeCarrierSample() {
  uint8_t tableIndex = phaseAccumulator >> 24;
  uint16_t swing = (uint32_t)currentAmplitude * MAX_DAC_SWING_COUNTS / 255;
  long offset = ((long)sineTable[tableIndex] * swing) / 32767L;
  writeDac12(DAC_MIDPOINT + offset);
}

DriveState patternStateAt(unsigned long elapsedMs) {
  if (patternPointCount == 0) {
    return { 0, DEFAULT_FREQUENCY_HZ };
  }

  if (elapsedMs <= patternPoints[0].timeMs) {
    return { patternPoints[0].amplitude, patternPoints[0].frequencyHz };
  }

  for (byte i = 1; i < patternPointCount; i++) {
    if (elapsedMs <= patternPoints[i].timeMs) {
      PatternPoint previous = patternPoints[i - 1];
      PatternPoint next = patternPoints[i];
      unsigned int segmentDuration = next.timeMs - previous.timeMs;

      if (segmentDuration == 0) {
        return { next.amplitude, next.frequencyHz };
      }

      unsigned long segmentElapsed = elapsedMs - previous.timeMs;
      long amplitudeDelta = (long)next.amplitude - (long)previous.amplitude;
      long frequencyDelta = (long)next.frequencyHz - (long)previous.frequencyHz;
      long amplitude = previous.amplitude + (amplitudeDelta * segmentElapsed / segmentDuration);
      long frequency = previous.frequencyHz + (frequencyDelta * segmentElapsed / segmentDuration);

      return {
        (uint8_t)constrain(amplitude, 0, 255),
        (uint16_t)constrain(frequency, MIN_FREQUENCY_HZ, MAX_FREQUENCY_HZ)
      };
    }
  }

  PatternPoint last = patternPoints[patternPointCount - 1];
  return { last.amplitude, last.frequencyHz };
}

bool loadPatternPoints(String pointsText, unsigned int durationMs) {
  pointsText.trim();
  if (pointsText.length() == 0) {
    return false;
  }

  patternPointCount = 0;
  int start = 0;

  while (start < pointsText.length()) {
    if (patternPointCount >= MAX_PATTERN_POINTS) {
      return false;
    }

    int comma = pointsText.indexOf(',', start);
    String triple = comma < 0 ? pointsText.substring(start) : pointsText.substring(start, comma);
    triple.trim();

    int firstSeparator = triple.indexOf(':');
    int secondSeparator = triple.indexOf(':', firstSeparator + 1);
    if (firstSeparator <= 0 || secondSeparator <= firstSeparator + 1 || secondSeparator >= triple.length() - 1) {
      return false;
    }

    int timeMs = 0;
    int amplitude = 0;
    int frequencyHz = 0;
    if (!parseNonNegativeInt(triple.substring(0, firstSeparator), &timeMs) ||
        !parseNonNegativeInt(triple.substring(firstSeparator + 1, secondSeparator), &amplitude) ||
        !parseNonNegativeInt(triple.substring(secondSeparator + 1), &frequencyHz)) {
      return false;
    }

    if (timeMs < 0 || timeMs > durationMs ||
        amplitude < 0 || amplitude > 255 ||
        frequencyHz < MIN_FREQUENCY_HZ || frequencyHz > MAX_FREQUENCY_HZ) {
      return false;
    }

    if (patternPointCount > 0 && timeMs <= patternPoints[patternPointCount - 1].timeMs) {
      return false;
    }

    addPatternPoint((unsigned int)timeMs, constrainAmplitude(amplitude), (uint16_t)frequencyHz);

    if (comma < 0) {
      break;
    }
    start = comma + 1;
  }

  if (patternPointCount < 2) {
    return false;
  }

  return patternPoints[0].timeMs == 0 && patternPoints[patternPointCount - 1].timeMs == durationMs;
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

uint8_t constrainAmplitude(int value) {
  return (uint8_t)constrain(value, 0, 255);
}

uint16_t constrainFrequency(int value) {
  return (uint16_t)constrain(value, MIN_FREQUENCY_HZ, MAX_FREQUENCY_HZ);
}

void stopPlayback() {
  patternPlaying = false;
  patternPointCount = 0;
  patternDurationMs = 0;
  currentAmplitude = 0;
  currentFrequencyHz = DEFAULT_FREQUENCY_HZ;
  phaseIncrement = phaseIncrementForFrequency(currentFrequencyHz);
  carrierRunning = false;
  writeDac12(DAC_MIDPOINT);
}
