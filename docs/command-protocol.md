# Command Protocol

Haptell devices listen for UDP text commands on port `4444`.

The initial command format is intentionally simple:

```text
<target> <pattern> <key=value> <key=value>
```

Targets:

- `haptell-01` addresses the first prototype.
- `haptell-02` addresses the DRV2605L + LRA prototype.
- `all` broadcasts a command to every Haptell device that receives the packet.

## Commands

### Pulse

Plays a single vibration pulse.

```text
haptell-01 pulse intensity=180 duration=800
haptell-02 pulse intensity=180 duration=800
```

Parameters:

- `intensity`: PWM value from `0` to `255`, default `180`
- `duration`: hold time in milliseconds, default `800`

### Double

Plays two short taps.

```text
haptell-01 double intensity=220 gap=120
haptell-02 double intensity=220 gap=120
```

Parameters:

- `intensity`: PWM value from `0` to `255`, default `220`
- `gap`: quiet gap between taps in milliseconds, default `120`

### Ramp

Ramps motor intensity from one PWM value to another, then fades out.

```text
haptell-01 ramp from=60 to=255 duration=1200
haptell-02 ramp from=60 to=255 duration=1200
```

Parameters:

- `from`: starting PWM value from `0` to `255`, default `60`
- `to`: ending PWM value from `0` to `255`, default `255`
- `duration`: ramp duration in milliseconds, default `1200`

### Stop

Stops playback immediately.

```text
haptell-01 stop
haptell-02 stop
all stop
```

For `haptell-02`, the DRV2605L firmware maps these generic pattern names to DRV2605L LRA effect playback. The `intensity`, `from`, `to`, and `duration` values are kept in the command interface for compatibility and later tuning, but the exact feel depends on the selected DRV2605L effect library, actuator calibration, and module behavior.

### Shape

Plays a custom LRA realtime amplitude envelope on the main `haptell-02` firmware
and the simple blocking `haptell-02` example.

```text
haptell-02 shape duration=1600 points=0:0,100:180,700:180,1200:60,1600:0
```

Parameters:

- `duration`: total pattern duration in milliseconds, `1` to `5000`
- `points`: comma-separated `time:intensity` pairs
- `time`: point time in milliseconds, sorted from `0` to `duration`
- `intensity`: realtime drive value from `0` to `255`

The first point must be at `0 ms`, and the last point must be at `duration`.
The firmware linearly interpolates between points and sends the resulting values
to the DRV2605L in realtime playback mode. The web sender includes a simple
envelope editor that generates this command and shows the outgoing data as a
structured array. See `lra-shape-designer.md` for the full workflow.

In the simple blocking `haptell-02` example, the same command works but playback
blocks the sketch until the shape is finished.

The simple blocking haptell-02 firmware example also supports:

```text
haptell-02 custom
```

This command demonstrates DRV2605L realtime playback mode by manually sending drive values instead of using a built-in effect number.

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

Then open `http://127.0.0.1:8080`. The web UI has buttons for `pulse`, `double`, `ramp`, and `stop`, plus a custom LRA shape designer for the `haptell-02` realtime envelope command.
