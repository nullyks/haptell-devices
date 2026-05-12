# Hardware Notes

## First Prototype

The first device uses an Arduino UNO R4 WiFi and a small 3-5 V DC coin vibration motor rated at 67 mA. The motor is driven by a low-side N-channel MOSFET switch controlled from Arduino PWM pin `D9`.

The motor must not be connected directly to a GPIO pin. The Arduino pin only drives the MOSFET gate.

## Power

For the first bench test, a 9 V battery may be connected to the Arduino UNO R4 WiFi barrel jack or `VIN`. This is only a short proof-of-concept power source. Small rectangular 9 V batteries have limited current capability and are not recommended for the final wireless artifact.

The intended portable direction is:

```text
1S LiPo battery -> LiPo Rider Plus charger/booster -> regulated 5 V rail -> Arduino and motor driver
```

Use a common ground between the Arduino and the motor driver circuit.

## MOSFET Choice

The available IRF3205 can be used for the first Arduino UNO R4 WiFi test because the UNO R4 uses 5 V I/O logic and the motor current is small.

For future ESP32 or ESP8266 prototypes, use a logic-level MOSFET that switches well with a 3.3 V gate signal. Examples include AO3400-class small MOSFETs or larger logic-level parts such as IRLZ44N/IRLZ34N.

## Flyback Diode

Place the 1N5819 diode across the motor:

- Cathode, marked end: motor positive / 5 V
- Anode: motor negative / MOSFET drain

This reduces voltage spikes when the motor is switched off.

## LRA Motors

The Vybronics LRA parts should not be treated like the DC coin motor.

- VG2230001H: 2 Vrms, 70 Hz LRA/voice-coil style actuator
- VG1040003D: 2.5 Vrms, 170 Hz LRA

These parts should be driven with a suitable haptic driver IC such as DRV2605L/compatible modules, a suitable audio amplifier approach, or another circuit that can generate the required AC drive waveform.

