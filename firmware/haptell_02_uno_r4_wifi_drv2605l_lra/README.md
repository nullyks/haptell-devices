# haptell-02 Arduino UNO R4 WiFi + DRV2605L LRA Firmware

This firmware controls a Vybronics VG1040003D LRA actuator through a Mavaol DRV2605L haptic motor controller module. It listens for UDP commands on port `4444` and maps the shared Haptell pattern commands to DRV2605L effect playback.

For a beginner-friendly explanation of the firmware structure, logic, and C++ syntax, see `CODE_WALKTHROUGH.md`.

## Setup

1. Install the Arduino IDE.
2. Install/select the Arduino UNO R4 WiFi board package.
3. Install the `Adafruit DRV2605 Library` from Arduino Library Manager.
4. Copy `secrets.example.h` to `secrets.h`.
5. Add WiFi credentials to `secrets.h`.
6. Open `haptell_02_uno_r4_wifi_drv2605l_lra.ino`.
7. Upload to Arduino UNO R4 WiFi.

## Wiring Summary

- LiPo battery -> LiPo Rider Plus battery connector
- LiPo Rider Plus 5V output -> Arduino USB-C 5V power input and DRV2605L VIN/VCC
- LiPo Rider Plus GND -> Arduino GND and DRV2605L GND
- Arduino SDA -> DRV2605L SDA
- Arduino SCL -> DRV2605L SCL
- DRV2605L OUT+ -> VG1040003D lead 1
- DRV2605L OUT- -> VG1040003D lead 2

## Supported Patterns

- `pulse`
- `double`
- `ramp`
- `shape`
- `stop`

Example:

```text
haptell-02 pulse intensity=180 duration=800
```

Custom realtime envelope example:

```text
haptell-02 shape duration=1600 points=0:0,100:180,700:180,1200:60,1600:0
```

The `shape` command accepts up to 24 sorted `time:intensity` points over a
maximum duration of 5000 ms. The firmware interpolates between points and sends
unsigned realtime drive values to the DRV2605L.

The current pattern mappings are first-pass tuning values. The exact feel should be adjusted after testing with the real VG1040003D actuator and DRV2605L module.

## Code Explanation

- `CODE_WALKTHROUGH.md`: beginner-friendly walkthrough of the sketch structure, command parsing, DRV2605L setup, effect playback logic, and important C++/Arduino syntax.
