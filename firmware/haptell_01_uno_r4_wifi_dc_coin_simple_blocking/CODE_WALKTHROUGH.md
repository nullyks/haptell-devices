# Firmware Code Walkthrough

This document explains the simple blocking `haptell-01` DC motor sketch.

## Purpose

The main `haptell-01` firmware is non-blocking so it can receive `stop` or a new
pattern while the motor is still vibrating. This version is intentionally
simpler. It plays each pattern directly and waits until it is finished before
returning to `loop()`.

## Program Flow

```cpp
void loop() {
  readUdpCommand();
}
```

The loop only checks for incoming UDP commands. When a valid command arrives,
`handleCommand()` calls one of the pattern functions:

- `playPulse(...)`
- `playDoubleTap(...)`
- `playRamp(...)`
- `playShape(...)`
- `stopMotor()`

## Blocking Playback

A pulse uses direct output and delays:

```cpp
playSegment(0, level, 25);
analogWrite(MOTOR_PWM_PIN, level);
delay(durationMs);
playSegment(level, 0, 80);
```

During these delays the Arduino does not call `readUdpCommand()`, so it cannot
receive a new command until playback ends.

## Shape Command

The `shape` command is:

```text
haptell-01 shape duration=1600 points=0:0,100:180,700:180,1200:60,1600:0
```

The firmware parses the `points` list into `ShapePoint` values. Each point has:

- `timeMs`: time from the start of the pattern
- `intensity`: DC motor PWM value, `0..255`

For every pair of neighboring points, `playSegment(...)` linearly interpolates
the PWM value:

```text
previous intensity -> next intensity over the segment duration
```

## Why Keep This Version

This sketch is useful for explaining the basic ideas:

- UDP command parsing
- PWM output with `analogWrite()`
- `delay()`-based timing
- Shape Designer point parsing

It is not the best runtime firmware for an interactive device. Use the main
non-blocking `haptell-01` firmware for responsive playback.
