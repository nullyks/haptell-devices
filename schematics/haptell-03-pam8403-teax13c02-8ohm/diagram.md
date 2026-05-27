# Haptell 03 Wiring Diagram

```mermaid
flowchart LR
  Battery["1S LiPo or USB supply"] --> Regulator["5 V rail"]
  Regulator --> Arduino["Arduino UNO R4 WiFi"]
  Regulator --> Amplifier["PAM8403 amplifier module"]
  Arduino -- "A0 / DAC signal" --> Amplifier
  Arduino -- "GND" --- Amplifier
  Amplifier -- "L+" --> Exciter["TEAX13C02-8/RH exciter"]
  Amplifier -- "L-" --> Exciter
```

Signal and power summary:

```text
Arduino A0 / DAC -> PAM8403 L-IN
Arduino GND -> PAM8403 GND
5 V rail -> Arduino USB-C 5 V input and PAM8403 VCC
PAM8403 L+ / L- -> exciter leads
```

The PAM8403 output is bridged. Neither `L+` nor `L-` is ground.
