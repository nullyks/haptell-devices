# haptell-04 Triple DC Coin Motor Driver

This wiring variant describes an Arduino UNO R4 WiFi driving three small DC
vibration motors. Each motor uses its own low-side N-channel MOSFET switch,
gate resistor, gate pulldown, and flyback diode.

The power path is otherwise similar to haptell-01.

## Files

- `diagram.md`: human-readable wiring explanation with a Mermaid diagram

## Bill of Materials

| Reference | Part | Notes |
| --- | --- | --- |
| U1 | Arduino UNO R4 WiFi | WiFi controller |
| M1-M3 | 3-5 V DC coin vibration motors | One motor per channel |
| Q1-Q3 | N-channel MOSFETs | One low-side switch per motor |
| R1/R3/R5 | 220 ohm resistors | Gate resistors |
| R2/R4/R6 | 10k resistors | Gate pulldowns |
| D1-D3 | 1N5819 Schottky diodes | Flyback diode across each motor |
| BT1 | 3.7 V 1S protected LiPo battery | Portable power source |
| U2 | LiPo Rider Plus | Charger/booster, 5 V / 2.4 A USB-C output |

## Connection Summary

| Arduino UNO R4 WiFi | Connection |
| --- | --- |
| `D9` | Motor 1 MOSFET gate through 220 ohm |
| `D10` | Motor 2 MOSFET gate through 220 ohm |
| `D11` | Motor 3 MOSFET gate through 220 ohm |
| USB-C 5 V input | LiPo Rider Plus 5 V output |
| `GND` | Common driver ground |

Each motor channel:

```text
5 V rail -> motor positive
motor negative -> MOSFET drain
MOSFET source -> GND
Arduino PWM pin -> 220R -> MOSFET gate
MOSFET gate -> 10k -> GND
1N5819 cathode -> motor positive / 5 V
1N5819 anode -> motor negative / MOSFET drain
```

## Prototype Notes

- Do not connect any motor directly to an Arduino GPIO pin.
- Use a common ground between the Arduino and all three MOSFET driver stages.
- Each motor needs its own flyback diode.
- Start with one motor channel first, then add the second and third channels.
- If the three motors draw more current than expected, measure the 5 V rail
  while all channels are active.

## Firmware

Use:

```text
firmware/haptell_04_uno_r4_wifi_triple_dc_shape_blocking/
```

The matching web tool is:

```text
tools/haptell_04_triple_shape_designer/
```
