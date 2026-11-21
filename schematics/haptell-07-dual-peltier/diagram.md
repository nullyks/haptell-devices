# Haptell-07 dual Peltier connection diagram

Draft derived from Haptell-06. Each box represents one physical component.
The Arduino has a separate power supply.

```mermaid
flowchart TB
  battery["LiPo battery (3.7 V)"]
  rider["LiPo Rider Plus"]
  arduino["Arduino UNO R4 WiFi (separate power)"]
  tec1["Peltier 1 (SP1848-27145)"]
  tec2["Peltier 2 (SP1848-27145)"]
  q1["MOSFET 1 (IRLZ44N)"]
  q2["MOSFET 2 (IRLZ44N)"]

  usb["Separate USB power"] -->|"USB-C"| arduino
  battery -->|"Battery plug to BAT"| rider
  rider -->|"GND to GND"| arduino
  rider -->|"5 V to positive lead (+)"| tec1
  rider -->|"5 V to positive lead (+)"| tec2
  arduino -->|"D3 PWM to Gate (G)"| q1
  arduino -->|"D5 PWM to Gate (G)"| q2
  tec1 -->|"Negative lead (-) to Drain (D)"| q1
  tec2 -->|"Negative lead (-) to Drain (D)"| q2
  rider -->|"GND to Source (S)"| q1
  rider -->|"GND to Source (S)"| q2
  linkStyle 0,1,3,4 stroke:#a83227,stroke-width:2px
  linkStyle 2,9,10 stroke:#35465a,stroke-width:2px
  linkStyle 5,6 stroke:#067083,stroke-width:2px
```

Both MOSFET sources and Arduino GND connect to Rider Plus GND. The draft
copies the direct gate wiring and component models from Haptell-06 for both
channels. D3 and D5 are independent PWM outputs on the [UNO R4 WiFi](https://docs.arduino.cc/tutorials/uno-r4-wifi/cheat-sheet/#pwm).

The shared 5 V rail is a design assumption. The [Rider Plus](https://wiki.seeedstudio.com/Lipo-Rider-Plus/)
is rated for up to 2.4 A at 5 V. Measure the combined on-state current with
both Peltier modules driven before confirming the shared supply.
