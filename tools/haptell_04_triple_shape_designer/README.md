# Haptell 04 Triple Shape Designer

This local Node.js web tool designs custom amplitude envelopes for the
`haptell-04` three-motor DC vibration device.

It follows the focused Shape Designer workflow, but each point has three
independent motor intensities on the same timeline.

## Start

From the repository root:

```powershell
node tools/haptell_04_triple_shape_designer/server.js
```

Then open:

```text
http://127.0.0.1:8083
```

No npm packages are required.

Optional:

```powershell
$env:HAPTELL_04_WEB_HOST = "127.0.0.1"
$env:HAPTELL_04_WEB_PORT = "8083"
node tools/haptell_04_triple_shape_designer/server.js
```

## Supported Firmware

Use this firmware:

```text
firmware/haptell_04_uno_r4_wifi_triple_dc_shape_blocking/
```

The target ID is:

```text
haptell-04-triple-dc-shape
```

## What the UI Does

- Draws three motor amplitude envelopes on one graph.
- Uses a separate color for each motor.
- Keeps all motors on one shared timeline.
- Shows point numbers on graph markers.
- Uses a compact point table with `time`, `M1`, `M2`, and `M3` columns.
- Supports graph zooming and horizontal panning.
- Sends a compact UDP `shape` command.
- Shows the outgoing command and structured data array.
- Saves and loads JSON pattern files.
- Shows a busy warning after a successful UDP send because the matching
  firmware is blocking during playback.

## Pattern Limits

- maximum duration: `15000 ms`
- maximum points: `30`
- motor intensity: `0..255`
- first point time is always `0`
- final point time is always `duration`
- final point motor intensities are always `0,0,0`

## UDP Command

```text
haptell-04-triple-dc-shape shape duration=<duration_ms> points=<time:m1:m2:m3,time:m1:m2:m3,...>
```

Example:

```text
haptell-04-triple-dc-shape shape duration=3000 points=0:0:0:0,500:180:60:0,2200:80:180:140,3000:0:0:0
```

Each point is:

```text
timeMs:motor1Intensity:motor2Intensity:motor3Intensity
```

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

## Blocking Firmware Behavior

The matching firmware is intentionally beginner-friendly and blocking. While a
shape is playing, it cannot receive another UDP packet. The `stop` command only
works while the firmware is idle.

## Troubleshooting

If the web UI reports that UDP was sent but the device does not react:

- confirm the Arduino Serial Monitor shows the expected IP address
- confirm the web UI uses that IP address
- confirm the target is `haptell-04-triple-dc-shape`
- confirm the firmware is listening on UDP port `4444`
- confirm the final point has all motor intensities at `0`
- check that the board is not still busy playing a previous blocking shape
- confirm all three MOSFET driver stages share ground with the Arduino
