# Human-Readable Circuit Diagram

## Wiring

```text
Arduino UNO R4 WiFi

3.7 V protected LiPo -> LiPo Rider Plus -> regulated 5 V output
LiPo Rider Plus 5 V output -> Arduino USB-C 5 V input
LiPo Rider Plus GND -> Arduino GND

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
  Battery["3.7 V 1S protected LiPo"] --> Rider["LiPo Rider Plus<br/>5 V boost output"]
  Rider --> Usb["Arduino USB-C 5 V input"]
  Rider --> V5["5 V motor rail"]
  Rider --> GND["GND"]
  D9["Arduino D9 PWM"] --> R1["R1 220 ohm"]
  R1 --> Gate["Q1 gate"]
  Gate --> R2["R2 10k pulldown"]
  R2 --> GND["GND"]
  GND --> Source["Q1 source"]
  V5 --> MotorPlus["Motor +"]
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
- Power the Arduino from the LiPo Rider Plus 5 V output through USB-C.
- Put the diode physically close to the motor if possible.
- Keep motor wires short for the first test.
- Start with a lower PWM value, for example `intensity=120`, before testing full power.
