# Haptell-06 Peltier PWM firmware

- Arduino UNO R4 WiFi; D3 PWM -> IRLZ44N gate through a resistor.
- FTVOGUE SP1848-27145, powered from LiPo Rider Plus 5 V.
- Device ID `haptell-06-peltier-shape`; UDP port **4445**.
- Shape duration 500–60000 ms in 500 ms steps, 2–30 points, PWM 0–255.
- No temperature sensor or temperature control in this version.

Copy `secrets.example.h` to `secrets.h` and enter local WiFi credentials.
Open the matching `.ino` in Arduino IDE and select **Arduino UNO R4 WiFi**,
or compile from the repository root:

```powershell
arduino-cli compile --fqbn arduino:renesas_uno:unor4wifi firmware/haptell_06_uno_r4_wifi_peltier_shape
```

Only built-in WiFiS3/WiFiUdp libraries are required. Serial Monitor at 115200
baud reports the device IP and UDP port after connection.

Playback uses `millis()` and linear interpolation with a nominal 10 ms update
interval. A valid new shape replaces the active one; `stop` turns D3 off.
Output also turns off at completion and when WiFi disconnection is detected
(checked every second). Reconnection attempts happen with output off and
never resume an interrupted shape. Network library calls can add latency;
this is not a hardware thermal cutoff.

Malformed, oversized, other-target and `all` commands are ignored without
changing the active pattern. Parsing validates a temporary candidate before
installing it. The last point must equal the duration and have PWM zero.

[Wiring](../../schematics/haptell-06-peltier/README.md) ·
[Editor and protocol](../../docs/haptell-06-peltier-shape-designer.md)
