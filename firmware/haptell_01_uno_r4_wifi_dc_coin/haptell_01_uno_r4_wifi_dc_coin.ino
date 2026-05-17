#include <WiFiS3.h>
#include <WiFiUdp.h>

#include "secrets.h"

const char DEVICE_ID[] = "haptell-01";
const unsigned int UDP_PORT = 4444;
const int MOTOR_PWM_PIN = 9;

const byte MAX_PATTERN_STEPS = 24;
const int DEFAULT_INTENSITY = 180;
const unsigned long WIFI_RETRY_INTERVAL_MS = 10000;

struct PatternStep {
  uint8_t from;
  uint8_t to;
  unsigned long durationMs;
};

WiFiUDP udp;
PatternStep pattern[MAX_PATTERN_STEPS];
byte patternLength = 0;
byte currentStep = 0;
unsigned long stepStartedAt = 0;
bool patternPlaying = false;

char packetBuffer[160];
unsigned long lastWifiAttemptAt = 0;

void setup() {
  pinMode(MOTOR_PWM_PIN, OUTPUT);
  stopMotor();

  Serial.begin(115200);
  delay(500);

  Serial.println("Haptell haptell-01 starting");
  connectToWiFi();
  udp.begin(UDP_PORT);
  Serial.print("Listening for UDP commands on port ");
  Serial.println(UDP_PORT);
}

void loop() {
  keepWiFiConnected();
  readUdpCommand();
  updatePatternPlayer();
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
      getIntParam(command, "intensity", DEFAULT_INTENSITY),
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
  } else if (action == "stop") {
    stopPattern();
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

void playPulse(int intensity, int durationMs) {
  clearPattern();
  addStep(0, constrainIntensity(intensity), 25);
  addStep(constrainIntensity(intensity), constrainIntensity(intensity), max(1, durationMs));
  addStep(constrainIntensity(intensity), 0, 80);
  startPattern();
}

void playDoubleTap(int intensity, int gapMs) {
  uint8_t level = constrainIntensity(intensity);
  clearPattern();
  addStep(0, level, 15);
  addStep(level, level, 90);
  addStep(level, 0, 45);
  addStep(0, 0, max(1, gapMs));
  addStep(0, level, 15);
  addStep(level, level, 90);
  addStep(level, 0, 80);
  startPattern();
}

void playRamp(int fromIntensity, int toIntensity, int durationMs) {
  clearPattern();
  addStep(
    constrainIntensity(fromIntensity),
    constrainIntensity(toIntensity),
    max(1, durationMs)
  );
  addStep(constrainIntensity(toIntensity), 0, 100);
  startPattern();
}

void clearPattern() {
  patternLength = 0;
  currentStep = 0;
  patternPlaying = false;
}

void addStep(uint8_t from, uint8_t to, unsigned long durationMs) {
  if (patternLength >= MAX_PATTERN_STEPS) {
    return;
  }

  pattern[patternLength++] = { from, to, durationMs };
}

void startPattern() {
  if (patternLength == 0) {
    stopPattern();
    return;
  }

  currentStep = 0;
  stepStartedAt = millis();
  patternPlaying = true;
  analogWrite(MOTOR_PWM_PIN, pattern[0].from);
}

void updatePatternPlayer() {
  if (!patternPlaying) {
    return;
  }

  PatternStep step = pattern[currentStep];
  unsigned long now = millis();
  unsigned long elapsed = now - stepStartedAt;

  if (elapsed >= step.durationMs) {
    analogWrite(MOTOR_PWM_PIN, step.to);
    currentStep++;

    if (currentStep >= patternLength) {
      stopPattern();
      return;
    }

    stepStartedAt = now;
    analogWrite(MOTOR_PWM_PIN, pattern[currentStep].from);
    return;
  }

  uint8_t output = interpolate(step.from, step.to, elapsed, step.durationMs);
  analogWrite(MOTOR_PWM_PIN, output);
}

uint8_t interpolate(uint8_t from, uint8_t to, unsigned long elapsed, unsigned long duration) {
  if (duration == 0 || from == to) {
    return to;
  }

  long delta = (long)to - (long)from;
  return from + (delta * elapsed / duration);
}

uint8_t constrainIntensity(int value) {
  return (uint8_t)constrain(value, 0, 255);
}

void stopPattern() {
  patternPlaying = false;
  patternLength = 0;
  currentStep = 0;
  stopMotor();
}

void stopMotor() {
  analogWrite(MOTOR_PWM_PIN, 0);
}

