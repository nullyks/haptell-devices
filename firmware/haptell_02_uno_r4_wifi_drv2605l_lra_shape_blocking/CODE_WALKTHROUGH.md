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

## Blocking Limitation

The playback loop runs until the shape is finished. During that time, the board
does not call `udp.parsePacket()`, so it cannot receive a new UDP command.
