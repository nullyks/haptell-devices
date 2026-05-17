# haptell-02 Simple Blocking Firmware Example

This is a beginner-friendly firmware example for the same haptell-02 hardware:

- Arduino UNO R4 WiFi
- Mavaol DRV2605L haptic motor controller module
- Vybronics VG1040003D LRA
- LiPo Rider Plus portable 5 V power path

It uses the same UDP command idea as the main haptell-02 firmware, but the playback code is intentionally simpler and blocking. While a pattern is playing, the Arduino waits with `delay()` and does not read new UDP packets.

## Setup

1. Install/select the Arduino UNO R4 WiFi board package.
2. Install the `Adafruit DRV2605 Library`.
3. Copy `secrets.example.h` to `secrets.h`.
4. Add WiFi credentials to `secrets.h`.
5. Open `haptell_02_uno_r4_wifi_drv2605l_lra_simple_blocking.ino`.
6. Upload to Arduino UNO R4 WiFi.

## Commands

```text
haptell-02 pulse
haptell-02 double
haptell-02 ramp
haptell-02 custom
haptell-02 stop
```

The `pulse`, `double`, and `ramp` examples use built-in DRV2605L effect numbers. The `custom` example uses DRV2605L realtime playback mode and manually sends drive values to build a simple custom vibration shape.

## Why This Exists

Use this sketch when learning or testing the DRV2605L wiring. Use the main `haptell_02_uno_r4_wifi_drv2605l_lra` firmware when the device needs to stay responsive while a pattern is playing.
