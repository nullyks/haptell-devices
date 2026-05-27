# Haptell 02 DRV2605L LRA Shape-Only Blocking Firmware

This beginner-friendly firmware is for the Arduino UNO R4 WiFi + DRV2605L +
VG1040003D LRA hardware path.

It supports only custom `shape` playback from the Haptell Shape Designer. The
shape is played with DRV2605L realtime playback mode.

## Device ID

```text
haptell-02-drv2605l-shape
```

Use this exact target in UDP commands. This firmware does not accept `all`, so
it can share a WiFi network with the PAM8403 haptell-02 shape firmware without
both devices starting accidentally.

## Command

```text
haptell-02-drv2605l-shape shape duration=15000 points=0:80,500:180,12000:80,15000:0
```

Rules:

- maximum duration: `15000 ms`
- maximum points: `30`
- first point time must be `0`
- first point intensity may be any value from `0` to `255`
- last point time must equal `duration`
- last point intensity must be `0`
- point times must increase

## Blocking Behavior

During playback, this sketch does not read new UDP packets. A `stop` command is
useful while idle, but it cannot interrupt an active blocking shape.

## Compile

```powershell
arduino-cli compile --fqbn arduino:renesas_uno:unor4wifi firmware/haptell_02_uno_r4_wifi_drv2605l_lra_shape_blocking
```
