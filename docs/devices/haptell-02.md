# Haptell-02 · Choose your actuator

Haptell-02 has two circuits. Both can receive commands addressed to
`haptell-02` with their main sketches. Identify the driver board before
selecting a sketch or wiring an actuator.

| Compare | DRV2605L variant | PAM8403 variant |
| --- | --- | --- |
| Label on the driver | DRV2605L | PAM8403 |
| Actuator | Vybronics VG1040003D, 170 Hz | Vybronics VG2230001H, 70 Hz |
| Signal from Arduino | I²C over SDA and SCL | Analog waveform from the DAC on A0 |
| Extra Arduino libraries | Adafruit DRV2605 Library and Adafruit BusIO | None beyond the UNO R4 board package |
| Wiring and first test | [Open the DRV2605L guide](./haptell-02-drv2605l.md) | [Open the PAM8403 guide](./haptell-02-pam8403.md) |

If the PAM8403 is connected to a Tectonic TEAX13C02-8/RH exciter, use the
[Haptell-03 guide](./haptell-03.md) for variable-frequency playback.
