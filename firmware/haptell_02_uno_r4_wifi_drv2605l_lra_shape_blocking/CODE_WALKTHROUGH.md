# Code Walkthrough

This sketch keeps only the code needed to receive and play a custom amplitude
shape on the DRV2605L.

## Flow

```text
WiFi UDP packet -> parse shape command -> validate points -> DRV2605L RTP values
```

## Realtime Playback

The DRV2605L is placed into realtime playback mode:

```cpp
drv.setMode(DRV2605_MODE_REALTIME);
```

The firmware then sends a new realtime value every few milliseconds. The value
comes from the shape envelope.

## Shape Points

Each point is:

```text
timeMs:intensity
```

The first point must be at time `0`, but its intensity can be non-zero. The last
point must be at the full duration and must have intensity `0`.

## Playback

The shape envelope uses the same `0..255` intensity range and the same sorted
point validation as the DC and PAM8403 shape-only firmware. Between two points,
`shapeIntensityAt()` linearly interpolates the drive value.

`setRealtimeDriveValue()` is the single place where the sketch sends the
current shape value to the DRV2605L realtime playback register. It also prints
the same value to Arduino Serial Plotter when debug output is enabled.

The envelope update interval is `10 ms`, matching the other shape-only blocking
firmware. Serial Plotter output is decimated to about `240` samples per shape
so long patterns are easier to see as a whole in Arduino Serial Plotter's fixed
scrolling window. Every plotter line includes fixed reference traces:

```text
drive:<value> min:0 max:255
```

The `min` and `max` traces keep the Y scale pinned to the full Shape Designer
range. Arduino Serial Plotter does not use real timestamp values for the X
axis, so the firmware controls the visible X range by limiting how many debug
samples it prints per shape.

## Blocking Limitation

The playback loop runs until the shape is finished. During that time, the board
does not call `udp.parsePacket()`, so it cannot receive a new UDP command.
