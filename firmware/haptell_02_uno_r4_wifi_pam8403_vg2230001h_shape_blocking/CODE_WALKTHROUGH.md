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

## Blocking Limitation

The firmware stays inside `playLoadedShape()` until the pattern is finished.
During that time the carrier continues to update, but the board does not read
new UDP commands.
