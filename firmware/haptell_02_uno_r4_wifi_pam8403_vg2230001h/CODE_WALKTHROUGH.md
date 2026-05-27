# Firmware Code Walkthrough

This document explains `haptell_02_uno_r4_wifi_pam8403_vg2230001h.ino`.

## Big Picture

This firmware keeps the shared Haptell UDP command format, but it uses a
different hardware model from the DRV2605L version:

```text
UDP command -> amplitude envelope -> 70 Hz DAC sine -> PAM8403 -> VG2230001H
```

The Arduino UNO R4 WiFi generates a low-level analog signal on `A0` / `DAC`.
The PAM8403 amplifies that signal and drives the VG2230001H between one
channel's `OUT+` and `OUT-` pins.

## Main Loop

The loop is intentionally short:

```cpp
void loop() {
  updateCarrier();
  keepWiFiConnected();
  readUdpCommand();
  updateEnvelopePlayer();
  updateCarrier();
}
```

`updateCarrier()` is called twice so the DAC waveform keeps moving even when the
loop also checks WiFi and UDP. This is still a simple open-loop test generator,
not a precision audio engine.

## Carrier Generation

The VG2230001H is specified as a 70 Hz actuator, so the carrier frequency is
fixed:

```cpp
const float CARRIER_FREQUENCY_HZ = 70.0;
```

The code builds a small sine lookup table at startup:

```cpp
void prepareSineTable() {
  for (byte i = 0; i < SINE_TABLE_SIZE; i++) {
    float phase = (2.0 * PI * i) / SINE_TABLE_SIZE;
    sineTable[i] = (int16_t)(sin(phase) * 32767.0);
  }
}
```

During playback, each DAC sample is:

```text
DAC midpoint + sine sample x current envelope amplitude
```

The DAC is held at midpoint when stopped so there is no AC drive.

## Amplitude Safety Limit

The user-facing intensity remains `0..255`, but that value is mapped to a
limited DAC swing:

```cpp
const uint16_t MAX_DAC_SWING_COUNTS = 120;
```

This is a conservative starting value. The PAM8403 can produce more than the
VG2230001H should receive, so final tuning should be done by measuring Vrms
across the actuator while it is connected.

## Shape Playback

The `shape` command uses the same format as the Shape Designer:

```text
haptell-02 shape duration=1600 points=0:0,100:180,700:180,1200:60,1600:0
```

The firmware validates that:

- duration is `1..5000 ms`
- there are at least two points
- point times are sorted
- the first point time is `0`
- the last point time equals `duration`
- intensity values are `0..255`

While the shape is active, `updateEnvelopePlayer()` calculates elapsed time and
updates `currentDrive`. The carrier generator then uses `currentDrive` to scale
the next sine samples.

## Built-In Pattern Commands

The common commands are implemented as small generated envelopes:

- `pulse`: quick attack, hold, release
- `double`: two short pulses with a gap
- `ramp`: linear amplitude ramp followed by release
- `stop`: stop waveform generation and return DAC to midpoint

This keeps the command interface compatible with the existing web sender.

## Important Hardware Difference

This firmware does not use I2C and does not talk to DRV2605L. The Arduino output
is only a low-level analog source for the PAM8403 input.

Do not connect the VG2230001H to Arduino `A0`. The actuator connects only to the
PAM8403 bridged output pins for one channel.

Do not connect either PAM8403 output pin to GND.
