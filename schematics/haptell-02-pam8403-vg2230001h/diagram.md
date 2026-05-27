# Wiring Diagram

```mermaid
flowchart LR
  Battery["1S protected LiPo"] --> Rider["LiPo Rider Plus<br/>5 V boost output"]
  Rider -->|5 V USB-C power| Arduino["Arduino UNO R4 WiFi"]
  Rider -->|5 V| Amp["PAM8403 amplifier module"]
  Rider -->|GND| Arduino
  Rider -->|GND| Amp

  Arduino -->|"A0 / DAC<br/>70 Hz sine carrier<br/>AC-coupled input"| Amp
  Amp -->|"L+ / L- bridged output"| Actuator["Vybronics VG2230001H<br/>70 Hz, 2 Vrms"]
```

Notes:

- The actuator connects across one PAM8403 bridged output channel.
- Neither PAM8403 output pin is ground.
- Arduino `A0` is only a low-level input signal for the amplifier.
