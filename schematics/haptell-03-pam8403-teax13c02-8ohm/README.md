# Haptell 03 PAM8403 + TEAX13C02-8/RH Wiring

This hardware path uses an Arduino UNO R4 WiFi as a waveform source, a PAM8403
class-D audio amplifier, and a Tectonic TEAX13C02-8/RH 8 ohm audio exciter.

## Files

- `diagram.md`: human-readable wiring explanation with a Mermaid diagram
- `wiring-diagram.png`: client-readable wiring diagram image

## Core Parts

- Arduino UNO R4 WiFi
- PAM8403 stereo class-D audio amplifier module
- Tectonic TEAX13C02-8/RH 8 ohm audio exciter
- 5 V supply capable of powering the Arduino and amplifier
- Optional LiPo Rider Plus 5 V portable power path

## Connections

```text
Arduino A0 / DAC -> PAM8403 L-IN through the module input coupling path
Arduino GND -> PAM8403 GND
5 V rail -> PAM8403 VCC
5 V rail -> Arduino USB-C 5 V power input
PAM8403 L+ -> TEAX13C02-8/RH lead 1
PAM8403 L- -> TEAX13C02-8/RH lead 2
```

Use one PAM8403 channel for the exciter. Leave the other output channel
unconnected unless another load is intentionally added.

## Important Cautions

- Do not connect either PAM8403 speaker output pin to GND.
- Do not connect the exciter directly to Arduino `A0` or a GPIO pin.
- Use a PAM8403 module input that is AC-coupled, or add an input coupling
  capacitor.
- Start with low amplitude values and measure output before increasing drive.
- Measure AC Vrms between `L+` and `L-` while the exciter is connected.

## Initial Test Commands

```text
haptell-03 tone amplitude=100 frequency=560 duration=500
haptell-03 sweep amplitude=120 from=300 to=900 duration=1200
haptell-03 stop
```

## Notes

The TEAX13C02-8/RH is an audio exciter, not a classic low-frequency LRA. It can
be useful for haptic textures and buzzes, especially when mounted to a physical
surface that can radiate the motion. The mechanical result depends strongly on
the mounting surface.

References:

- Tectonic TEAX13C02-8/RH data sheet: https://www.parts-express.com/pedocs/specs/297-214--tectonic-hiax13c02-8rh-spec-sheet.pdf
- PAM8403 data sheet mirror: https://www.digikey.com/htmldatasheets/production/1282043/0/0/1/pam8403.html
