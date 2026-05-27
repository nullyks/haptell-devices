# Firmware Code Walkthrough

This document explains `haptell_03_uno_r4_wifi_pam8403_teax13c02_8ohm.ino`.

## Big Picture

`haptell-03` treats the actuator as a small audio exciter rather than a fixed
resonant LRA:

```text
UDP command -> amplitude/frequency envelope -> DAC sine carrier -> PAM8403 -> exciter
```

The Arduino UNO R4 WiFi generates a sine wave on `A0` / `DAC`. The pattern data
controls the sine wave's amplitude and frequency over time.

## Main Loop

The main loop keeps playback non-blocking:

```cpp
void loop() {
  updateCarrier();
  keepWiFiConnected();
  readUdpCommand();
  updatePatternPlayer();
  updateCarrier();
}
```

The device can receive a new UDP command or `stop` while a pattern is playing.
The first WiFi connection in `setup()` is still blocking.

## Pattern Command

The custom command is:

```text
haptell-03 pattern duration=1200 points=0:0:560,80:150:560,700:180:760,1200:0:560
```

Each point has three fields:

```text
timeMs:amplitude:frequencyHz
```

- `timeMs` places the point inside the pattern.
- `amplitude` is a normalized drive level from `0` to `255`.
- `frequencyHz` sets the sine carrier frequency at that point.

The firmware validates the duration, point count, sorted times, amplitude
range, and frequency range before starting playback.

## Linear Interpolation

`patternStateAt()` finds the current segment and linearly interpolates both
amplitude and frequency:

```text
current value = previous value + segment fraction x value delta
```

For example, if a point is `100:80:560` and the next point is `600:180:900`,
then halfway through that segment the firmware drives about amplitude `130` and
frequency `730 Hz`.

## Carrier Generation

The carrier uses a 256-sample sine table and a 32-bit phase accumulator. This is
a simple direct digital synthesis approach:

```text
phase increment = requested frequency / sample rate
```

`updateCarrier()` writes a new DAC sample when the next sample time arrives. If
the main loop is late, it skips phase forward so the perceived frequency stays
closer to the requested value.

This is good enough for haptic texture experiments, but it is not a precision
audio synthesizer.

## Output Scaling

The user-facing amplitude is still `0..255`, but the DAC swing is capped:

```cpp
const uint16_t MAX_DAC_SWING_COUNTS = 120;
```

This should be tuned only after measuring the connected exciter. The PAM8403
output is differential, so measure between `L+` and `L-`, not from either output
pin to ground.

## Built-In Commands

The firmware also accepts:

- `tone amplitude=<0..255> frequency=<Hz> duration=<ms>`
- `sweep amplitude=<0..255> from=<Hz> to=<Hz> duration=<ms>`
- `pulse amplitude=<0..255> frequency=<Hz> duration=<ms>`
- `double amplitude=<0..255> frequency=<Hz> gap=<ms>`
- `ramp from=<0..255> to=<0..255> frequency=<Hz> duration=<ms>`
- `stop`

The built-in commands are converted into the same internal point format as a
custom `pattern`.
