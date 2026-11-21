# Haptell-06 connection diagram

Each box is one physical component. Read each connection label from the
starting box to the destination box.

```mermaid
flowchart TB
  battery["LiPo battery (3.7 V / 2000 mAh)"]
  charger["LiPo Rider Plus charger / 5 V supply"]
  arduino["Arduino UNO R4 WiFi"]
  peltier["Peltier module (SP1848-27145)"]
  mosfet["MOSFET (IRLZ44N)"]

  usb["Separate USB power"] -->|"USB-C"| arduino
  battery -->|"Battery plug to BAT input"| charger
  charger -->|"GND to GND"| arduino
  charger -->|"5 V to positive lead (+)"| peltier
  charger -->|"GND to Source (S)"| mosfet
  arduino -->|"D3 (PWM) directly to Gate (G)"| mosfet
  peltier -->|"Negative lead (-) to Drain (D)"| mosfet
  linkStyle 0,1,3 stroke:#a83227,stroke-width:2px
  linkStyle 2,4 stroke:#35465a,stroke-width:2px
  linkStyle 5 stroke:#067083,stroke-width:2px
```

Arduino has a separate power supply. Arduino GND, LiPo Rider Plus GND and the
MOSFET source share a common ground.
The Peltier module's hot side contacts the heatsink through a thermal interface.
See [hardware notes](README.md) for the component list and wiring details.
