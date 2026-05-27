# Haptell 03 Frequency Patterns

`haptell-03` is an experimental haptic path using:

- Arduino UNO R4 WiFi
- PAM8403 class-D audio amplifier
- Tectonic TEAX13C02-8/RH 8 ohm audio exciter

The earlier LRA and DC examples mainly control vibration strength. This variant
also controls the drive frequency, so a custom pattern contains two curves over
time:

- amplitude: normalized `0..255`
- frequency: `40..1500 Hz`

## Command Format

```text
haptell-03 pattern duration=1200 points=0:0:560,80:150:560,700:180:760,1200:0:560
```

Each point is:

```text
timeMs:amplitude:frequencyHz
```

Example point:

```text
700:180:760
```

means:

- at `700 ms`
- amplitude is `180` on a `0..255` scale
- frequency is `760 Hz`

## Interpolation

The firmware linearly interpolates both amplitude and frequency between points.

If the pattern contains:

```text
100:80:560,600:180:900
```

then at `350 ms`, halfway through that segment, the firmware drives
approximately:

```text
amplitude = 130
frequency = 730 Hz
```

The update rate for the amplitude/frequency control state is `5 ms`. The DAC
carrier sample rate is `8000 Hz`.

## Quick Test Commands

Fixed tone near the exciter resonance:

```text
haptell-03 tone amplitude=120 frequency=560 duration=500
```

Rising sweep:

```text
haptell-03 sweep amplitude=140 from=180 to=900 duration=1200
```

Short pulse:

```text
haptell-03 pulse amplitude=160 frequency=560 duration=500
```

Stop:

```text
haptell-03 stop
```

## Web Sender

Start the dedicated haptell-03 web sender:

```powershell
node tools/haptell_03_frequency_web_sender/server.js
```

Then open:

```text
http://127.0.0.1:8081
```

The UI shows:

- the outgoing UDP command
- a structured data array
- an amplitude envelope
- a frequency path on the same time axis

## Practical Limits

The firmware accepts `40..1500 Hz`, but the TEAX13C02-8/RH is specified as an
audio exciter with nominal resonance around `560 Hz` and an audio frequency
range starting around `500 Hz`. Very low frequencies may be felt weakly or not
at all, depending on mounting.

Start with low amplitude values such as `60..140`. Measure differential AC Vrms
across the connected exciter between the PAM8403 output pins, not from either
output pin to ground.

The current firmware caps the UNO R4 DAC swing with `MAX_DAC_SWING_COUNTS`.
Raise that value only after bench measurement.

## Firmware Folders

Main non-blocking firmware:

```text
firmware/haptell_03_uno_r4_wifi_pam8403_teax13c02_8ohm/
```

Simple blocking firmware:

```text
firmware/haptell_03_uno_r4_wifi_pam8403_teax13c02_8ohm_simple_blocking/
```
