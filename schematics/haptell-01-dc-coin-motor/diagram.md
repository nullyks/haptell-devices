# Human-Readable Circuit Diagram

## Wiring

```text
Arduino UNO R4 WiFi

D9 PWM ----[R1 220R]---- Gate  Q1 IRF3205
                         |
                       [R2 10k]
                         |
GND ---------------------+---- Source Q1

5V ---- M1 motor +
M1 motor - ---- Drain Q1

D1 1N5819 across M1:
Cathode / marked end -> 5V / motor +
Anode                 -> Q1 drain / motor -
```

## Mermaid Overview

```mermaid
flowchart LR
  D9["Arduino D9 PWM"] --> R1["R1 220 ohm"]
  R1 --> Gate["Q1 gate"]
  Gate --> R2["R2 10k pulldown"]
  R2 --> GND["GND"]
  GND --> Source["Q1 source"]
  V5["Arduino 5V"] --> MotorPlus["Motor +"]
  MotorPlus --> M1["3-5 V DC coin motor"]
  M1 --> Drain["Q1 drain"]
  Drain --> Q1["Q1 IRF3205"]
  Q1 --> Source
  Drain --> D1A["D1 anode"]
  D1C["D1 cathode"] --> MotorPlus
  D1A --> D1["1N5819 flyback diode"]
  D1 --> D1C
```

## Practical Assembly Checklist

- Keep the Arduino ground and MOSFET source ground common.
- Put the diode physically close to the motor if possible.
- Keep motor wires short for the first test.
- Start with a lower PWM value, for example `intensity=120`, before testing full power.

