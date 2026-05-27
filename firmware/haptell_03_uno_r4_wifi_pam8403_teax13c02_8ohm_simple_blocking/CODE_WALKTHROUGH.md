# Firmware Code Walkthrough

This document explains the simple blocking `haptell-03` firmware.

## Big Picture

The firmware receives UDP commands and converts them into a list of pattern
points. Each point contains:

```text
timeMs:amplitude:frequencyHz
```

The Arduino UNO R4 WiFi generates a sine wave on `A0` / `DAC`, and the PAM8403
amplifies that signal for the TEAX13C02-8/RH exciter.

## Why This Version Is Blocking

The main sketch logic is intentionally simple:

```cpp
void loop() {
  readUdpCommand();
}
```

When a valid command arrives, playback happens inside `playLoadedPattern()`.
That function keeps running until the pattern duration is over.

This makes the code easier to follow, but it means the device cannot react to a
new UDP command during playback.

## Pattern Playback

`playLoadedPattern()`:

1. resets the waveform phase
2. applies the first amplitude/frequency state
3. starts the carrier
4. loops until the requested duration has elapsed
5. updates amplitude and frequency every `5 ms`
6. writes DAC samples as often as the carrier sample schedule requires
7. stops and returns the DAC to midpoint

The same interpolation logic is used as in the non-blocking firmware.

## Frequency Generation

The sine wave uses a 256-sample lookup table and a phase accumulator. Changing
the phase increment changes the output frequency. This allows one pattern to
move from, for example, `180 Hz` to `900 Hz` without restarting the waveform.

## Safety

The user-facing amplitude is normalized `0..255`, but the actual DAC swing is
limited by `MAX_DAC_SWING_COUNTS`. Tune that value only after measuring
differential AC Vrms across the connected exciter.
