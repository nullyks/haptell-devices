# Haptell-07 Dual Peltier Firmware

| Channel | Arduino UNO R4 WiFi | Actuator |
| --- | --- | --- |
| 1 | D3 PWM | Peltier 1 through IRLZ44N 1 |
| 2 | D5 PWM | Peltier 2 through IRLZ44N 2 |

Copy `secrets.example.h` to `secrets.h` and fill in the local WiFi credentials.
Open the matching sketch in Arduino IDE, select **Arduino UNO R4 WiFi** and upload.
For a local compile, run this command from the repository root.

```powershell
arduino-cli compile --fqbn arduino:renesas_uno:unor4wifi firmware/haptell_07_uno_r4_wifi_dual_peltier_shape
```

Serial Monitor at 115200 baud prints the device IP after UDP is ready. Device ID
`haptell-07-dual-peltier-shape` listens on UDP port **4444**.

Both outputs start at zero. The non-blocking player updates the PWM values
about every 10 ms. A valid shape replaces playback. Stop, completion, and a
detected WiFi disconnect turn both outputs off. Reconnecting leaves the outputs
off until a new shape arrives.

[Connection diagram](../../schematics/haptell-07-dual-peltier/diagram.md) ·
[Editor and protocol](../../docs/haptell-07-dual-peltier-shape-designer.md)
