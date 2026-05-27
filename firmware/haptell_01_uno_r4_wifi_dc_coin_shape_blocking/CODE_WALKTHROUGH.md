# Code Walkthrough

This sketch is intentionally small.

## Flow

```text
WiFi UDP packet -> parse shape command -> validate points -> play PWM envelope
```

`loop()` only calls `readUdpCommand()`. When a valid `shape` command arrives,
the firmware stays inside `playShape()` until the pattern is finished.

## Shape Points

Each point is:

```text
timeMs:intensity
```

The first point must be at `0 ms`, but its intensity does not have to be `0`.
The last point must be at the full duration and must have intensity `0`.

## Playback

The DC motor is driven from PWM pin `D9` through the MOSFET driver circuit.
Between two points, `playSegment()` linearly interpolates the PWM value.

Because playback is blocking, the board cannot receive a new UDP packet while
the shape is active.
