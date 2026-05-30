# haptell-02 DRV2605L LRA Driver

This schematic documentation describes the second Haptell prototype: an Arduino UNO R4 WiFi controlling a Vybronics VG1040003D LRA actuator through a Mavaol DRV2605L haptic motor controller module.

## Files

- `diagram.md`: human-readable wiring explanation with a Mermaid diagram
- `wiring-diagram.png`: client-readable wiring diagram image

## Bill of Materials

| Reference | Part | Notes |
| --- | --- | --- |
| U1 | Arduino UNO R4 WiFi | WiFi controller |
| U2 | Mavaol DRV2605L haptic motor controller module | I2C haptic driver |
| M1 | Vybronics VG1040003D LRA | 10 x 4 mm, 2.5 Vrms, 170 Hz |
| U3 | Seeed Studio LiPo Rider Plus | 1S LiPo charger/booster, 5 V output |
| BT1 | 3.7 V 1S protected LiPo battery | Portable power source |

## Connection Summary

| Arduino UNO R4 WiFi | DRV2605L module |
| --- | --- |
| `GND` | `GND` |
| `SDA` | `SDA` |
| `SCL` | `SCL` |

The DRV2605L `VIN` / `VCC` pin is powered from the LiPo Rider Plus 5 V output, not from the Arduino `5V` header pin.

| DRV2605L module | LRA |
| --- | --- |
| `OUT+` | VG1040003D lead 1 |
| `OUT-` | VG1040003D lead 2 |

| LiPo Rider Plus | Connection |
| --- | --- |
| Battery connector | 3.7 V protected LiPo |
| 5 V output | Arduino USB-C 5 V power input and DRV2605L VIN/VCC |
| GND | Common ground |

## Prototype Notes

- Use a common ground between the Arduino and DRV2605L module.
- Power the Arduino from the LiPo Rider Plus 5 V output through the Arduino USB-C power input.
- The DRV2605L output is differential. Connect the LRA only between `OUT+` and `OUT-`.
- Do not use the DC motor prototype flyback diode across the LRA.
- Tune the DRV2605L library/effect choices after testing the real VG1040003D actuator.
