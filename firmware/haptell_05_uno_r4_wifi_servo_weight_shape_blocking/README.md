# Haptell 05 Servo Shape-Only Blocking Firmware

This beginner-friendly firmware is for an Arduino UNO R4 WiFi commanding a
270 degree hobby servo with an attached offset weight.

The servo must use its own suitable `4.8-6.8 V` power supply. Do not power this
servo from the Arduino 5 V pin. Connect the servo supply ground and Arduino
ground together with a short common ground wire.

## Device ID

```text
haptell-05-servo-shape
```

The primary command may be sent directly to the device IP address without a
target:

```text
servo-shape duration=800 points=0:135:linear,120:175:easeOut,260:95:easeInOut,800:135:easeOut
```

The firmware also accepts the addressed form:

```text
haptell-05-servo-shape servo-shape duration=800 points=0:135:linear,120:175:easeOut,260:95:easeInOut,800:135:easeOut
```

This firmware does not accept `all`, because long blocking motion patterns
should not accidentally start on multiple devices.

## Servo Pin and Calibration

| Signal | Value |
| --- | --- |
| Arduino servo signal pin | `D9` |
| Pulse at `0 deg` | `500 us` |
| Pulse at neutral `135 deg` | `1500 us` |
| Pulse at `270 deg` | `2500 us` |

## Command

```text
servo-shape duration=800 points=0:135:linear,120:175:easeOut,260:95:easeInOut,800:135:easeOut
```

Each point is:

```text
timeMs:angleDeg:easing
```

Rules:

- maximum duration: `15000 ms`
- maximum points: `30`
- first point time must be `0`
- last point time must equal `duration`
- angle may be `0..270`
- point times must increase
- supported easing values: `linear`, `easeIn`, `easeOut`, `easeInOut`

The first point's easing value is stored for readability. Each later point's
easing value controls the segment from the previous point to that point.

## Blocking Behavior

During playback, this sketch is busy generating the shape and does not read new
UDP packets. The matching web designer shows a busy warning for the duration of
the sent shape after Node.js confirms that the UDP packet was sent.

The `stop` command works while the firmware is idle and returns the servo to
neutral:

```text
stop
haptell-05-servo-shape stop
```

## Serial Plotter Debug View

During shape playback the sketch prints the command angle, pulse width, neutral
reference, and min/max reference traces:

```text
angle:150  pulse:1611  neutral:135  min:0  max:270
```

Open Arduino Serial Plotter at `115200` baud and send a shape command. The
`angle` curve shows the commanded servo path.

## Compile

Copy `secrets.example.h` to `secrets.h` in this folder and fill in the local
WiFi credentials before uploading.

```powershell
arduino-cli compile --fqbn arduino:renesas_uno:unor4wifi firmware/haptell_05_uno_r4_wifi_servo_weight_shape_blocking
```
