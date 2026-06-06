# Command Protocol

Haptell devices listen for UDP text commands on port `4444`.

The initial command format is intentionally simple:

```text
<target> <pattern> <key=value> <key=value>
```

Targets:

- `haptell-01` addresses the first prototype.
- `haptell-02` addresses the LRA prototype. Current firmware variants include
  the DRV2605L + VG1040003D path and the PAM8403 + VG2230001H path.
- `haptell-03` addresses the PAM8403 + TEAX13C02-8/RH audio-exciter prototype.
- `haptell-04-triple-dc-shape` addresses the three-DC-motor shape-only prototype.
- `all` broadcasts a command to every Haptell device that receives the packet.

## Commands

### Pulse

Plays a single vibration pulse.

```text
haptell-01 pulse intensity=180 duration=800
haptell-02 pulse intensity=180 duration=800
```

- `intensity`: value from `0` to `255`, default `180`
  - DC motor firmware: PWM value
  - DRV2605L firmware: mapped to a selected effect or RTP drive value
  - PAM8403 firmware: envelope level for the 70 Hz carrier
- `duration`: hold time in milliseconds, default `800`

### Double

Plays two short taps.

```text
haptell-01 double intensity=220 gap=120
haptell-02 double intensity=220 gap=120
```

Parameters:

- `intensity`: value from `0` to `255`, default `220`
- `gap`: quiet gap between taps in milliseconds, default `120`

### Ramp

Ramps motor intensity from one PWM value to another, then fades out.

```text
haptell-01 ramp from=60 to=255 duration=1200
haptell-02 ramp from=60 to=255 duration=1200
```

Parameters:

- `from`: starting value from `0` to `255`, default `60`
- `to`: ending value from `0` to `255`, default `255`
- `duration`: ramp duration in milliseconds, default `1200`

### Stop

Stops playback immediately.

```text
haptell-01 stop
haptell-02 stop
all stop
```

For the DRV2605L `haptell-02` firmware, these generic pattern names map to
DRV2605L LRA effect playback. For the PAM8403 + VG2230001H firmware, they map
to generated 70 Hz amplitude envelopes. The exact feel depends on the selected
hardware path, actuator mounting, and output calibration.

### Shape

Plays a custom amplitude envelope. The command is supported by all current DC,
DRV2605L, and PAM8403 firmware variants.

```text
haptell-01 shape duration=1600 points=0:0,100:180,700:180,1200:60,1600:0
haptell-02 shape duration=1600 points=0:0,100:180,700:180,1200:60,1600:0
```

Parameters:

- `duration`: total pattern duration in milliseconds, `1` to `5000`
- `points`: comma-separated `time:intensity` pairs
- `time`: point time in milliseconds, sorted from `0` to `duration`
- `intensity`: normalized envelope value from `0` to `255`

The first point must be at `0 ms`, and the last point must be at `duration`.
The firmware linearly interpolates between points. The DC motor variants use the
resulting values as PWM output. The DRV2605L variants send the resulting values
to the DRV2605L in realtime playback mode. The PAM8403 variant uses the values
to scale a 70 Hz DAC sine carrier before amplification. The web sender includes
a simple envelope editor that generates this command and shows the outgoing data
as a structured array. See `lra-shape-designer.md` for the full workflow.

In the simple blocking firmware variants, the same command works but playback
blocks the sketch until the shape is finished.

### Shape-Only Blocking Targets

The focused Haptell Shape Designer uses separate beginner-friendly firmware
targets:

```text
haptell-01-dc-shape shape duration=15000 points=0:80,500:180,12000:80,15000:0
haptell-02-drv2605l-shape shape duration=15000 points=0:80,500:180,12000:80,15000:0
haptell-02-pam8403-shape shape duration=15000 points=0:80,500:180,12000:80,15000:0
haptell-04-triple-dc-shape shape duration=3000 points=0:0:0:0,500:180:60:0,2200:80:180:140,3000:0:0:0
```

These shape-only firmware variants support:

- duration up to `15000 ms`
- up to `30` points
- first point time fixed at `0 ms`, with any valid intensity
- last point time fixed at `duration`, with intensity `0`

They intentionally use unique target IDs and do not accept `all`, so multiple
blocking devices can share a WiFi network without all starting at once.

See `custom-shape-designer.md`.

### Haptell 04 Triple DC Shape

