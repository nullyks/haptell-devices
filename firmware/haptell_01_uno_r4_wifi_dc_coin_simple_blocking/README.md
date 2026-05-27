# haptell-01 Simple Blocking DC Coin Motor Firmware

This is the beginner-friendly blocking version of the `haptell-01` Arduino UNO
R4 WiFi firmware. It uses the same MOSFET-driven DC coin motor hardware as the
main `haptell-01` firmware, but pattern playback uses `delay()` and blocking
loops so the timing is easier to read.

For a line-by-line explanation, see `CODE_WALKTHROUGH.md`.

## Setup

1. Install the Arduino IDE.
2. Install/select the Arduino UNO R4 WiFi board package.
3. Copy `secrets.example.h` to `secrets.h`.
4. Add WiFi credentials to `secrets.h`.
5. Open `haptell_01_uno_r4_wifi_dc_coin_simple_blocking.ino`.
6. Upload to Arduino UNO R4 WiFi.

## Wiring Summary

Use the same wiring as the main DC motor firmware:

- Arduino `D9` -> 220 ohm resistor -> MOSFET gate
- MOSFET gate -> 10k resistor -> GND
- MOSFET source -> GND
- MOSFET drain -> motor negative lead
- Motor positive lead -> Arduino 5V rail
- 1N5819 diode across the motor, cathode to 5V and anode to MOSFET drain
- Arduino GND and motor driver GND must be common

## Supported Commands

```text
haptell-01 pulse intensity=180 duration=800
haptell-01 double intensity=220 gap=120
haptell-01 ramp from=60 to=255 duration=1200
haptell-01 shape duration=1600 points=0:0,100:180,700:180,1200:60,1600:0
haptell-01 stop
```

The `shape` command uses the same Shape Designer format as the LRA firmware, but
for this DC motor firmware the intensity value is a PWM value from `0` to `255`.

## Blocking Behavior

While `pulse`, `double`, `ramp`, or `shape` is playing, this sketch does not
read new UDP packets. A `stop` command can only be handled after the current
blocking playback function returns.

Use the main `haptell_01_uno_r4_wifi_dc_coin` firmware when responsive
interruption is needed.
