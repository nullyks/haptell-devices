# haptell-04 Triple DC Motor Wiring

Each motor is wired like the haptell-01 DC motor prototype. The only difference
is that haptell-04 has three independent MOSFET-switched motor channels.

```mermaid
flowchart LR
  BT1["BT1 3.7 V 1S LiPo"] --> U2["LiPo Rider Plus charger / booster"]
  U2 -->|"5 V output"| USB["Arduino UNO R4 WiFi USB-C 5 V input"]
  U2 -->|"5 V rail"| M1P["M1 positive"]
  U2 -->|"5 V rail"| M2P["M2 positive"]
  U2 -->|"5 V rail"| M3P["M3 positive"]
  U2 -->|"GND"| GND["common GND"]

  Arduino["Arduino UNO R4 WiFi"] -->|"D9 PWM"| Q1["Q1 MOSFET gate via 220R"]
  Arduino -->|"D10 PWM"| Q2["Q2 MOSFET gate via 220R"]
  Arduino -->|"D11 PWM"| Q3["Q3 MOSFET gate via 220R"]
  Arduino -->|"GND"| GND

  M1P --> M1["M1 DC vibration motor"]
  M2P --> M2["M2 DC vibration motor"]
  M3P --> M3["M3 DC vibration motor"]

  M1 --> Q1D["Q1 drain"]
  M2 --> Q2D["Q2 drain"]
  M3 --> Q3D["Q3 drain"]

  Q1D --> Q1S["Q1 source"]
  Q2D --> Q2S["Q2 source"]
  Q3D --> Q3S["Q3 source"]

  Q1S --> GND
  Q2S --> GND
  Q3S --> GND
```

Add one 10k pulldown from each MOSFET gate to GND. Add one 1N5819 diode across
each motor with the cathode on the 5 V side and the anode on the MOSFET drain
side.
