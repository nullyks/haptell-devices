# Shape Designer

This document describes the simple Node.js web UI and firmware pair for
designing and playing custom haptic amplitude envelopes.

The feature is intentionally small:

- The browser UI lets a user design a vibration amplitude envelope.
- The Node.js server sends one compact UDP text command.
- The Arduino firmware parses the command and plays the envelope as DC PWM,
  DRV2605L realtime playback, or the amplitude of a 70 Hz PAM8403 carrier,
  depending on the selected firmware variant.
- Patterns are limited to 5 seconds and 24 points.

## Mental Model

For the DRV2605L firmware, the user is not designing the raw 170 Hz LRA
waveform. The DRV2605L remains responsible for driving the LRA actuator.

For the PAM8403 + VG2230001H firmware, the carrier is fixed at 70 Hz and the
same envelope controls its amplitude.

For the DC coin motor firmware, the same envelope directly controls PWM output.

The user designs an amplitude envelope:

```text
time -> desired drive intensity
```

Example:

```text
0 ms     -> 0
100 ms   -> 180
700 ms   -> 180
1200 ms  -> 60
1600 ms  -> 0
```

The firmware linearly interpolates between these points and applies the
resulting intensity to the selected hardware path.

## Web UI

Start the local sender from the repository root:

```powershell
node tools/udp_web_sender/server.js
```

Open:

```text
http://127.0.0.1:8080
```

The Shape Designer includes:

- `duration ms`: total pattern duration, up to `5000`
- preset buttons: `Tap`, `Double`, `Pulse`, `Ramp`, `Heartbeat`
- envelope graph: visualizes intensity over time
- points table: editable `time` and `intensity` values
- `Add Point`: inserts another editable point
- `Send Shape`: sends the generated UDP command
- command preview: exact UDP text that will be sent
- data array preview: structured view of the same outgoing data

The graph uses:

- x-axis: time in milliseconds
- y-axis: normalized envelope intensity from `0` to `255`

Endpoints are kept fixed:

- first point: `0 ms`, intensity `0`
- last point: `duration`, intensity `0`

This keeps each shape self-contained and avoids leaving the actuator driven at
the end of playback.

## Outgoing Command

The generated UDP command format is:

```text
<target> shape duration=<duration_ms> points=<time:intensity,time:intensity,...>
```

Example:

```text
haptell-02 shape duration=1600 points=0:0,100:180,700:180,1200:60,1600:0
```

Command components:

```js
[
  ["target", "haptell-02"],
  ["command", "shape"],
  ["durationMs", 1600],
  ["mode", "amplitude-envelope"],
  ["points", [
    ["timeMs", "intensity"],
    [0, 0],
    [100, 180],
    [700, 180],
    [1200, 60],
    [1600, 0]
  ]]
]
```

## Firmware Behavior

All current firmware variants accept the `shape` action:

```text
haptell-01 shape duration=1600 points=0:0,100:180,700:180,1200:60,1600:0
haptell-02 shape duration=1600 points=0:0,100:180,700:180,1200:60,1600:0
```

Validation rules:

- `duration` must be `1..5000 ms`
- `points` must contain at least 2 points
- maximum point count is `24`
- point times must be sorted
- first point time must be `0`
- last point time must equal `duration`
- intensity must be `0..255`

During playback, the DRV2605L firmware:

1. Stops any active built-in effect sequence.
2. Configures DRV2605L realtime playback for unsigned unidirectional input.
3. Starts realtime playback mode.
4. Uses `millis()` to track elapsed time.
5. Interpolates between the nearest envelope points.
6. Sends the current drive value with `drv.setRealtimeValue(...)`.
7. Writes `0` and returns to library effect mode when the shape ends.

The main firmware updates the realtime value every `12 ms` while the shape is
active. Its loop remains non-blocking, so a later UDP command such as `stop` can
still be received.

