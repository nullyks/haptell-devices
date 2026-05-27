# haptell-02 Arduino UNO R4 WiFi + PAM8403 + VG2230001H Firmware

This is the main non-blocking `haptell-02` hardware variant for the Vybronics
VG2230001H 70 Hz LRA / voice-coil actuator. It does not use the DRV2605L.

The Arduino UNO R4 WiFi generates a 70 Hz sine carrier on its `A0` DAC output.
A PAM8403 class-D audio amplifier drives the actuator, and the firmware changes
the carrier amplitude according to the selected haptic pattern or Shape Designer
envelope.

For the simpler blocking version, see:

```text
../haptell_02_uno_r4_wifi_pam8403_vg2230001h_simple_blocking/
```

## Setup

1. Install the Arduino IDE.
2. Install/select the Arduino UNO R4 WiFi board package.
3. Copy `secrets.example.h` to `secrets.h`.
4. Add WiFi credentials to `secrets.h`.
5. Open `haptell_02_uno_r4_wifi_pam8403_vg2230001h.ino`.
6. Upload to Arduino UNO R4 WiFi.

No external Arduino library is required beyond the UNO R4 WiFi board package.

## Wiring Summary

- LiPo Rider Plus 5 V output -> Arduino UNO R4 WiFi USB-C 5 V power input
- LiPo Rider Plus 5 V output -> PAM8403 `5V` / `VCC`
- Common GND -> Arduino GND and PAM8403 GND
- Arduino `A0` / `DAC` -> one PAM8403 channel input, for example `L-IN`, through the module's input coupling path
- VG2230001H lead 1 -> same PAM8403 channel `L+`
- VG2230001H lead 2 -> same PAM8403 channel `L-`

Do not connect either PAM8403 output lead to GND. PAM8403 outputs are bridged /
differential speaker outputs. Use one channel only unless you intentionally add a
second actuator.

The UNO R4 DAC signal is centered around a DC midpoint. Use a PAM8403 module
with AC-coupled input, or add a series input capacitor if the module exposes the
amplifier input directly.

## Drive Model

The firmware generates:

```text
70 Hz sine carrier x amplitude envelope
```

The user-facing intensity range is still `0..255`:

- `0`: no AC drive, DAC held at midpoint
- `255`: maximum configured DAC sine swing

The default maximum DAC swing is intentionally conservative:

```cpp
const uint16_t MAX_DAC_SWING_COUNTS = 120;
```

This is only a safe starting value for a typical 5 V UNO R4 DAC feeding a
PAM8403 input. For final tuning, measure differential AC Vrms across the
VG2230001H while it is connected and keep the actuator near its rated 2 Vrms
value. Start with the PAM8403 volume low if your module has a potentiometer.

## Supported Commands

The firmware listens on UDP port `4444` and accepts commands addressed to
`haptell-02` or `all`.

Examples:

```text
haptell-02 pulse intensity=180 duration=800
haptell-02 double intensity=220 gap=120
haptell-02 ramp from=60 to=220 duration=1200
haptell-02 shape duration=1600 points=0:0,100:180,700:180,1200:60,1600:0
haptell-02 stop
```

The `shape` command uses the same format as the existing Shape Designer:

```text
haptell-02 shape duration=<duration_ms> points=<time:intensity,time:intensity,...>
```

Limits:

- `duration`: `1..5000 ms`
- maximum point count: `24`
- point times must be sorted
- first point time must be `0`
- last point time must equal `duration`
- intensity must be `0..255`

## Notes

This is an open-loop test firmware. It does not measure actuator motion, track
resonance, or protect the actuator automatically. The fixed carrier frequency is
70 Hz because VG2230001H is specified as a 70 Hz actuator.

The carrier is generated in the Arduino loop with a small DAC wavetable. This is
adequate for first bench testing, but a final product design should use a more
robust audio/haptic driver path or a timer/DMA-based waveform generator.
