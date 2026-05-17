#include <Wire.h>
#include <WiFiS3.h>
#include <WiFiUdp.h>
#include <Adafruit_DRV2605.h>

#include "secrets.h"

const char DEVICE_ID[] = "haptell-02";
const unsigned int UDP_PORT = 4444;
const uint8_t DRV2605_LRA_LIBRARY = 6;

WiFiUDP udp;
Adafruit_DRV2605 drv;

char packetBuffer[160];

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
    drv.useLRA();
    drv.selectLibrary(DRV2605_LRA_LIBRARY);
    drv.setMode(DRV2605_MODE_INTTRIG);
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

  if (action == "pulse") {
    playPulse();
  } else if (action == "double") {
    playDoubleTap();
  } else if (action == "ramp") {
    playRamp();
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

void playPulse() {
  Serial.println("Playing pulse using a built-in DRV2605L effect");
  drv.setMode(DRV2605_MODE_INTTRIG);
  playLibraryEffect(1, 250);  // Strong click
}

void playDoubleTap() {
  Serial.println("Playing double tap using built-in DRV2605L effects");
  drv.setMode(DRV2605_MODE_INTTRIG);
  playLibraryEffect(2, 160);  // Medium click
  delay(120);
  playLibraryEffect(2, 220);
}

void playRamp() {
  Serial.println("Playing ramp-like sequence using built-in DRV2605L effects");
  drv.setMode(DRV2605_MODE_INTTRIG);
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

void playCustomRealtimeShape() {
  Serial.println("Playing custom realtime shape without built-in effect numbers");

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
  drv.setMode(DRV2605_MODE_INTTRIG);
}

void stopHaptics() {
  Serial.println("Stopping haptics");
  drv.setRealtimeValue(0);
  drv.stop();
  drv.setMode(DRV2605_MODE_INTTRIG);
}