The simple blocking example uses the same command format and interpolation logic,
but it waits inside the shape playback function until the shape is finished.
That version is easier to read, but it cannot receive `stop` or another UDP
command during shape playback.

During playback, the PAM8403 + VG2230001H firmware:

1. Starts a 70 Hz sine carrier on Arduino `A0` / `DAC`.
2. Uses `millis()` to track elapsed time.
3. Interpolates between the nearest envelope points.
4. Maps the current `0..255` intensity to a limited DAC sine amplitude.
5. Feeds that signal into one PAM8403 input channel.
6. Stops the carrier and returns the DAC to midpoint when the shape ends.

During playback, the DC motor firmware:

1. Uses `millis()` to track elapsed time.
2. Interpolates between the nearest envelope points.
3. Writes the current `0..255` intensity to Arduino `D9` with `analogWrite()`.
4. Stops the motor when the shape ends.

## Why Unsigned RTP Is Used

Earlier testing showed that this kind of code did not create a sustained
3-second vibration:

```cpp
drv.setMode(DRV2605_MODE_REALTIME);
drv.setRealtimeValue(180);
delay(3000);
```

The likely reason is that DRV2605L realtime playback data is signed by default.
In the default signed format, `180` is not simply a positive `180 / 255` drive
level.

For shape playback, the firmware explicitly configures:

```text
BIDIR_INPUT = 0
DATA_FORMAT_RTP = 1
```

This makes the realtime values easier to reason about:

```text
0   = no drive
255 = full-scale drive
```

After shape playback, the firmware restores the DRV2605L settings used for
built-in library effects.

## Useful Test Commands

Short pulse:

```text
haptell-02 shape duration=400 points=0:0,40:180,240:180,400:0
```

Three-second hold at drive value `180`:

```text
haptell-02 shape duration=3000 points=0:0,100:180,2900:180,3000:0
```

Ramp up and release:

```text
haptell-02 shape duration=1500 points=0:0,1200:220,1500:0
```

Double tap:

```text
haptell-02 shape duration=560 points=0:0,20:220,90:220,150:0,250:0,270:210,350:210,560:0
```

Stop:

```text
haptell-02 stop
```

For the DC motor, use the same examples with `haptell-01` as the target.

## Current Limits

This is a first practical version, not a full haptic authoring system.

Current limits:

- UDP delivery is not guaranteed.
- The shape is sent as one text packet.
- The firmware does not save shapes permanently.
- The firmware uses linear interpolation only.
- The web UI loops nothing by itself.
- The drive value is not a calibrated physical acceleration value.

For physical comparison between patterns, measure acceleration along the
actuator axis and report peak or RMS acceleration in `g` over a defined time
window. See `lra-vibration-strength.md`.

## Files

Main firmware:

```text
firmware/haptell_01_uno_r4_wifi_dc_coin/haptell_01_uno_r4_wifi_dc_coin.ino
firmware/haptell_02_uno_r4_wifi_drv2605l_lra/haptell_02_uno_r4_wifi_drv2605l_lra.ino
firmware/haptell_02_uno_r4_wifi_pam8403_vg2230001h/haptell_02_uno_r4_wifi_pam8403_vg2230001h.ino
```

Simple blocking firmware:

```text
firmware/haptell_01_uno_r4_wifi_dc_coin_simple_blocking/haptell_01_uno_r4_wifi_dc_coin_simple_blocking.ino
firmware/haptell_02_uno_r4_wifi_drv2605l_lra_simple_blocking/haptell_02_uno_r4_wifi_drv2605l_lra_simple_blocking.ino
firmware/haptell_02_uno_r4_wifi_pam8403_vg2230001h_simple_blocking/haptell_02_uno_r4_wifi_pam8403_vg2230001h_simple_blocking.ino
```

Web UI:

```text
tools/udp_web_sender/server.js
tools/udp_web_sender/public/index.html
tools/udp_web_sender/public/app.js
tools/udp_web_sender/public/styles.css
```

Protocol reference:

```text
docs/command-protocol.md
```
