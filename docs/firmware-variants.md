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
| PAM8403 + TEAX13C02-8/RH 8 ohm audio exciter | `haptell-03` | `firmware/haptell_03_uno_r4_wifi_pam8403_teax13c02_8ohm/` | `firmware/haptell_03_uno_r4_wifi_pam8403_teax13c02_8ohm_simple_blocking/` |
| Weighted 270 degree servo | `haptell-05-servo-shape` | - | `firmware/haptell_05_uno_r4_wifi_servo_weight_shape_blocking/` |

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

The haptell-01 and haptell-02 firmware variants support the same `shape`
command:

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

## Shape-Only Blocking Firmware

The repository also includes focused beginner-friendly shape-only blocking
sketches for the amplitude-only designer:

| Hardware path | Shape-only firmware | UDP target |
| --- | --- | --- |
| DC coin motor + MOSFET | `firmware/haptell_01_uno_r4_wifi_dc_coin_shape_blocking/` | `haptell-01-dc-shape` |
| DRV2605L + VG1040003D LRA | `firmware/haptell_02_uno_r4_wifi_drv2605l_lra_shape_blocking/` | `haptell-02-drv2605l-shape` |
| PAM8403 + VG2230001H 70 Hz actuator | `firmware/haptell_02_uno_r4_wifi_pam8403_vg2230001h_shape_blocking/` | `haptell-02-pam8403-shape` |
| Three DC motors + MOSFET drivers | `firmware/haptell_04_uno_r4_wifi_triple_dc_shape_blocking/` | `haptell-04-triple-dc-shape` |
| Weighted 270 degree servo | `firmware/haptell_05_uno_r4_wifi_servo_weight_shape_blocking/` | `haptell-05-servo-shape` |

These sketches remove `pulse`, `double`, and `ramp` from the command surface.
They support only `shape` and idle-state `stop`, with up to `15000 ms` duration
and `30` points. They do not accept `all`, because blocking playback prevents
the device from receiving new commands until the current shape is finished.

## Haptell 03 Frequency Pattern Support

The `haptell-03` audio-exciter firmware uses a separate command because each
point must include both amplitude and frequency:

```text
haptell-03 pattern duration=<duration_ms> points=<time:amplitude:frequency,time:amplitude:frequency,...>
```

The dedicated web sender in `tools/haptell_03_frequency_web_sender/` generates
this command and visualizes both curves on the same time axis.

## Haptell 04 Triple DC Shape Support

The `haptell-04` firmware is a shape-only blocking sketch for three DC vibration
motors. It uses one shared time axis and three independent motor intensities:

```text
haptell-04-triple-dc-shape shape duration=<duration_ms> points=<time:m1:m2:m3,time:m1:m2:m3,...>
```

The dedicated web tool in `tools/haptell_04_triple_shape_designer/` generates
this command and visualizes all three motor envelopes on one graph.

## Haptell 05 Servo Shape Support

The `haptell-05` firmware is a shape-only blocking sketch for a weighted 270
degree servo. It uses a separate command because each point contains angle and
easing rather than intensity:

```text
servo-shape duration=<duration_ms> points=<time:angle:easing,time:angle:easing,...>
```

Example:

```text
servo-shape duration=800 points=0:135:linear,120:175:easeOut,260:95:easeInOut,800:135:easeOut
```

The dedicated web tool in `tools/haptell_05_servo_shape_designer/` generates
this command, calculates pulse widths, shows speed warnings, and previews the
servo horn motion.
