# Firmware compatibility

Use the sketch recommended by your [device guide](./devices/index.md) for a
first test. All sketches in the table target the Arduino UNO R4 WiFi. The three
DRV2605L sketches also need **Adafruit DRV2605 Library** and **Adafruit BusIO**.
The weighted servo sketch needs the **Servo** library.

**Yes** in the last column means the firmware checks for UDP while playing and
can act on a valid Stop. **After playback** means the sketch is blocking. It
finishes the pattern before it processes another command. The first WiFi
connection occurs during setup.

To start a sender, see [Tools](./tools.md). The target and UDP port below
refer to the Arduino, separate from the sender's local browser address.

## Haptell-01

| Sketch | UDP target | UDP port | Matching tool | Stop during playback |
| --- | --- | --- | --- | --- |
| [Coin motor · main](https://github.com/nullyks/haptell-devices/blob/main/firmware/haptell_01_uno_r4_wifi_dc_coin/haptell_01_uno_r4_wifi_dc_coin.ino) | `haptell-01` | 4444 | UDP Web Sender | Yes |
| [Coin motor · simple](https://github.com/nullyks/haptell-devices/blob/main/firmware/haptell_01_uno_r4_wifi_dc_coin_simple_blocking/haptell_01_uno_r4_wifi_dc_coin_simple_blocking.ino) | `haptell-01` | 4444 | UDP Web Sender | After playback |
| [Coin motor · shape-only](https://github.com/nullyks/haptell-devices/blob/main/firmware/haptell_01_uno_r4_wifi_dc_coin_shape_blocking/haptell_01_uno_r4_wifi_dc_coin_shape_blocking.ino) | `haptell-01-dc-shape` | 4444 | Custom Shape Designer | After playback |

## Haptell-02

| Sketch | UDP target | UDP port | Matching tool | Stop during playback |
| --- | --- | --- | --- | --- |
| [DRV2605L · main](https://github.com/nullyks/haptell-devices/blob/main/firmware/haptell_02_uno_r4_wifi_drv2605l_lra/haptell_02_uno_r4_wifi_drv2605l_lra.ino) | `haptell-02` | 4444 | UDP Web Sender | Yes |
| [DRV2605L · simple](https://github.com/nullyks/haptell-devices/blob/main/firmware/haptell_02_uno_r4_wifi_drv2605l_lra_simple_blocking/haptell_02_uno_r4_wifi_drv2605l_lra_simple_blocking.ino) | `haptell-02` | 4444 | UDP Web Sender | After playback |
| [DRV2605L · shape-only](https://github.com/nullyks/haptell-devices/blob/main/firmware/haptell_02_uno_r4_wifi_drv2605l_lra_shape_blocking/haptell_02_uno_r4_wifi_drv2605l_lra_shape_blocking.ino) | `haptell-02-drv2605l-shape` | 4444 | Custom Shape Designer | After playback |
| [PAM8403 70 Hz · main](https://github.com/nullyks/haptell-devices/blob/main/firmware/haptell_02_uno_r4_wifi_pam8403_vg2230001h/haptell_02_uno_r4_wifi_pam8403_vg2230001h.ino) | `haptell-02` | 4444 | UDP Web Sender | Yes |
| [PAM8403 70 Hz · simple](https://github.com/nullyks/haptell-devices/blob/main/firmware/haptell_02_uno_r4_wifi_pam8403_vg2230001h_simple_blocking/haptell_02_uno_r4_wifi_pam8403_vg2230001h_simple_blocking.ino) | `haptell-02` | 4444 | UDP Web Sender | After playback |
| [PAM8403 70 Hz · shape-only](https://github.com/nullyks/haptell-devices/blob/main/firmware/haptell_02_uno_r4_wifi_pam8403_vg2230001h_shape_blocking/haptell_02_uno_r4_wifi_pam8403_vg2230001h_shape_blocking.ino) | `haptell-02-pam8403-shape` | 4444 | Custom Shape Designer | After playback |

## Haptell-03

| Sketch | UDP target | UDP port | Matching tool | Stop during playback |
| --- | --- | --- | --- | --- |
| [Audio exciter · main](https://github.com/nullyks/haptell-devices/blob/main/firmware/haptell_03_uno_r4_wifi_pam8403_teax13c02_8ohm/haptell_03_uno_r4_wifi_pam8403_teax13c02_8ohm.ino) | `haptell-03` | 4444 | Frequency Sender | Yes |
| [Audio exciter · simple](https://github.com/nullyks/haptell-devices/blob/main/firmware/haptell_03_uno_r4_wifi_pam8403_teax13c02_8ohm_simple_blocking/haptell_03_uno_r4_wifi_pam8403_teax13c02_8ohm_simple_blocking.ino) | `haptell-03` | 4444 | Frequency Sender | After playback |

## Haptell-04 through Haptell-07

| Sketch | UDP target | UDP port | Matching tool | Stop during playback |
| --- | --- | --- | --- | --- |
| [Haptell-04 · three coin motors](https://github.com/nullyks/haptell-devices/blob/main/firmware/haptell_04_uno_r4_wifi_triple_dc_shape_blocking/haptell_04_uno_r4_wifi_triple_dc_shape_blocking.ino) | `haptell-04-triple-dc-shape` | 4444 | Triple Shape Designer | After playback |
| [Haptell-05 · weighted servo](https://github.com/nullyks/haptell-devices/blob/main/firmware/haptell_05_uno_r4_wifi_servo_weight_shape_blocking/haptell_05_uno_r4_wifi_servo_weight_shape_blocking.ino) | `haptell-05-servo-shape`¹ | 4444 | Servo Shape Designer | After playback |
| [Haptell-06 · single Peltier](https://github.com/nullyks/haptell-devices/blob/main/firmware/haptell_06_uno_r4_wifi_peltier_shape/haptell_06_uno_r4_wifi_peltier_shape.ino) | `haptell-06-peltier-shape` | 4445 | Peltier Shape Designer | Yes |
| [Haptell-07 · dual Peltier](https://github.com/nullyks/haptell-devices/blob/main/firmware/haptell_07_uno_r4_wifi_dual_peltier_shape/haptell_07_uno_r4_wifi_dual_peltier_shape.ino) | `haptell-07-dual-peltier-shape` | 4444 | Dual Peltier Shape Designer | Yes |

¹ The Haptell-05 editor sends `servo-shape` without a target prefix. For
addressed commands, the sketch accepts `haptell-05-servo-shape` and
`haptell-05`. The editor's preview Stop stops only the animation.

## What each pattern controls

- Haptell-01 uses PWM to switch a DC motor. Haptell-02 uses real-time drive
  values with the DRV2605L, or changes the amplitude of a 70 Hz waveform with
  the PAM8403. The [Custom Shape Designer](./custom-shape-designer.md)
  targets the three dedicated shape-only sketches for these hardware paths.
- [Haptell-03](./haptell-03-frequency-patterns.md) accepts tone, sweep and
  pattern commands. Pattern points specify amplitude and frequency.
- [Haptell-04](./haptell-04-triple-shape-designer.md) uses three independent
  motor intensities. [Haptell-05](./haptell-05-servo-shape-designer.md)
  uses an angle and easing for each servo point.
- [Haptell-06](./haptell-06-peltier-shape-designer.md) uses one PWM value
  per point. [Haptell-07](./haptell-07-dual-peltier-shape-designer.md) uses
  two PWM values at each shared point time. Both accept the exact target only.

See the [UDP command protocol](./command-protocol.md) for syntax and examples.
