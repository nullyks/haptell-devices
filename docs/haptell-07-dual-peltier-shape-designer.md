# Haptell-07 Dual Peltier Shape Designer

Haptell-07 runs two independent PWM envelopes on one shared timeline.
**D3** controls Peltier 1 and **D5** controls Peltier 2 through their respective
IRLZ44N MOSFETs. See the [connection diagram](../schematics/haptell-07-dual-peltier/diagram.md)
for separate Arduino power and common ground. The shared Peltier supply in
that diagram is provisional until its combined on-state load is measured.

## Start the editor

1. Upload the [Haptell-07 firmware](../firmware/haptell_07_uno_r4_wifi_dual_peltier_shape/README.md)
   and copy the device's IPv4 address from Serial Monitor at 115200 baud.
2. With Node.js 18 or later, run this command from the repository root.

   ```powershell
   node tools/haptell_07_dual_peltier_shape_designer/server.js
   ```

3. Open <http://127.0.0.1:8086> and enter the Arduino's IP address. The device
   and the computer running Node.js must be able to reach each other over WiFi.
   The editor needs no npm packages. Set `HAPTELL_07_WEB_PORT` to change the
   local HTTP port if 8086 is in use.

## Edit and play

The editor opens with a 10-second pattern and both outputs set to zero.

- Set the duration to 0.5–90 seconds. The editor snaps time to 0.5-second
  increments and scales existing point times when the duration changes. The
  shortest available duration depends on the number of points.
- **Add Point** inserts a point into the largest gap. Drag a handle below
  either curve horizontally to move an interior point on both graphs in
  0.5-second steps. The start and end times are fixed during dragging.
  Drag a circle vertically to change that channel's PWM. The shared table
  also supports time and PWM edits. Set one channel's values to zero to run
  the other by itself.
- Each channel accepts integer PWM from 0 to 255. Both curves start at time
  zero and must end at PWM 0. Firmware interpolates between points.
- **Send Shape** starts playback or replaces the current pattern.
  **Stop Both** sends an interrupt to the active destination. The countdown
  estimates playback time from the send. UDP sends provide no receipt or
  device state confirmation.
- **Save JSON** downloads a pattern. **Load JSON** opens a saved Haptell-07
  pattern. The file stores the duration and both curves.

PWM is electrical drive. Temperature sensing and temperature limits are outside
this prototype's control loop.

## UDP protocol

Send a single ASCII datagram without a trailing newline to **UDP 4444**.
The addressed device ID is `haptell-07-dual-peltier-shape`.

```text
haptell-07-dual-peltier-shape shape duration=12000 points=0:0:0,3000:96:0,6000:96:0,8500:0:96,12000:0:0
haptell-07-dual-peltier-shape stop
```

Each point is `timeMs:pwmD3:pwmD5`. Send 2–30 points with unique, strictly
increasing times in 500 ms steps. Duration is 500–90000 ms. The first point is
at 0 ms. The last point is at the duration with both PWM values zero. The exact
address is required. Invalid packets leave active playback unchanged.

## JSON example

```json
{
  "schema": "haptell-dual-peltier-shape-pattern/v1",
  "durationMs": 12000,
  "points": [
    { "timeMs": 0, "pwmD3": 0, "pwmD5": 0 },
    { "timeMs": 3000, "pwmD3": 96, "pwmD5": 0 },
    { "timeMs": 6000, "pwmD3": 96, "pwmD5": 0 },
    { "timeMs": 8500, "pwmD3": 0, "pwmD5": 96 },
    { "timeMs": 12000, "pwmD3": 0, "pwmD5": 0 }
  ]
}
```
