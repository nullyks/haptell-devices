# Haptell 03 Simple Blocking Firmware

This is a beginner-friendly version of the `haptell-03` firmware for an
Arduino UNO R4 WiFi, PAM8403 amplifier, and Tectonic TEAX13C02-8/RH exciter.

It uses the same UDP commands as the main firmware, but pattern playback blocks
inside the pattern function until the pattern is finished.

Use this version when reading the code or doing first bench tests. Use the main
non-blocking firmware for interactive testing where `stop` or a new pattern
should interrupt current playback.

## Commands

```text
haptell-03 pattern duration=1200 points=0:0:560,80:150:560,700:180:760,1200:0:560
haptell-03 tone amplitude=120 frequency=560 duration=500
haptell-03 sweep amplitude=140 from=180 to=900 duration=1200
haptell-03 stop
```

Each custom pattern point is `timeMs:amplitude:frequencyHz`.

## Blocking Behavior

During active playback, the sketch keeps generating the DAC waveform but does
not read new UDP packets. A `stop` command is handled only after the current
pattern has finished.

## Compile

```powershell
arduino-cli compile --fqbn arduino:renesas_uno:unor4wifi firmware/haptell_03_uno_r4_wifi_pam8403_teax13c02_8ohm_simple_blocking
```