The haptell-04 three-motor firmware uses a shape command with three intensity
values per point:

```text
haptell-04-triple-dc-shape shape duration=3000 points=0:0:0:0,500:180:60:0,2200:80:180:140,3000:0:0:0
```

Each point is:

```text
timeMs:motor1Intensity:motor2Intensity:motor3Intensity
```

The firmware linearly interpolates all three motor intensities independently.
The matching web tool is `tools/haptell_04_triple_shape_designer/`.

The simple blocking haptell-02 firmware example also supports:

```text
haptell-02 custom
```

This command demonstrates DRV2605L realtime playback mode by manually sending drive values instead of using a built-in effect number.

### Haptell 03 Tone

Plays a fixed-frequency sine carrier through the PAM8403 + TEAX13C02-8/RH path.

```text
haptell-03 tone amplitude=120 frequency=560 duration=500
```

Parameters:

- `amplitude`: normalized drive level from `0` to `255`
- `frequency`: carrier frequency in Hz, `40` to `1500`
- `duration`: duration in milliseconds, `1` to `5000`

### Haptell 03 Sweep

Plays a constant-amplitude frequency sweep.

```text
haptell-03 sweep amplitude=140 from=180 to=900 duration=1200
```

Parameters:

- `amplitude`: normalized drive level from `0` to `255`
- `from`: starting frequency in Hz, `40` to `1500`
- `to`: ending frequency in Hz, `40` to `1500`
- `duration`: duration in milliseconds, `1` to `5000`

### Haptell 03 Pattern

Plays a custom amplitude and frequency pattern.

```text
haptell-03 pattern duration=1200 points=0:0:560,80:150:560,700:180:760,1200:0:560
```

Parameters:

- `duration`: total pattern duration in milliseconds, `1` to `5000`
- `points`: comma-separated `time:amplitude:frequency` triples
- `time`: point time in milliseconds, sorted from `0` to `duration`
- `amplitude`: normalized drive level from `0` to `255`
- `frequency`: carrier frequency in Hz, `40` to `1500`

The first point must be at `0 ms`, and the last point must be at `duration`.
The firmware linearly interpolates both amplitude and frequency between points.
See `haptell-03-frequency-patterns.md` for examples.

## Notes

- Commands are case-sensitive.
- Unknown targets are ignored.
- Unknown patterns are ignored.
- A new valid pattern command interrupts the currently playing pattern.
- UDP does not guarantee delivery. This is acceptable for the first closed-subnet prototype, but later multi-device versions may add sequence numbers, acknowledgements, or a higher-level protocol.

## Python Sender Example

A small Python command-line sender is available at:

```text
tools/udp_sender/send_haptell_command.py
```

Example:

```powershell
python tools/udp_sender/send_haptell_command.py 192.168.1.42 pulse intensity=180 duration=800
```

See `tools/udp_sender/README.md` for usage notes and more examples.

## Node.js Web Sender Example

A small local browser-based sender is available at:

```text
tools/udp_web_sender/server.js
```

Start it from the repository root:

```powershell
node tools/udp_web_sender/server.js
```

Then open `http://127.0.0.1:8080`. The web UI has buttons for `pulse`, `double`, `ramp`, and `stop`, plus a custom shape designer for the shared `shape` envelope command.

The dedicated haptell-03 frequency sender is available at:

```text
tools/haptell_03_frequency_web_sender/server.js
```

Start it from the repository root:

```powershell
node tools/haptell_03_frequency_web_sender/server.js
```

Then open `http://127.0.0.1:8081`. This UI designs `pattern` commands where
each point contains time, amplitude, and frequency.

The focused custom shape designer is available at:

```text
tools/haptell_shape_designer/server.js
```

Start it from the repository root:

```powershell
node tools/haptell_shape_designer/server.js
```

Then open `http://127.0.0.1:8082`. This UI designs amplitude-only `shape`
commands, saves/loads JSON pattern files, and shows a blocking playback warning
after Node.js confirms that it sent the UDP packet.

The haptell-04 triple shape designer is available at:

```text
tools/haptell_04_triple_shape_designer/server.js
```

Start it from the repository root:

```powershell
node tools/haptell_04_triple_shape_designer/server.js
```

Then open `http://127.0.0.1:8083`. This UI designs one shared time envelope
with separate intensity curves for three DC motors.
