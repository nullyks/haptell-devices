# haptell-01 Arduino UNO R4 WiFi Firmware

This firmware drives a 3-5 V DC coin vibration motor through a low-side MOSFET driver. It listens for UDP commands on port `4444` and plays predefined haptic patterns.

For a beginner-friendly explanation of the firmware structure, logic, and C++ syntax, see `CODE_WALKTHROUGH.md`.

## Setup

1. Install the Arduino IDE.
2. Install/select the Arduino UNO R4 WiFi board package.
3. Copy `secrets.example.h` to `secrets.h`.
4. Add WiFi credentials to `secrets.h`.
5. Open `haptell_01_uno_r4_wifi_dc_coin.ino`.
6. Upload to Arduino UNO R4 WiFi.

## Wiring Summary

- Arduino `D9` -> 220 ohm resistor -> MOSFET gate
- MOSFET gate -> 10k resistor -> GND
- MOSFET source -> GND
- MOSFET drain -> motor negative lead
- Motor positive lead -> Arduino 5V rail
- 1N5819 diode across the motor, cathode to 5V and anode to MOSFET drain
- Arduino GND and motor driver GND must be common

## Supported Patterns

- `pulse`
- `double`
- `ramp`
- `stop`

See `../../docs/command-protocol.md`.

## Code Explanation

- `CODE_WALKTHROUGH.md`: beginner-friendly walkthrough of the sketch structure, command parsing, pattern playback logic, and important C++/Arduino syntax.
