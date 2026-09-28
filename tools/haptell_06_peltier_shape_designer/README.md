# Haptell-06 Peltier Shape Designer

Start from the repository root (Node.js 18 or newer; no npm dependencies):

```powershell
node tools/haptell_06_peltier_shape_designer/server.js
```

Open <http://127.0.0.1:8085>. Enter the Arduino's IP address. This sender uses
UDP **4445**, exclusively for `haptell-06-peltier-shape`.

The editor follows the latest Shape Designer interaction: graph circles drag
vertically for PWM, while numbered x-axis handles drag horizontally for time.
It also provides numbered point rows, zoom/pan, insertion after a selected
point, presets, and JSON save/load. Duration is **0.5–90 seconds**, with **2–30 points**.
Time is edited in seconds at **0.5-second precision** (0.5–90 s). The UDP and
JSON formats keep integer milliseconds; every time value is divisible by 500.
PWM is **0–255**; the final point is always zero. Changing duration scales
point times proportionally. The initial pattern is all off.

**Send Shape** sends once. **Stop** can interrupt playback with the matching
non-blocking firmware. Stop targets the last attempted device, even if the IP
field has since changed. The countdown is an estimate: UDP sends have no device
acknowledgement. Closing the page does not stop the device; it finishes its
bounded pattern. Preset selection and JSON loading do not send commands.

JSON uses `haptell-peltier-shape-pattern/v1` and stores only the pattern. Files
from other device editors are rejected. See [workflow and protocol](../../docs/haptell-06-peltier-shape-designer.md).

To change the HTTP listener, set `HAPTELL_PELTIER_WEB_HOST` or
`HAPTELL_PELTIER_WEB_PORT`. Keep the default loopback host for local use.
The UDP port is fixed in the sender and firmware so other Haptell devices
remain on 4444.

Run the protocol, editor validation and local UDP integration tests:

```powershell
node --test tools/haptell_06_peltier_shape_designer/test/*.test.js
```
