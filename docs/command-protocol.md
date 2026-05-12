# Command Protocol

Haptell devices listen for UDP text commands on port `4444`.

The initial command format is intentionally simple:

```text
<target> <pattern> <key=value> <key=value>
```

Targets:

- `haptell-01` addresses the first prototype.
- `all` broadcasts a command to every Haptell device that receives the packet.

## Commands

### Pulse

Plays a single vibration pulse.

```text
haptell-01 pulse intensity=180 duration=800
```

Parameters:

- `intensity`: PWM value from `0` to `255`, default `180`
- `duration`: hold time in milliseconds, default `800`

### Double

Plays two short taps.

```text
haptell-01 double intensity=220 gap=120
```

Parameters:

- `intensity`: PWM value from `0` to `255`, default `220`
- `gap`: quiet gap between taps in milliseconds, default `120`

### Ramp

Ramps motor intensity from one PWM value to another, then fades out.

```text
haptell-01 ramp from=60 to=255 duration=1200
```

Parameters:

- `from`: starting PWM value from `0` to `255`, default `60`
- `to`: ending PWM value from `0` to `255`, default `255`
- `duration`: ramp duration in milliseconds, default `1200`

### Stop

Stops playback immediately.

```text
haptell-01 stop
all stop
```

## Notes

- Commands are case-sensitive.
- Unknown targets are ignored.
- Unknown patterns are ignored.
- A new valid pattern command interrupts the currently playing pattern.
- UDP does not guarantee delivery. This is acceptable for the first closed-subnet prototype, but later multi-device versions may add sequence numbers, acknowledgements, or a higher-level protocol.

