# Haptell 05 Servo Shape Designer

The haptell-05 workflow controls a 270 degree hobby servo with an attached
offset weight. The pattern is an angle over time rather than a vibration
intensity envelope.

## Start the Designer

From the repository root:

```powershell
node tools/haptell_05_servo_shape_designer/server.js
```

Then open:

```text
http://127.0.0.1:8084
```

No npm packages are required.

## Firmware

Use:

```text
firmware/haptell_05_uno_r4_wifi_servo_weight_shape_blocking/
```

The firmware is intentionally blocking. While a pattern is playing, the Arduino
does not read another UDP packet.

## Command Format

The designer sends:

```text
servo-shape duration=800 points=0:135:linear,120:175:easeOut,260:95:easeInOut,800:135:easeOut
```

Each point is:

```text
timeMs:angleDeg:easing
```

The first point's easing value is stored for consistency. Each later point's
easing value controls motion from the previous point to that point.

Supported easing values:

- `linear`
- `easeIn`
- `easeOut`
- `easeInOut`

## Servo Calibration

The tool and firmware use this mapping:

| Angle | Pulse |
| --- | --- |
| `0 deg` | `500 us` |
| `135 deg` | `1500 us` |
| `270 deg` | `2500 us` |

The point table calculates `pulse us` from the angle so the outgoing servo
command can be checked against the servo specification.

## Visual Editing

The editor includes:

- one large angle-vs-time graph
- a green `135 deg` neutral line
- a shaded safe range band, default `20..250 deg`
- draggable keyframes
- a table with `time`, `angle`, `pulse us`, and `easing`
- command preview
- JSON save/load
- speed warnings
- presets: `Nudge`, `Swing`, `Kick`, `Recoil`, `Wobble`
- a small servo horn preview animation

## Speed Warnings

The user-provided servo speed is:

```text
0.18 sec / 60 deg at 4.8 V
```

That is about `333 deg/s` with no load. The designer shows warnings near this
limit:

- amber above about `280 deg/s`
- red above about `333 deg/s`

The weighted horn can move more slowly than the no-load specification, so these
warnings are only a conservative first-pass check. Real tactile behavior should
be tuned on the physical prototype.

## JSON Format

```json
{
  "schema": "haptell-servo-shape-pattern/v1",
  "durationMs": 800,
  "servo": {
    "minAngleDeg": 0,
    "maxAngleDeg": 270,
    "neutralAngleDeg": 135,
    "minPulseUs": 500,
    "maxPulseUs": 2500,
    "safeMinAngleDeg": 20,
    "safeMaxAngleDeg": 250
  },
  "points": [
    { "timeMs": 0, "angleDeg": 135, "easing": "linear" },
    { "timeMs": 120, "angleDeg": 175, "easing": "easeOut" },
    { "timeMs": 260, "angleDeg": 95, "easing": "easeInOut" },
    { "timeMs": 800, "angleDeg": 135, "easing": "easeOut" }
  ]
}
```

Device IP address and UDP port are not saved in the JSON file.

## Hardware Notes

The servo has high stall current, up to about `2.7 A` at `6.8 V`. Use an
external servo supply sized for the load. Connect:

```text
Arduino D9 -> servo signal
external 4.8-6.8 V supply + -> servo V+
external supply GND -> servo GND
external supply GND -> Arduino GND
```

Do not power the servo from the Arduino 5 V pin.
