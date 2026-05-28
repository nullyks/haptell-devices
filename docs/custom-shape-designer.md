# Custom Shape Designer

The Haptell Shape Designer is a focused browser tool for creating user-defined
amplitude envelopes and sending them to beginner-friendly shape-only blocking
firmware.

It is separate from the general UDP sender because it removes demo commands
such as `pulse`, `double`, and `ramp`. The whole workflow is about drawing one
custom haptic pattern, saving it as JSON when needed, and sending it as a
single UDP `shape` command.

## Start the Tool

From the repository root:

```powershell
node tools/haptell_shape_designer/server.js
```

Then open:

```text
http://127.0.0.1:8082
```

No npm packages are required. The server uses only Node.js built-in modules.

Optional environment variables:

```powershell
$env:HAPTELL_SHAPE_WEB_HOST = "127.0.0.1"
$env:HAPTELL_SHAPE_WEB_PORT = "8082"
node tools/haptell_shape_designer/server.js
```

## User Interface

The first screen is the working editor:

- device IP address
- UDP port, default `4444`
- target firmware selector
- large amplitude envelope graph
- graph zoom controls
- point table
- JSON save/load controls
- command preview
- structured data preview

The graph and the point table both show point numbers. This is useful when a
pattern has many points and the user needs to match a graph marker with the
numeric row.

The point table is intentionally compact so more rows are visible at once. For
long 30-point patterns, the table can still scroll.

The graph can zoom horizontally. Use the `+`, `-`, and `Fit` controls above
the graph, or scroll the mouse wheel over the graph. When the graph is zoomed
in, the range slider pans through the visible part of the pattern.

## Supported Shape-Only Firmware

| Hardware path | Firmware folder | UDP target |
| --- | --- | --- |
| DC coin motor + MOSFET | `firmware/haptell_01_uno_r4_wifi_dc_coin_shape_blocking/` | `haptell-01-dc-shape` |
| DRV2605L + VG1040003D LRA | `firmware/haptell_02_uno_r4_wifi_drv2605l_lra_shape_blocking/` | `haptell-02-drv2605l-shape` |
| PAM8403 + VG2230001H 70 Hz actuator | `firmware/haptell_02_uno_r4_wifi_pam8403_vg2230001h_shape_blocking/` | `haptell-02-pam8403-shape` |

The target IDs are intentionally unique. This lets the DRV2605L and PAM8403
haptell-02 variants share the same WiFi network without both responding to the
same command.

The shape-only firmware variants do not accept `all`. A shape can last up to
15 seconds and playback is blocking, so accidental multi-device starts would be
awkward to stop.

## Shape Command

The web tool sends:

```text
<target> shape duration=<duration_ms> points=<time:intensity,time:intensity,...>
```

Example:

```text
haptell-02-drv2605l-shape shape duration=15000 points=0:80,500:180,12000:80,15000:0
```

## Pattern Rules

- `duration`: `100..15000 ms` in the web UI
- `points`: `2..30`
- `time`: milliseconds from the start of the pattern
- `intensity`: normalized output value from `0` to `255`
- first point time is always `0 ms`
- first point intensity may be any value from `0` to `255`
- final point time is always equal to `duration`
- final point intensity is always `0`
- point times must increase

The firmware linearly interpolates intensity between adjacent points. For
example:

```text
0:60,1000:180
```

means that the drive value starts at `60` and rises linearly to `180` over the
first second.

## Editing Points

The graph marker and the point table row share the same point number.

Editable values:

- first point: intensity only
- middle points: time and intensity
- final point: fixed time and fixed intensity `0`

The final point is fixed because the motor or actuator should always be driven
back to zero when the pattern ends.

Zooming changes only the visible time window. It does not change the saved
points, the command preview, or the JSON file.

## JSON Save and Load

The JSON file stores only the pattern. It does not store:

- device IP address
- UDP port
- selected target firmware

On browsers that support the File System Access API, `Save JSON` opens a save
dialog so the user can choose the filename and folder. `Load JSON` opens an
open-file dialog for selecting an existing pattern file.

If the browser does not support the File System Access API, the tool falls back
to normal browser behavior:

- `Save JSON`: starts a regular download
- `Load JSON`: uses a normal file input

The fallback still works, but the browser may decide the download folder.

## JSON Format

```json
{
  "schema": "haptell-shape-pattern/v1",
  "durationMs": 3000,
  "points": [
    { "timeMs": 0, "intensity": 60 },
    { "timeMs": 400, "intensity": 180 },
    { "timeMs": 2200, "intensity": 120 },
    { "timeMs": 3000, "intensity": 0 }
  ]
}
```

The loader validates:

- JSON parses correctly
- `durationMs` is within range
- there are `2..30` points
- every point has numeric `timeMs` and `intensity`
- point times are unique
- first point starts at `0 ms`
- final point is at `durationMs`
- final intensity is `0`

## Send Confirmation and Busy Warning

When the user clicks `Send Shape`, the browser sends the command to the local
Node.js server. The Node.js server sends the UDP packet and returns:

- `ok`
- sent command
- destination IP and port
- number of bytes sent
- send timestamp

After Node.js confirms that it sent the UDP packet, the web UI shows a busy
warning for the duration of the pattern.

Important: UDP send confirmation means the packet was handed to the operating
system for sending. It is not a firmware-level acknowledgement and does not
prove that the Arduino received or played the pattern.

For the current closed-subnet prototype this is acceptable. A later production
protocol could add explicit acknowledgements from the device.

## Blocking Firmware Behavior

These firmware variants are intentionally beginner-friendly and blocking.

While a shape is playing:

- the Arduino stays inside the playback function
- it does not call `udp.parsePacket()`
- it cannot receive a new `shape` or `stop` command

The `stop` command is only useful while the firmware is idle. It cannot
interrupt an active blocking shape.

This is why the UI warns the user that the firmware is likely busy for the
duration of the sent pattern.

## Hardware-Specific Meaning of Intensity

| Hardware path | Meaning of `intensity` |
| --- | --- |
| DC coin motor + MOSFET | PWM value on Arduino `D9`, `0..255` |
| DRV2605L + VG1040003D LRA | DRV2605L realtime playback value, `0..255` |
| PAM8403 + VG2230001H | amplitude envelope for a fixed 70 Hz sine carrier |

The same shape can be sent to all three firmware styles, but the physical feel
will differ because each actuator and driver path behaves differently.

## Compile Shape-Only Firmware

```powershell
arduino-cli compile --fqbn arduino:renesas_uno:unor4wifi firmware/haptell_01_uno_r4_wifi_dc_coin_shape_blocking
arduino-cli compile --fqbn arduino:renesas_uno:unor4wifi firmware/haptell_02_uno_r4_wifi_drv2605l_lra_shape_blocking
arduino-cli compile --fqbn arduino:renesas_uno:unor4wifi firmware/haptell_02_uno_r4_wifi_pam8403_vg2230001h_shape_blocking
```

Each sketch needs a local `secrets.h` copied from `secrets.example.h`.

Do not commit `secrets.h`.

## Troubleshooting

If the web UI reports that UDP was sent but the device does not react:

- confirm the Arduino Serial Monitor shows the expected IP address
- confirm the web UI uses that IP address
- confirm the target firmware matches the uploaded sketch
- confirm the sketch is listening on UDP port `4444`
- confirm the pattern's final point has intensity `0`
- check that the board is not still busy playing a previous blocking shape
- for DRV2605L, confirm the I2C module is detected at startup
- for PAM8403, confirm the actuator is connected across the amplifier's
  bridged output pins, not to ground
