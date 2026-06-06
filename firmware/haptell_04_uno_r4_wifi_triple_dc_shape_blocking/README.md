# Haptell 04 Triple DC Shape-Only Blocking Firmware

This beginner-friendly firmware is for an Arduino UNO R4 WiFi driving three
small DC vibration motors through three separate low-side MOSFET driver stages.

It supports only custom `shape` playback from the Haptell 04 Triple Shape
Designer. General demo commands such as `pulse`, `double`, and `ramp` are not
included so the sketch stays easy to read.

## Device ID

```text
haptell-04-triple-dc-shape
```

Use this exact target in UDP commands. This firmware does not accept `all`,
because a long blocking shape could accidentally start on multiple devices.

## Motor Pins

| Motor | Arduino PWM pin |
| --- | --- |
| Motor 1 | `D9` |
| Motor 2 | `D10` |
| Motor 3 | `D11` |

Each pin drives one MOSFET gate through its own gate resistor. Do not connect a
motor directly to an Arduino pin.

## Command

```text
haptell-04-triple-dc-shape shape duration=3000 points=0:0:0:0,500:180:60:0,2200:80:180:140,3000:0:0:0
```

Each point is:

```text
timeMs:motor1Intensity:motor2Intensity:motor3Intensity
```

Rules:

- maximum duration: `15000 ms`
- maximum points: `30`
- first point time must be `0`
- each motor intensity may be any value from `0` to `255`
- last point time must equal `duration`
- all last-point motor intensities must be `0`
- point times must increase

## Blocking Behavior

During playback, this sketch is busy generating the shape and does not read new
UDP packets. The web tool shows a busy warning for the duration of the sent
shape after Node.js confirms that the UDP packet was sent.

## Serial Plotter Debug View

During shape playback the sketch prints the actual PWM values sent to all three
motor driver pins, plus fixed minimum and maximum reference traces:

```text
m1:128  m2:64  m3:220  min:0  max:255
```

Open Arduino Serial Plotter at `115200` baud and send a shape command. The
`m1`, `m2`, and `m3` curves show the currently playing envelopes.

## Compile

Copy `secrets.example.h` to `secrets.h` in this folder and fill in the local
WiFi credentials before uploading.

```powershell
arduino-cli compile --fqbn arduino:renesas_uno:unor4wifi firmware/haptell_04_uno_r4_wifi_triple_dc_shape_blocking
```
