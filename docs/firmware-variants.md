# Firmware Variants

Each motor/actuator hardware path has two firmware styles:

- A main non-blocking firmware for interactive use.
- A simple blocking firmware for reading, teaching, and first bench tests.

## Variant Matrix

| Hardware path | Device ID | Main non-blocking firmware | Simple blocking firmware |
| --- | --- | --- | --- |
| DC coin motor + MOSFET | `haptell-01` | `firmware/haptell_01_uno_r4_wifi_dc_coin/` | `firmware/haptell_01_uno_r4_wifi_dc_coin_simple_blocking/` |
| DRV2605L + VG1040003D 170 Hz LRA | `haptell-02` | `firmware/haptell_02_uno_r4_wifi_drv2605l_lra/` | `firmware/haptell_02_uno_r4_wifi_drv2605l_lra_simple_blocking/` |
| PAM8403 + VG2230001H 70 Hz actuator | `haptell-02` | `firmware/haptell_02_uno_r4_wifi_pam8403_vg2230001h/` | `firmware/haptell_02_uno_r4_wifi_pam8403_vg2230001h_simple_blocking/` |

## Non-Blocking Firmware

The main firmware variants keep playback state in variables and return to
`loop()` quickly. This lets the device keep reading UDP packets while a pattern
is active, so a later `stop` command or new pattern can interrupt playback.

Startup WiFi connection is still blocking in these sketches: `setup()` waits for
the first WiFi connection before starting the UDP listener.

## Simple Blocking Firmware

The blocking variants are intentionally easier to read. They play the requested
pattern inside the pattern function and return to `loop()` only after playback
has finished.

This means a `stop` command cannot interrupt an active `pulse`, `double`,
`ramp`, or `shape` playback. The command can only be handled after the blocking
function returns.

## Shape Command Support

All current firmware variants support the same `shape` command:

```text
<target> shape duration=<duration_ms> points=<time:intensity,time:intensity,...>
```

The meaning of `intensity` depends on the hardware path:

- DC coin motor: PWM value sent to the MOSFET gate output, `0..255`.
- DRV2605L LRA: unsigned realtime playback value, `0..255`.
- PAM8403 / VG2230001H: envelope value that scales the 70 Hz DAC sine carrier.

The Shape Designer in `tools/udp_web_sender/` generates this command. Select
`haptell-01` to send a DC motor PWM envelope, or `haptell-02` for either LRA
hardware path.
