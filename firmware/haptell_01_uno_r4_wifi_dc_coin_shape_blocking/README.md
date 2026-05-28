# Haptell 01 DC Shape-Only Blocking Firmware

This beginner-friendly firmware is for the Arduino UNO R4 WiFi + DC coin motor
hardware path.

It supports only custom `shape` playback from the Haptell Shape Designer.
General demo commands such as `pulse`, `double`, and `ramp` are intentionally
removed to keep the sketch easy to read.

## Device ID

```text
haptell-01-dc-shape
```

Use this exact target in UDP commands. This firmware does not accept `all`,
because a long blocking shape could accidentally start on multiple devices.

## Command

```text
haptell-01-dc-shape shape duration=15000 points=0:80,500:180,12000:80,15000:0
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

During playback, this sketch is busy generating the shape and does not read new
UDP packets. The web tool shows a busy warning for the duration of the sent
shape after Node.js confirms that the UDP packet was sent.

## Serial Plotter Debug View

During shape playback the sketch prints the actual PWM value sent to the DC
motor driver:

```text
pwm:128
```

Open Arduino Serial Plotter at `115200` baud and send a shape command. The
`pwm` curve shows the currently playing envelope as sampled by the firmware.
The firmware updates PWM every `10 ms`, so each plotted sample is approximately
one playback update step.

## Compile

```powershell
arduino-cli compile --fqbn arduino:renesas_uno:unor4wifi firmware/haptell_01_uno_r4_wifi_dc_coin_shape_blocking
```
