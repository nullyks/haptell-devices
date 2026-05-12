# Firmware Code Walkthrough

This document explains `haptell_01_uno_r4_wifi_dc_coin.ino` for a beginner programmer. The goal is not only to say what each function does, but also why the firmware is structured this way.

## Big Picture

The Arduino does three jobs at the same time:

1. Keep the board connected to WiFi.
2. Listen for UDP text commands.
3. Play vibration patterns on the motor.

The important design choice is that the firmware avoids long blocking delays while a pattern is playing. This means the Arduino can still receive a new command, such as `stop`, while the motor is vibrating.

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

In this firmware:

```cpp
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
```

`setup()` prepares the motor pin, starts Serial Monitor output, connects to WiFi, and starts listening for UDP packets.

```cpp
void loop() {
  keepWiFiConnected();
  readUdpCommand();
  updatePatternPlayer();
}
```

`loop()` is intentionally short. It repeatedly asks:

- Is WiFi still connected?
- Has a UDP command arrived?
- Does the motor pattern need to move to the next step?

This is a common embedded programming style: keep `loop()` simple and let helper functions do one clear job each.

## Included Libraries

At the top of the file:

```cpp
#include <WiFiS3.h>
#include <WiFiUdp.h>

#include "secrets.h"
```

`#include` tells the compiler to load code from another file.

- `WiFiS3.h` gives Arduino UNO R4 WiFi access to WiFi functions.
- `WiFiUdp.h` gives access to UDP networking.
- `secrets.h` is a local file containing `WIFI_SSID` and `WIFI_PASSWORD`.

`secrets.h` is not committed to GitHub because it contains private WiFi credentials. The repository only includes `secrets.example.h`.

## Constants

The code uses constants for values that should not change while the program runs:

```cpp
const char DEVICE_ID[] = "haptell-01";
const unsigned int UDP_PORT = 4444;
const int MOTOR_PWM_PIN = 9;
```

These mean:

- The device responds to commands addressed to `haptell-01`.
- It listens on UDP port `4444`.
- It drives the motor through Arduino pin `D9`.

Using named constants is clearer than putting numbers such as `4444` or `9` everywhere in the code.

## Variables and State

Some values change while the program runs. These are stored in variables:

```cpp
PatternStep pattern[MAX_PATTERN_STEPS];
byte patternLength = 0;
byte currentStep = 0;
unsigned long stepStartedAt = 0;
bool patternPlaying = false;
```

Together, these variables describe the currently playing haptic pattern:

- `pattern`: the list of vibration steps.
- `patternLength`: how many steps are currently in the list.
- `currentStep`: which step is playing now.
- `stepStartedAt`: when the current step started.
- `patternPlaying`: whether a pattern is active.

This group of variables is often called program state.

## The `PatternStep` Struct

The firmware defines a custom data structure:

```cpp
struct PatternStep {
  uint8_t from;
  uint8_t to;
  unsigned long durationMs;
};
```

A `struct` groups related values together.

Each `PatternStep` says:

- Start at motor intensity `from`.
- End at motor intensity `to`.
- Take `durationMs` milliseconds to get there.

For example, this step fades the motor from off to medium intensity over 25 milliseconds:

```cpp
addStep(0, 180, 25);
```

`uint8_t` is an integer type that stores values from `0` to `255`. This is useful here because Arduino PWM values are also `0` to `255`.

## WiFi Connection

The firmware connects to WiFi in `connectToWiFi()`:

```cpp
WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
```

The credentials come from `secrets.h`.

This part waits until the first connection succeeds:

```cpp
while (WiFi.status() != WL_CONNECTED) {
  delay(500);
  Serial.print(".");
}
```

This use of `delay()` is acceptable because it only happens during startup. After setup, the main pattern player avoids long delays.

The function `keepWiFiConnected()` checks whether WiFi was lost and tries to reconnect every 10 seconds:

