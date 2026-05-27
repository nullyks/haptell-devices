# Firmware Code Walkthrough

This document explains the simple blocking PAM8403 / VG2230001H firmware.

## Big Picture

The sketch keeps the same drive model as the main PAM8403 firmware:

```text
70 Hz sine carrier x amplitude envelope
```

The difference is program structure. The main version updates playback from
`loop()` and keeps reading UDP commands. This blocking version enters
`playLoadedShape(...)` and stays there until the pattern ends.

## Main Loop

```cpp
void loop() {
  readUdpCommand();
}
```

`loop()` only reads UDP packets. If a command starts playback, control does not
return to `loop()` until the pattern is finished.

## Carrier Playback

During playback, the sketch repeatedly does two things:

1. Update the current envelope value from the shape points.
2. Call `updateCarrier()` to write the next DAC sine sample when it is due.

```cpp
while (millis() - startedAt < durationMs) {
  currentDrive = shapeIntensityAt(elapsed);
  updateCarrier();
}
```

This is still blocking because it does not check UDP inside the loop.

## Shape Points

The `shape` command looks like this:

```text
haptell-02 shape duration=1600 points=0:0,100:180,700:180,1200:60,1600:0
```

Each point is a `time:intensity` pair:

- `time`: milliseconds from the start of the pattern
- `intensity`: envelope level from `0` to `255`

The firmware linearly interpolates between neighboring points.

## Safety Limit

`MAX_DAC_SWING_COUNTS` limits the DAC sine amplitude before the PAM8403 input:

```cpp
const uint16_t MAX_DAC_SWING_COUNTS = 120;
```

This is a conservative starting value. Tune it only after measuring differential
AC Vrms across the connected VG2230001H.

## When To Use This Version

Use this firmware for reading, teaching, and simple bench tests. Use the main
non-blocking PAM8403 firmware when the device must react quickly to `stop` or a
new pattern command.
