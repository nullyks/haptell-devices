# Technical reference

## Firmware and commands

- [Firmware compatibility](./firmware-variants.md) lists every sketch, its
  target, UDP port, sender and Stop behavior.
- [UDP command protocol](./command-protocol.md) explains the message format
  and provides command examples for each device family.
- [Hardware notes](./hardware-notes.md) collects prototype design decisions.
  Use the [device guides](./devices/index.md) for current connection diagrams.
- [LRA vibration terminology](./lra-vibration-strength.md) explains the
  difference between actuator drive values and measured vibration.

## Pattern editors and JSON

| Guide | What it covers |
| --- | --- |
| [Custom Shape Designer](./custom-shape-designer.md) | Amplitude-only shapes and saved JSON for the dedicated Haptell-01 and Haptell-02 shape sketches |
| [Haptell-02 DRV2605L envelopes](./lra-shape-designer.md) | Real-time drive values in the UDP Web Sender and how the main firmware interprets them |
| [Haptell-03 frequency patterns](./haptell-03-frequency-patterns.md) | Commands and interpolation for amplitude and frequency |
| [Haptell-04 triple shapes](./haptell-04-triple-shape-designer.md) | Three motor envelopes and saved JSON |
| [Haptell-05 servo shapes](./haptell-05-servo-shape-designer.md) | Angle, easing, servo calibration and saved JSON |
| [Haptell-06 Peltier shapes](./haptell-06-peltier-shape-designer.md) | One PWM channel, saved JSON and thermal measurements |
| [Haptell-07 dual Peltier shapes](./haptell-07-dual-peltier-shape-designer.md) | Shared timeline, two PWM channels and saved JSON |