```cpp
if (now - lastWifiAttemptAt < WIFI_RETRY_INTERVAL_MS) {
  return;
}
```

`return` exits the function early. This is a common pattern for keeping code readable.

## Reading UDP Commands

UDP is a simple network protocol. The device receives a short text message such as:

```text
haptell-01 pulse intensity=180 duration=800
```

The function `readUdpCommand()` checks whether a packet arrived:

```cpp
int packetSize = udp.parsePacket();
if (packetSize <= 0) {
  return;
}
```

If no packet arrived, the function exits immediately.

When a packet exists, the code reads it into a character buffer:

```cpp
int length = udp.read(packetBuffer, sizeof(packetBuffer) - 1);
packetBuffer[length] = '\0';
```

The `'\0'` character marks the end of a C-style string. This prevents old text in the buffer from being accidentally treated as part of the new command.

Then the buffer is converted into an Arduino `String`:

```cpp
String command = String(packetBuffer);
command.trim();
```

`trim()` removes extra spaces or line breaks from the beginning and end.

## Parsing a Command

The command is handled here:

```cpp
void handleCommand(String command) {
  String target = nextToken(command);
  String action = nextToken(command);
```

The first word is the target:

```text
haptell-01
```

The second word is the action:

```text
pulse
```

The rest of the text contains optional parameters:

```text
intensity=180 duration=800
```

The function checks whether the command is meant for this device:

```cpp
if (!isAddressedToThisDevice(target)) {
  Serial.println("Ignored: command target does not match this device");
  return;
}
```

The `!` symbol means "not". So this means: if the command is not addressed to this device, ignore it.

The device accepts two targets:

```cpp
return target == DEVICE_ID || target == "all";
```

`||` means "or".

## Choosing the Pattern

The firmware uses `if`, `else if`, and `else` to choose what to do:

```cpp
if (action == "pulse") {
  playPulse(...);
} else if (action == "double") {
  playDoubleTap(...);
} else if (action == "ramp") {
  playRamp(...);
} else if (action == "stop") {
  stopPattern();
} else {
  Serial.println("Ignored: unknown action");
}
```

This is like asking:

- Is the action `pulse`?
- If not, is it `double`?
- If not, is it `ramp`?
- If not, is it `stop`?
- If none match, ignore it.

## Reading Parameters

The function `getIntParam()` finds values like `intensity=180`:

```cpp
getIntParam(command, "intensity", DEFAULT_INTENSITY)
```

This means:

- Look inside `command`.
- Find a parameter called `intensity`.
- If it exists, use its number.
- If it does not exist, use `DEFAULT_INTENSITY`.

Default values make commands shorter. For example:

```text
haptell-01 pulse
```

still works because the firmware supplies default intensity and duration values.

## Creating Patterns

Pattern functions do not directly vibrate the motor for a long time. Instead, they build a list of steps.

For example:

```cpp
void playPulse(int intensity, int durationMs) {
  clearPattern();
  addStep(0, constrainIntensity(intensity), 25);
  addStep(constrainIntensity(intensity), constrainIntensity(intensity), max(1, durationMs));
  addStep(constrainIntensity(intensity), 0, 80);
  startPattern();
}
```

This creates three steps:

1. Fade in from `0` to the requested intensity over `25` ms.
2. Hold the requested intensity for `durationMs`.
3. Fade out to `0` over `80` ms.

`clearPattern()` removes any old pattern first. This means a new command interrupts the previous pattern.

`constrainIntensity()` keeps intensity safely inside the PWM range:

```cpp
return (uint8_t)constrain(value, 0, 255);
```

So if a command accidentally says `intensity=999`, the firmware treats it as `255`.

## Non-Blocking Pattern Playback

A beginner version of this firmware might use code like:

```cpp
analogWrite(MOTOR_PWM_PIN, 180);
delay(800);
analogWrite(MOTOR_PWM_PIN, 0);
```

That is simple, but it blocks the Arduino for 800 ms. During that time, the device cannot react quickly to a new UDP command.

