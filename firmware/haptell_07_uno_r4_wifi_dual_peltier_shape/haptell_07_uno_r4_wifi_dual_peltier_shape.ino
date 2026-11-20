#include <WiFiS3.h>
#include <WiFiUdp.h>
#include "secrets.h"
#include "shape.h"

const unsigned int UDP_PORT = 4444;
const int PELTIER_PWM_PINS[DualPeltier::CHANNELS] = {3, 5};
const uint32_t UPDATE_INTERVAL_MS = 10;
const uint32_t WIFI_CHECK_INTERVAL_MS = 1000;
const uint32_t WIFI_RETRY_INTERVAL_MS = 10000;

WiFiUDP udp;
DualPeltier::Shape activeShape = {};
bool playing = false;
bool networkReady = false;
uint32_t startedAt = 0;
uint32_t lastUpdateAt = 0;
uint32_t lastWifiCheckAt = 0;
uint32_t lastWifiAttemptAt = 0;
char packetBuffer[768];

void writeOutputs(const DualPeltier::Point &point) {
  for (uint8_t channel = 0; channel < DualPeltier::CHANNELS; channel++) {
    analogWrite(PELTIER_PWM_PINS[channel], point.pwm[channel]);
  }
}

void stopPeltier() {
  playing = false;
  writeOutputs({0, {0, 0}});
}

void updatePlayback() {
  if (!playing) return;
  const uint32_t now = millis();
  const uint32_t elapsed = now - startedAt;
  if (elapsed >= activeShape.durationMs) {
    stopPeltier();
  } else if (now - lastUpdateAt >= UPDATE_INTERVAL_MS) {
    lastUpdateAt = now;
    writeOutputs(DualPeltier::valueAt(activeShape, elapsed));
  }
}

void readUdpCommand() {
  const int packetSize = udp.parsePacket();
  if (packetSize <= 0) return;
  if (packetSize >= static_cast<int>(sizeof(packetBuffer))) {
    while (udp.available()) udp.read();
    return;
  }
  const int length = udp.read(packetBuffer, sizeof(packetBuffer) - 1);
  if (length != packetSize || length <= 0) return;
  // Reject embedded NULs rather than accepting a valid prefix of a packet.
  if (memchr(packetBuffer, '\0', length)) return;
  packetBuffer[length] = '\0';

  if (strcmp(packetBuffer, DualPeltier::STOP_COMMAND) == 0) {
    stopPeltier();
    return;
  }
  if (!DualPeltier::parseShape(packetBuffer, activeShape)) return;
  startedAt = millis();
  lastUpdateAt = startedAt;
  playing = true;
  writeOutputs(activeShape.points[0]);
}

void serviceWiFi() {
  const uint32_t now = millis();
  if (now - lastWifiCheckAt < WIFI_CHECK_INTERVAL_MS) return;
  lastWifiCheckAt = now;
  if (WiFi.status() == WL_CONNECTED) {
    if (!networkReady) {
      networkReady = udp.begin(UDP_PORT) != 0;
      if (networkReady) {
        Serial.print("Haptell-07 UDP 4444 at ");
        Serial.println(WiFi.localIP());
      }
    }
    return;
  }
  // Turn the output off before a potentially slow WiFi reconnect attempt.
  stopPeltier();
  if (networkReady) udp.stop();
  networkReady = false;
  if (now - lastWifiAttemptAt >= WIFI_RETRY_INTERVAL_MS) {
    lastWifiAttemptAt = now;
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }
}

void setup() {
  for (int pin : PELTIER_PWM_PINS) pinMode(pin, OUTPUT);
  analogWriteResolution(8);
  stopPeltier();
  Serial.begin(115200);
  Serial.println("haptell-07-dual-peltier-shape: D3/D5 PWM, UDP 4444");
  lastWifiAttemptAt = millis();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void loop() {
  updatePlayback();
  serviceWiFi();
  updatePlayback();
  if (networkReady) readUdpCommand();
  updatePlayback();
}
