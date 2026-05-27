# Firmware Code Walkthrough

This document explains `haptell_02_uno_r4_wifi_drv2605l_lra.ino` for a beginner programmer. The goal is to show what each part does and why this firmware is different from the first DC motor prototype.

## Big Picture

The Arduino does four jobs:

1. Connect to WiFi.
2. Listen for UDP text commands.
3. Talk to the DRV2605L haptic driver over I2C.
4. Trigger short LRA haptic effects through the DRV2605L.

Unlike `haptell-01`, this firmware does not create PWM directly on an Arduino pin. The Arduino only sends I2C commands to the DRV2605L. The DRV2605L generates the proper actuator drive waveform for the Vybronics VG1040003D LRA.

## Arduino Program Structure

Arduino sketches usually have two required functions:

```cpp
void setup() {
  // Runs once after the board starts.
}

void loop() {
  // Runs again and again forever.
}
```

In this firmware, `setup()` starts Serial Monitor output, connects to WiFi, starts the UDP listener, starts I2C, and configures the DRV2605L.

```cpp
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("Haptell haptell-02 starting");
  connectToWiFi();
  udp.begin(UDP_PORT);

  Wire.begin();
  if (!drv.begin()) {
    Serial.println("DRV2605L not found. Check I2C wiring.");
  } else {
    drv.useLRA();
    drv.selectLibrary(DRV2605_LRA_LIBRARY);
    drv.setMode(DRV2605_MODE_INTTRIG);
  }
}
```

The main loop stays short:

```cpp
void loop() {
  keepWiFiConnected();
  readUdpCommand();
  updateEffectPlayer();
  updateShapePlayer();
}
```

This keeps the device responsive. Even while an effect sequence or realtime shape is playing, the Arduino can receive a new command such as `stop`.

## Included Libraries

At the top of the file:

```cpp
#include <Wire.h>
#include <WiFiS3.h>
#include <WiFiUdp.h>
#include <Adafruit_DRV2605.h>

#include "secrets.h"
```

- `Wire.h` provides I2C communication.
- `WiFiS3.h` gives Arduino UNO R4 WiFi access to WiFi functions.
- `WiFiUdp.h` gives access to UDP networking.
- `Adafruit_DRV2605.h` provides a simple API for the DRV2605L haptic driver.
- `secrets.h` contains local WiFi credentials and is not committed to GitHub.

## Constants

The firmware uses constants for values that should stay fixed while the sketch runs:

```cpp
const char DEVICE_ID[] = "haptell-02";
const unsigned int UDP_PORT = 4444;
const unsigned long WIFI_RETRY_INTERVAL_MS = 10000;
const byte MAX_EFFECT_STEPS = 8;
const uint8_t DRV2605_LRA_LIBRARY = 6;
```

These mean:

- The device responds to `haptell-02`.
- UDP commands arrive on port `4444`.
- WiFi reconnect attempts are spaced 10 seconds apart.
- An effect sequence can contain up to 8 steps.
- The DRV2605L starts with LRA effect library `6`.

The library choice is a first-pass tuning value. The best library and effects should be adjusted after testing the real actuator in the physical artifact.

## Variables and State

The firmware stores the current effect sequence in a small array:

```cpp
EffectStep effectSteps[MAX_EFFECT_STEPS];
byte effectStepCount = 0;
byte currentEffectStep = 0;
unsigned long effectStepStartedAt = 0;
bool sequencePlaying = false;
```

Together, these variables describe the current haptic sequence:

- `effectSteps`: the list of DRV2605L effects to play.
- `effectStepCount`: how many steps are in the list.
- `currentEffectStep`: which step is active now.
- `effectStepStartedAt`: when the current step began.
- `sequencePlaying`: whether a sequence is active.

## The `EffectStep` Struct

The firmware defines a small custom structure:

```cpp
struct EffectStep {
  uint8_t effect;
  unsigned long holdMs;
};
```

Each step has:

- `effect`: the DRV2605L effect number to trigger.
- `holdMs`: how long to wait before moving to the next step.

Effect `0` is used by this firmware as a quiet pause. When a step has effect `0`, the code calls `drv.stop()` instead of triggering a new effect.

## WiFi Connection

The WiFi logic is intentionally similar to the first prototype.

```cpp
WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
```

The credentials come from `secrets.h`.

After the board reports `WL_CONNECTED`, the firmware waits 3 seconds before printing the IP address:

```cpp
delay(3000);
Serial.print("Connected. IP address: ");
Serial.println(WiFi.localIP());
```

