# Haptell Shape Designer

This local Node.js web tool designs amplitude-only haptic shapes for the
shape-only blocking firmware variants.

It intentionally does not include `pulse`, `double`, or `ramp` buttons. The
workflow is focused on drawing one custom envelope and sending it as a `shape`
command.

## Start

From the repository root:

```powershell
node tools/haptell_shape_designer/server.js
```

Then open:

```text
http://127.0.0.1:8082
```

No npm packages are required.

Optional:

```powershell
$env:HAPTELL_SHAPE_WEB_HOST = "127.0.0.1"
$env:HAPTELL_SHAPE_WEB_PORT = "8082"
node tools/haptell_shape_designer/server.js
```

## What the UI Does

- Draws a large amplitude envelope.
- Supports graph zooming and horizontal panning for longer patterns.
- Shows point numbers on both the graph and the point table.
- Shows a compact point table so more points are visible at once.
- Scales point times proportionally when the pattern duration is changed.
- Sends a compact UDP `shape` command.
- Shows the outgoing command and structured data array.
- Saves and loads JSON pattern files.
- Shows a busy warning after a successful UDP send because the matching
  firmware is blocking during playback.

## Supported Firmware Targets

- `haptell-01-dc-shape`
- `haptell-02-drv2605l-shape`
- `haptell-02-pam8403-shape`

Each target is unique so the DRV2605L and PAM8403 haptell-02 variants can be on
the same WiFi network.

## Pattern Limits

- maximum duration: `15000 ms`
- maximum points: `30`
- first point time is always `0`
- first point intensity is editable
- final point time is always `duration`
- final point intensity is always `0`

## Graph Zoom

Use `+`, `-`, and `Fit` above the graph to zoom the visible time range. The
range slider pans through the pattern when the graph is zoomed in. Scrolling
the mouse wheel over the graph also zooms around the cursor position.

## Duration Changes

The `duration ms` field is a plain numeric text field. Type the new duration
and press Enter or leave the field to apply it. Existing point times are scaled
proportionally, so changing `3000 ms` to `6000 ms` moves a point at `400 ms` to
`800 ms`.

## Adding Points

Use the `after` menu next to `Add Point` to choose the point after which the
new point will be inserted. The tool places the new point halfway between the
selected point and the following point.

## Shape Save and Load

In Chromium-based browsers on `localhost`, `Save Shape` uses the browser file
picker so the user can choose the filename and folder. `Load Shape` opens the
browser file picker for selecting an existing pattern file.

If the browser does not support the File System Access API:

- `Save Shape` falls back to a normal download.
- `Load Shape` falls back to a normal file input.

The JSON file stores only the pattern:

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

Device IP address, UDP port, and target firmware are not saved in the JSON file.

## UDP Command

```text
<target> shape duration=<duration_ms> points=<time:intensity,time:intensity,...>
```

Example:

```text
haptell-01-dc-shape shape duration=3000 points=0:60,400:180,2200:120,3000:0
```

## Send Confirmation

When the server reports that Node.js sent the UDP packet, the UI shows a busy
warning for the duration of the pattern. UDP does not prove that the firmware
played the pattern, but for the closed-subnet prototype this is a useful
practical signal.

The matching shape-only firmware is blocking, so it cannot receive another UDP
packet while the current shape is playing.

## Related Documentation

See:

```text
docs/custom-shape-designer.md
```

for the full workflow, JSON validation rules, firmware target list, and
troubleshooting notes.
