# haptell-01 DC Coin Motor Driver

This schematic describes the first Haptell prototype: an Arduino UNO R4 WiFi driving a 3-5 V DC coin vibration motor through a low-side N-channel MOSFET switch.

## Files

- `diagram.md`: human-readable wiring explanation with a Mermaid diagram
- `circuit-diagram.svg`: simple visual circuit diagram for documentation
- `haptell-01-dc-coin-motor.kicad_pro`: KiCad project file
- `haptell-01-dc-coin-motor.kicad_sch`: KiCad schematic draft

## Bill of Materials

| Reference | Part | Notes |
| --- | --- | --- |
| U1 | Arduino UNO R4 WiFi | First test controller |
| M1 | 3-5 V DC coin vibration motor | 8 x 3 mm, 67 mA rated |
| Q1 | IRF3205 N-channel MOSFET | Available prototype part |
| R1 | 220 ohm resistor | Gate resistor |
| R2 | 10k resistor | Gate pulldown |
| D1 | 1N5819 Schottky diode | Flyback diode across motor |
| BT1 | 9 V battery | Short bench test only |

## Connection Summary

| Arduino UNO R4 WiFi | Connection |
| --- | --- |
| `D9` | R1 -> MOSFET gate |
| `5V` | Motor positive lead |
| `GND` | MOSFET source and R2 ground |
| Barrel jack / `VIN` | 9 V battery for first short test |

The diode is placed across the motor with the cathode on the 5 V side and the anode on the MOSFET drain side.

## Prototype Notes

The IRF3205 is acceptable for the first UNO R4 WiFi test with this small motor. Use a true logic-level MOSFET for later ESP32/ESP8266 versions.