This firmware instead uses `millis()`:

```cpp
unsigned long now = millis();
unsigned long elapsed = now - stepStartedAt;
```

`millis()` returns how many milliseconds have passed since the board started.

The pattern player checks time repeatedly in `loop()`. It asks:

- How long has the current step been running?
- Is it finished?
- If not, what PWM value should the motor have right now?

This makes the firmware responsive.

## Interpolation

The function `interpolate()` calculates a value between `from` and `to`:

```cpp
uint8_t output = interpolate(step.from, step.to, elapsed, step.durationMs);
analogWrite(MOTOR_PWM_PIN, output);
```

If a step goes from `0` to `180` over 100 ms:

- At 0 ms, output is about `0`.
- At 50 ms, output is about `90`.
- At 100 ms, output is `180`.

This creates smooth ramps instead of sudden jumps.

## Motor Output

The motor is controlled with:

```cpp
analogWrite(MOTOR_PWM_PIN, output);
```

On Arduino, `analogWrite()` creates PWM output. PWM switches the pin on and off very quickly. A higher number means the output is on for more of the time.

Typical values:

- `0`: motor off
- `80`: low intensity
- `180`: medium/high intensity
- `255`: full intensity

The Arduino pin does not power the motor directly. It only drives the MOSFET gate. The motor current flows through the MOSFET circuit described in the schematic.

## Important Syntax Notes

### Function Definition

```cpp
void stopMotor() {
  analogWrite(MOTOR_PWM_PIN, 0);
}
```

`void` means the function does not return a value.

### Function Parameters

```cpp
void playPulse(int intensity, int durationMs)
```

This function expects two integer values: `intensity` and `durationMs`.

### Boolean Values

```cpp
bool patternPlaying = false;
```

A `bool` can be `true` or `false`.

### Arrays

```cpp
PatternStep pattern[MAX_PATTERN_STEPS];
```

This creates a fixed-size list of `PatternStep` values.

### Comments

The current firmware has few comments because the helper function names are meant to explain the code. If the logic grows more complex, short comments should be added near the complex parts.

## How to Add a New Pattern

To add a new pattern:

1. Write a new function, for example `playTripleTap()`.
2. Inside it, call `clearPattern()`.
3. Add steps with `addStep(...)`.
4. Call `startPattern()`.
5. Add a new `else if` branch in `handleCommand()`.

Example:

```cpp
void playTripleTap(int intensity) {
  uint8_t level = constrainIntensity(intensity);
  clearPattern();
  addStep(0, level, 15);
  addStep(level, level, 80);
  addStep(level, 0, 60);
  addStep(0, level, 15);
  addStep(level, level, 80);
  addStep(level, 0, 60);
  addStep(0, level, 15);
  addStep(level, level, 80);
  addStep(level, 0, 80);
  startPattern();
}
```

Then add command handling:

```cpp
} else if (action == "triple") {
  playTripleTap(getIntParam(command, "intensity", 220));
```

## Debugging Tips

Use Arduino Serial Monitor at `115200` baud.

Useful messages already printed by the firmware:

- Startup message
- WiFi connection progress
- Device IP address
- Received UDP command
- Ignored unknown target or unknown action

If the motor does not vibrate:

1. Confirm the board prints a WiFi IP address.
2. Confirm the UDP sender sends to that IP and port `4444`.
3. Confirm the command target is `haptell-01` or `all`.
4. Confirm the MOSFET circuit shares ground with the Arduino.
5. Try a stronger command such as `haptell-01 pulse intensity=255 duration=1000`.

## Mental Model

Think of the firmware as a tiny state machine:

- UDP commands create pattern steps.
- `loop()` keeps checking time.
- `updatePatternPlayer()` advances through the steps.
- `analogWrite()` updates the motor intensity.

This structure is more complex than a simple `delay()` example, but it makes the device responsive and ready for later multi-device experiments.