This delay is included because the UNO R4 WiFi may briefly report `0.0.0.0` immediately after connection.

## DRV2605L Setup

The DRV2605L is configured in `setup()` after I2C starts:

```cpp
Wire.begin();
if (!drv.begin()) {
  Serial.println("DRV2605L not found. Check I2C wiring.");
} else {
  drv.useLRA();
  drv.selectLibrary(DRV2605_LRA_LIBRARY);
  drv.setMode(DRV2605_MODE_INTTRIG);
}
```

Important pieces:

- `Wire.begin()` starts I2C on the Arduino.
- `drv.begin()` checks whether the DRV2605L responds.
- `drv.useLRA()` tells the driver that the actuator is an LRA, not an ERM motor.
- `drv.selectLibrary(...)` selects a built-in effect library.
- `DRV2605_MODE_INTTRIG` means effects are triggered by software commands from the Arduino.

If the driver is not found, the firmware still keeps running and listening for UDP commands, but haptic output will not work until the I2C wiring or power issue is fixed.

## Reading UDP Commands

The device receives text such as:

```text
haptell-02 pulse intensity=180 duration=800
haptell-02 shape duration=1600 points=0:0,100:180,700:180,1200:60,1600:0
```

The function `readUdpCommand()` checks whether a UDP packet arrived:

```cpp
int packetSize = udp.parsePacket();
if (packetSize <= 0) {
  return;
}
```

If no packet is available, it returns immediately.

When a packet arrives, the code reads it into `packetBuffer`, adds the string terminator `'\0'`, trims whitespace, prints it to Serial Monitor, and passes it to `handleCommand()`.

## Parsing a Command

The command format is:

```text
<target> <pattern> <key=value> <key=value>
```

`handleCommand()` removes the first two tokens:

```cpp
String target = nextToken(command);
String action = nextToken(command);
```

The first token is the target:

```text
haptell-02
```

The second token is the action:

```text
pulse
```

The remaining text contains optional parameters:

```text
intensity=180 duration=800
```

## Target Matching

The device accepts commands addressed to itself or to all devices:

```cpp
bool isAddressedToThisDevice(String target) {
  return target == DEVICE_ID || target == "all";
}
```

The `||` operator means "or".

If the target does not match, the command is ignored. This lets several Haptell devices share the same WiFi subnet and UDP port.

## Choosing a Pattern

`handleCommand()` uses `if`, `else if`, and `else` to choose the requested pattern:

```cpp
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
```

Unknown patterns are ignored. A valid new pattern interrupts the current sequence because each pattern function clears the previous playback state before starting.

## Reading Parameters

The helper function `getIntParam()` finds values such as `intensity=180`:

```cpp
getIntParam(command, "intensity", 180)
```

This means:

- Look for a parameter named `intensity`.
- If it exists, convert its value to an integer.
- If it does not exist, use `180`.

Default values keep simple commands short. For example:

```text
haptell-02 pulse
```

still works.

## Mapping Intensity to DRV2605L Effects

The first prototype uses PWM intensity values directly. The second prototype uses built-in DRV2605L effects, so intensity is mapped to effect numbers:

```cpp
uint8_t effectForIntensity(int intensity) {
  int value = constrain(intensity, 0, 255);
  if (value < 80) {
    return 3;
  }
  if (value < 170) {
    return 2;
  }
  return 1;
}
```

This first-pass mapping treats low, medium, and high intensity as three different click strengths. It is intentionally simple so the real hardware can be tested before over-tuning the software.

## Creating Effect Sequences

Pattern functions build a list of effect steps instead of blocking with long delays.

For example, `double` creates two effects with a quiet gap:

```cpp
void playDoubleTap(int intensity, int gapMs) {
  uint8_t effect = effectForIntensity(intensity);
  clearEffects();
  addEffect(effect, 120);
  addEffect(0, max(1, gapMs));
  addEffect(effect, 160);
  startEffects();
}
```

Step by step:

1. Choose an effect based on intensity.
2. Clear any old sequence.
3. Add the first tap.
4. Add a quiet pause.
5. Add the second tap.
6. Start playback.

## Non-Blocking Effect Playback

The firmware uses `millis()` to decide when to advance to the next effect:

```cpp
unsigned long now = millis();
if (now - effectStepStartedAt < effectSteps[currentEffectStep].holdMs) {
  return;
}
```

This avoids long blocking `delay()` calls during pattern playback. The Arduino can keep checking WiFi and UDP while a haptic sequence is running.

