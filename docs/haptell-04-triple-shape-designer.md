# Haptell 04 Triple Shape Designer

`haptell-04` is a three-motor DC vibration prototype. It is similar to
haptell-01, but it has three independently controlled MOSFET-switched DC motor
channels.

The matching Shape Designer controls all three motor envelopes on the same
timeline.

## Hardware Path

- Arduino UNO R4 WiFi
- Three small DC vibration motors
- Three low-side MOSFET driver stages
- One flyback diode per motor
- LiPo Rider Plus 5 V portable power path

Default PWM pins:

| Motor | Arduino pin |
| --- | --- |
| Motor 1 | `D9` |
| Motor 2 | `D10` |
| Motor 3 | `D11` |

## Start the Tool

From the repository root:

```powershell
node tools/haptell_04_triple_shape_designer/server.js
```

Then open:

```text
http://127.0.0.1:8083
```

No npm packages are required.

## Firmware

Use:

```text
firmware/haptell_04_uno_r4_wifi_triple_dc_shape_blocking/
```

The UDP target is:

```text
haptell-04-triple-dc-shape
```

## Command Format

```text
haptell-04-triple-dc-shape shape duration=<duration_ms> points=<time:m1:m2:m3,time:m1:m2:m3,...>
```

Example:

```text
haptell-04-triple-dc-shape shape duration=3000 points=0:0:0:0,500:180:60:0,2200:80:180:140,3000:0:0:0
```

Each point contains:

- `time`: milliseconds from the start of the shape
- `m1`: motor 1 intensity, `0..255`
- `m2`: motor 2 intensity, `0..255`
- `m3`: motor 3 intensity, `0..255`

The firmware linearly interpolates each motor independently between points.

## Designer Layout

The graph shows all three motor envelopes in one panel:

- Motor 1: blue
- Motor 2: green
- Motor 3: red

The table uses one row per time point:

```text
# | time | M1 | M2 | M3 | Remove
```

This keeps the shared timeline readable while still giving each motor its own
editable intensity column.

## Pattern Rules

- duration: `100..15000 ms` in the web UI
- points: `2..30`
- each motor intensity: `0..255`
- first point time is always `0 ms`
- final point time is always equal to `duration`
- final point intensities are always `0,0,0`
- point times must increase

## JSON Format

```json
{
  "schema": "haptell-triple-dc-shape-pattern/v1",
  "durationMs": 3000,
  "points": [
    { "timeMs": 0, "motor1": 0, "motor2": 0, "motor3": 0 },
    { "timeMs": 500, "motor1": 180, "motor2": 60, "motor3": 0 },
    { "timeMs": 2200, "motor1": 80, "motor2": 180, "motor3": 140 },
    { "timeMs": 3000, "motor1": 0, "motor2": 0, "motor3": 0 }
  ]
}
```

Device IP address, UDP port, and target firmware are not saved in the JSON file.

## Blocking Behavior

The haptell-04 firmware is shape-only and blocking. While a shape is playing,
the Arduino does not read new UDP packets. The `stop` command only works while
the firmware is idle.

The web UI shows a busy warning for the duration of the shape after Node.js
confirms that it sent the UDP packet.
