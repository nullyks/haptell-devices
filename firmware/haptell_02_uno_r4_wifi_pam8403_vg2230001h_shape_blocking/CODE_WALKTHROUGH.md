# Code Walkthrough

This sketch keeps only the code needed to play a custom amplitude shape on the
PAM8403 + VG2230001H hardware path.

## Flow

```text
WiFi UDP packet -> parse shape command -> validate points -> 70 Hz DAC carrier
```

## Carrier

The Arduino UNO R4 WiFi generates a 70 Hz sine wave on `A0` / `DAC`. The current
shape intensity scales that sine wave before it reaches the PAM8403 input.

## Shape Points

Each point is:

```text
timeMs:intensity
```

The first point must be at time `0`, but its intensity can be non-zero. The last
point must be at the full duration and must have intensity `0`.

## Playback

The shape envelope uses the same `0..255` intensity range and the same sorted
point validation as the DC coin shape-only firmware. Between two points,
`shapeIntensityAt()` linearly interpolates the drive value.

`setDriveValue()` is the single place where the sketch updates the current
shape drive value. That value scales the fixed 70 Hz sine carrier in
`writeCarrierSample()`.

The envelope update interval is `10 ms`, matching the DC shape-only firmware.
The carrier sample loop continues to run between envelope updates so the DAC
still outputs the 70 Hz waveform continuously.

Serial Plotter output is decimated to about `240` samples per shape so long
patterns are easier to see as a whole in Arduino Serial Plotter's fixed
scrolling window. Every plotter line includes fixed reference traces:

```text
drive:<value> min:0 max:255
```

The `min` and `max` traces keep the Y scale pinned to the full Shape Designer
range. Arduino Serial Plotter does not use real timestamp values for the X
axis, so the firmware controls the visible X range by limiting how many debug
samples it prints per shape.

## Blocking Limitation

The firmware stays inside `playLoadedShape()` until the pattern is finished.
During that time the carrier continues to update, but the board does not read
new UDP commands.