## Realtime Shape Playback

The `shape` command plays a short custom amplitude envelope in DRV2605L realtime playback mode:

```text
haptell-02 shape duration=1600 points=0:0,100:180,700:180,1200:60,1600:0
```

The `points` parameter is a compact list of `time:intensity` pairs. The first point must be at `0 ms`, and the last point must be at the requested duration. The maximum duration is `5000 ms`, and the firmware accepts up to 24 points.

During playback, `updateShapePlayer()` uses `millis()` to compute the elapsed time, finds the two surrounding points, linearly interpolates the intensity, and sends it to the DRV2605L:

```cpp
drv.setMode(DRV2605_MODE_REALTIME);
drv.setRealtimeValue(shapeIntensityAt(elapsed));
```

The shape player uses unsigned realtime values, so `0` means no drive and `255` means full-scale drive. When shape playback ends or `stop` is received, the firmware writes `0` and returns the DRV2605L to internal-trigger mode for the built-in library effects.

## Triggering the DRV2605L

The function `playCurrentEffectStep()` triggers the active effect:

```cpp
drv.setWaveform(0, effect);
drv.setWaveform(1, 0);
drv.go();
```

`setWaveform(0, effect)` puts the selected effect in the first waveform slot. `setWaveform(1, 0)` marks the end of the waveform list. `drv.go()` starts playback.

For quiet steps:

```cpp
if (effect == 0) {
  drv.stop();
  return;
}
```

## Stop Behavior

The `stop` command calls:

```cpp
void stopPlayback() {
  stopShape();
  stopEffects();
}
```

This clears both possible playback paths: the built-in effect sequencer and the realtime shape player.

## Important Syntax Notes

### Objects

```cpp
WiFiUDP udp;
Adafruit_DRV2605 drv;
```

These create two objects:

- `udp` handles UDP networking.
- `drv` handles communication with the DRV2605L.

### References

```cpp
String nextToken(String &text)
```

The `&` means the function can modify the original `String`, not just a copy. This is why `nextToken()` can remove the first word from `command`.

### Arrays

```cpp
EffectStep effectSteps[MAX_EFFECT_STEPS];
```

This creates a fixed-size list of effect steps. Fixed-size arrays are common in small embedded programs because they avoid dynamic memory surprises.

### Unsigned Time Math

```cpp
unsigned long now = millis();
```

`millis()` returns an `unsigned long`. Comparing time with subtraction is a common Arduino pattern and behaves well across timer rollover.

## How to Add a New Pattern

To add a new pattern:

1. Write a new function, for example `playTripleTap()`.
2. Call `clearEffects()`.
3. Add steps with `addEffect(...)`.
4. Call `startEffects()`.
5. Add a new `else if` branch in `handleCommand()`.

Example:

```cpp
void playTripleTap(int intensity) {
  uint8_t effect = effectForIntensity(intensity);
  clearEffects();
  addEffect(effect, 110);
  addEffect(0, 80);
  addEffect(effect, 110);
  addEffect(0, 80);
  addEffect(effect, 160);
  startEffects();
}
```

Then add command handling:

```cpp
} else if (action == "triple") {
  playTripleTap(getIntParam(command, "intensity", 220));
```

## Debugging Tips

Use Arduino Serial Monitor at `115200` baud.

Useful messages:

- Startup message
- WiFi connection progress
- Device IP address
- `DRV2605L ready in LRA mode`
- `DRV2605L not found. Check I2C wiring.`
- Received UDP command
- Ignored unknown target or unknown action

If the actuator does not move:

1. Confirm the board prints a real WiFi IP address, not `0.0.0.0`.
2. Confirm the UDP sender sends to that IP and port `4444`.
3. Confirm the command target is `haptell-02` or `all`.
4. Confirm LiPo Rider Plus output is on and feeding the 5 V rail.
5. Confirm Arduino and DRV2605L share ground.
6. Confirm SDA and SCL are not swapped.
7. Confirm the LRA is connected only between DRV2605L `OUT+` and `OUT-`.

## Mental Model

Think of this firmware as a tiny network-to-haptics translator:

- UDP commands choose a named Haptell pattern.
- Pattern functions convert the command into DRV2605L effect steps or a realtime shape.
- `loop()` keeps checking time and advances through the active playback state.
- The DRV2605L, not the Arduino GPIO pin, drives the LRA.

This keeps the command protocol shared with `haptell-01` while using hardware that is much better suited to an LRA actuator.
