# haptell-01 DC Coin Motor Driver

This schematic describes the first Haptell prototype: an Arduino UNO R4 WiFi driving a 3-5 V DC coin vibration motor through a low-side N-channel MOSFET switch.

## Files

- `diagram.md`: human-readable wiring explanation with a Mermaid diagram
- `wiring-diagram.png`: client-readable wiring diagram image

## Bill of Materials

| Reference | Part | Notes |
| --- | --- | --- |
| U1 | Arduino UNO R4 WiFi | First test controller |
| M1 | 3-5 V DC coin vibration motor | 8 x 3 mm, 67 mA rated |
| Q1 | IRF3205 N-channel MOSFET | Available prototype part |
| R1 | 220 ohm resistor | Gate resistor |
| R2 | 10k resistor | Gate pulldown |
| D1 | 1N5819 Schottky diode | Flyback diode across motor |
| BT1 | 3.7 V 1S protected LiPo battery | Portable power source |
| U2 | LiPo Rider Plus | Charger/booster, 5 V / 2.4 A USB-C output |

## Connection Summary

| Arduino UNO R4 WiFi | Connection |
| --- | --- |
| `D9` | R1 -> MOSFET gate |
| USB-C 5 V input | LiPo Rider Plus 5 V output |
| `5V` rail | Motor positive lead |
| `GND` | MOSFET source and R2 ground |

| LiPo Rider Plus | Connection |
| --- | --- |
| Battery connector | 3.7 V 1S protected LiPo battery |
| 5 V output | Arduino USB-C 5 V power input and motor positive lead |
| GND | Arduino GND, MOSFET source, and R2 ground |

The diode is placed across the motor with the cathode on the 5 V side and the anode on the MOSFET drain side.

## Prototype Notes

The IRF3205 is acceptable for the first UNO R4 WiFi test with this small motor. Use a true logic-level MOSFET for later ESP32/ESP8266 versions.

Do not use a small rectangular 9 V battery as the active haptell-01 power
source. The current portable path is the protected 1S LiPo battery through the
LiPo Rider Plus regulated 5 V output.
