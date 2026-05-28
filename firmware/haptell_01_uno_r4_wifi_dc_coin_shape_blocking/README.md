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
motor driver, plus fixed minimum and maximum reference traces:

```text
pwm:128  min:0  max:255
```

Open Arduino Serial Plotter at `115200` baud and send a shape command. The
`pwm` curve shows the currently playing envelope. The `min` and `max` traces
keep the Y scale pinned to the full PWM range, `0..255`.

Arduino Serial Plotter does not accept real timestamp values for the X axis; it
plots incoming samples from left to right. To make the full shape easier to see,
the firmware sends about `240` plotter samples per shape while still updating
the motor PWM every `10 ms`. For a `15000 ms` shape this means the motor is
still updated every `10 ms`, but the plotter receives one debug sample roughly
every `63 ms`. This is intended to fit a full maximum-length shape in a FullHD
fullscreen Arduino Serial Plotter window.

When Serial Plotter output is enabled, the sketch suppresses the raw UDP command
line during playback so command numbers such as `15000` do not disturb the
plotter's Y scale.

## Compile

Copy `secrets.example.h` to `secrets.h` in this folder and fill in the local
WiFi credentials before uploading.

```powershell
arduino-cli compile --fqbn arduino:renesas_uno:unor4wifi firmware/haptell_01_uno_r4_wifi_dc_coin_shape_blocking
```
