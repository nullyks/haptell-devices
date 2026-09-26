#include <WiFiS3.h>
#include <WiFiUdp.h>
#include "secrets.h"
#include "shape.h"

const unsigned int UDP_PORT = 4445;
const int PELTIER_PWM_PIN = 3; // D3 -> gate resistor -> N-channel MOSFET gate
const uint32_t UPDATE_INTERVAL_MS = 10;
const uint32_t WIFI_CHECK_INTERVAL_MS = 1000;
const uint32_t WIFI_RETRY_INTERVAL_MS = 10000;

WiFiUDP udp;
Peltier::Shape activeShape = {};
bool playing = false;
bool networkReady = false;
uint32_t startedAt = 0;
uint32_t lastUpdateAt = 0;
uint32_t lastWifiCheckAt = 0;
uint32_t lastWifiAttemptAt = 0;
char packetBuffer[768];

void stopPeltier() {
  playing = false;
  analogWrite(PELTIER_PWM_PIN, 0);
}

void updatePlayback() {
  if (!playing) return;
  const uint32_t now = millis();
  const uint32_t elapsed = now - startedAt;
  if (elapsed >= activeShape.durationMs) {
    stopPeltier();
  } else if (now - lastUpdateAt >= UPDATE_INTERVAL_MS) {
    lastUpdateAt = now;
    analogWrite(PELTIER_PWM_PIN, Peltier::valueAt(activeShape, elapsed));
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

  if (strcmp(packetBuffer, "haptell-06-peltier-shape stop") == 0) {
    stopPeltier();
    return;
  }
  Peltier::Shape candidate;
  if (!Peltier::parseShape(packetBuffer, candidate)) return;
  activeShape = candidate;
  startedAt = millis();
  lastUpdateAt = startedAt;
  playing = true;
  analogWrite(PELTIER_PWM_PIN, activeShape.points[0].pwm);
}

void serviceWiFi() {
  const uint32_t now = millis();
  if (now - lastWifiCheckAt < WIFI_CHECK_INTERVAL_MS) return;
  lastWifiCheckAt = now;
  if (WiFi.status() == WL_CONNECTED) {
    if (!networkReady) {
      networkReady = udp.begin(UDP_PORT) != 0;
      if (networkReady) {
        Serial.print("Peltier UDP 4445 at ");
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
  pinMode(PELTIER_PWM_PIN, OUTPUT);
  analogWriteResolution(8);
  stopPeltier();
  Serial.begin(115200);
  Serial.println("haptell-06-peltier-shape: D3 PWM, UDP 4445");
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
