# haptell-04 Triple DC Motor Wiring

Build the motor driver shown below three times. Connect M1 to D9, M2 to D10,
and M3 to D11. All three channels share the 5 V and ground rails.

```mermaid
flowchart TB
  Battery["3.7 V protected 1S LiPo"] -->|"BAT input"| Power["LiPo Rider Plus"]
  Power -->|"5 V to USB-C"| Arduino["Arduino UNO R4 WiFi"]
  Power -->|"5 V"| Rail["5 V rail"]
  Power --- Ground["Common GND"]
  Arduino --- Ground
  Arduino -->|"D9 for M1 · D10 for M2 · D11 for M3"| Resistor["220 Ω series resistor"]
  Resistor -->|"Gate"| Switch["N-channel MOSFET"]
  Resistor ---|"Gate side through 10 kΩ"| Ground
  Rail -->|"+ lead"| Motor["DC coin motor"]
  Motor -->|"− lead to drain"| Switch
  Switch ---|"Source"| Ground
  Rail ---|"Cathode (striped end)"| Diode["1N5819 flyback diode"]
  Diode ---|"Anode to drain"| Switch
  linkStyle 0,1,2,8 stroke:#a83227,stroke-width:2px
  linkStyle 3,4,7,10 stroke:#35465a,stroke-width:2px
  linkStyle 5,6 stroke:#067083,stroke-width:2px
```

Add one 10k pulldown from each MOSFET gate to GND. Add one 1N5819 diode across
each motor with the cathode on the 5 V side and the anode on the MOSFET drain
side.
