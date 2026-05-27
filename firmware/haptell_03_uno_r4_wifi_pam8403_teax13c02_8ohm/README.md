# Haptell 03 Firmware: PAM8403 + TEAX13C02-8/RH Exciter

This firmware targets an Arduino UNO R4 WiFi driving a Tectonic
TEAX13C02-8/RH 8 ohm audio exciter through a PAM8403 class-D amplifier.

Unlike the earlier LRA examples, this variant controls both:

- amplitude: normalized `0..255`
- frequency: `40..1500 Hz`

The firmware listens for UDP text commands on port `4444` and uses device ID
`haptell-03`.

## Hardware Path

```text
UDP command -> amplitude/frequency pattern -> UNO R4 DAC -> PAM8403 -> TEAX13C02-8/RH
```

Recommended first wiring:

```text
Arduino A0 / DAC -> PAM8403 L-IN through the module input coupling path
Arduino GND -> PAM8403 GND
5 V rail -> PAM8403 VCC and Arduino USB-C 5 V power input
PAM8403 L+ -> TEAX13C02-8/RH lead 1
PAM8403 L- -> TEAX13C02-8/RH lead 2
```

Do not connect either PAM8403 speaker output pin to GND. The output is bridged.

## Commands

Custom frequency pattern:

```text
haptell-03 pattern duration=1200 points=0:0:560,80:150:560,700:180:760,1200:0:560
```

Each point is:

```text
timeMs:amplitude:frequencyHz
```

Rules:

- `duration`: `1..5000 ms`
- `amplitude`: `0..255`
- `frequencyHz`: `40..1500`
- first point must be at `0 ms`
- last point must be at `duration`
- point times must be increasing

The firmware linearly interpolates both amplitude and frequency between points.

Quick test commands:

```text
haptell-03 tone amplitude=120 frequency=560 duration=500
haptell-03 sweep amplitude=140 from=180 to=900 duration=1200
haptell-03 pulse amplitude=160 frequency=560 duration=500
haptell-03 stop
```

## Safety Notes

`MAX_DAC_SWING_COUNTS` is intentionally conservative. The PAM8403 can deliver
more power than this small exciter should receive. Start with low amplitude and
measure differential AC Vrms across the connected exciter before increasing the
drive level.

The TEAX13C02-8/RH has a nominal 560 Hz resonance and an audio frequency range
starting around 500 Hz, so frequencies near 560 Hz are expected to be stronger
than very low test frequencies.

## WiFi Setup

Copy:

```text
secrets.example.h
```

to:

```text
secrets.h
```

and fill in the closed-subnet WiFi credentials. Do not commit `secrets.h`.

## Compile

```powershell
arduino-cli compile --fqbn arduino:renesas_uno:unor4wifi firmware/haptell_03_uno_r4_wifi_pam8403_teax13c02_8ohm
```
