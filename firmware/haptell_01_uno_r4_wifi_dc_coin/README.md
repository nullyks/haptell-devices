# haptell-01 Arduino UNO R4 WiFi Firmware

This is the main non-blocking firmware for the `haptell-01` DC coin motor
prototype. It drives a 3-5 V DC coin vibration motor through a low-side MOSFET
driver, listens for UDP commands on port `4444`, and plays predefined or custom
amplitude-envelope haptic patterns.

For a beginner-friendly explanation of the firmware structure, logic, and C++ syntax, see `CODE_WALKTHROUGH.md`.

For the simpler blocking version, see:

```text
../haptell_01_uno_r4_wifi_dc_coin_simple_blocking/
```

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
- `shape`
- `stop`

Shape Designer example:

```text
haptell-01 shape duration=1600 points=0:0,100:180,700:180,1200:60,1600:0
```

For the DC motor, `intensity` is the PWM value sent to `D9`, from `0` to `255`.

See `../../docs/command-protocol.md`.

## Code Explanation

- `CODE_WALKTHROUGH.md`: beginner-friendly walkthrough of the sketch structure, command parsing, pattern playback logic, and important C++/Arduino syntax.
