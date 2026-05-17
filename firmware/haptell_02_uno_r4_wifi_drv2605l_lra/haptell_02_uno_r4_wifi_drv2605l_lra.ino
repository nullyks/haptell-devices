#include <Wire.h>
#include <WiFiS3.h>
#include <WiFiUdp.h>
#include <Adafruit_DRV2605.h>

#include "secrets.h"

const char DEVICE_ID[] = "haptell-02";
const unsigned int UDP_PORT = 4444;
const unsigned long WIFI_RETRY_INTERVAL_MS = 10000;

const byte MAX_EFFECT_STEPS = 8;
const uint8_t DRV2605_LRA_LIBRARY = 6;

struct EffectStep {
  uint8_t effect;
  unsigned long holdMs;
};

WiFiUDP udp;
Adafruit_DRV2605 drv;

EffectStep effectSteps[MAX_EFFECT_STEPS];
byte effectStepCount = 0;
byte currentEffectStep = 0;
unsigned long effectStepStartedAt = 0;
bool sequencePlaying = false;

char packetBuffer[160];
unsigned long lastWifiAttemptAt = 0;

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
    drv.useLRA();
    drv.selectLibrary(DRV2605_LRA_LIBRARY);
    drv.setMode(DRV2605_MODE_INTTRIG);
    Serial.println("DRV2605L ready in LRA mode");
  }
}

void loop() {
  keepWiFiConnected();
  readUdpCommand();
  updateEffectPlayer();
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
    playPulse(getIntParam(command, "intensity", 180));
  } else if (action == "double") {
    playDoubleTap(getIntParam(command, "intensity", 220), getIntParam(command, "gap", 120));
  } else if (action == "ramp") {
    playRamp(getIntParam(command, "from", 60), getIntParam(command, "to", 255));
  } else if (action == "stop") {
    stopEffects();
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

void playPulse(int intensity) {
  clearEffects();
  addEffect(effectForIntensity(intensity), 180);
  startEffects();
}

void playDoubleTap(int intensity, int gapMs) {
  uint8_t effect = effectForIntensity(intensity);
  clearEffects();
  addEffect(effect, 120);
  addEffect(0, max(1, gapMs));
  addEffect(effect, 160);
  startEffects();
}

void playRamp(int fromIntensity, int toIntensity) {
  clearEffects();
  addEffect(effectForIntensity(fromIntensity), 120);
  addEffect(effectForIntensity((fromIntensity + toIntensity) / 2), 140);
  addEffect(effectForIntensity(toIntensity), 220);
  startEffects();
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
  drv.stop();
}
