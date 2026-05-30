# haptell-02 PAM8403 + VG2230001H Wiring

This wiring variant is for testing the Vybronics VG2230001H 70 Hz LRA /
voice-coil actuator with an Arduino UNO R4 WiFi and a PAM8403 class-D audio
amplifier module.

It is not a DRV2605L circuit. The Arduino generates a 70 Hz analog carrier on
its `A0` DAC output, and the PAM8403 drives the actuator as a small audio load.

## Files

- `diagram.md`: human-readable wiring explanation with a Mermaid diagram
- `wiring-diagram.png`: client-readable wiring diagram image

## Core Parts

- Arduino UNO R4 WiFi
- PAM8403 2 x 3 W class-D amplifier module
- Vybronics VG2230001H, 2 Vrms, 70 Hz actuator
- Seeed Studio LiPo Rider Plus 5 V supply path
- 1S protected LiPo battery

## Connections

```text
LiPo Rider Plus 5 V -> Arduino UNO R4 WiFi USB-C 5 V input
LiPo Rider Plus 5 V -> PAM8403 VCC / 5V
LiPo Rider Plus GND -> Arduino GND
LiPo Rider Plus GND -> PAM8403 GND

Arduino A0 / DAC -> PAM8403 L-IN through the module input coupling path
VG2230001H lead 1 -> PAM8403 L+
VG2230001H lead 2 -> PAM8403 L-
```

Use one PAM8403 channel for one actuator. Leave the other channel disconnected
or use it only for a second, separately controlled actuator path.

## Cautions

- Start with the PAM8403 volume low if the module has a potentiometer.
- Use a PAM8403 module with AC-coupled input, or add a series capacitor before
  the amplifier input if the module exposes the input directly.
- Measure differential AC Vrms across the actuator while it is connected.
- Keep the VG2230001H near its rated 2 Vrms value.
- Do not connect either PAM8403 output pin to GND.
- Do not bridge the two PAM8403 channels together.
- Do not drive the actuator directly from Arduino `A0`.

## Firmware

Use:

```text
firmware/haptell_02_uno_r4_wifi_pam8403_vg2230001h/
```

The firmware accepts the shared `haptell-02` UDP commands, including the Shape
Designer `shape` command.
