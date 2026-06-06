# Haptell Devices

Firmware, wiring notes, and local sender tools for **Haptell** wireless haptic
artifacts.

Each device uses an Arduino UNO R4 WiFi, joins a local WiFi network, listens for
UDP text commands on port `4444`, and plays haptic patterns through the selected
motor, LRA, or exciter driver.

## At a Glance

| Prototype | Actuator path | Main purpose | Primary firmware |
| --- | --- | --- | --- |
| `haptell-01` | DC coin motor + MOSFET | First simple vibration prototype | `firmware/haptell_01_uno_r4_wifi_dc_coin/` |
| `haptell-02` | DRV2605L + VG1040003D 170 Hz LRA | LRA driver IC prototype | `firmware/haptell_02_uno_r4_wifi_drv2605l_lra/` |
| `haptell-02` | PAM8403 + VG2230001H 70 Hz actuator | 70 Hz actuator path when DRV2605L is not a good fit | `firmware/haptell_02_uno_r4_wifi_pam8403_vg2230001h/` |
| `haptell-03` | PAM8403 + TEAX13C02-8/RH 8 ohm audio exciter | Experimental amplitude and frequency control | `firmware/haptell_03_uno_r4_wifi_pam8403_teax13c02_8ohm/` |
| `haptell-04` | Three DC vibration motors + MOSFET drivers | Three independent DC motor envelopes | `firmware/haptell_04_uno_r4_wifi_triple_dc_shape_blocking/` |

Shared defaults:

- Board: Arduino UNO R4 WiFi
- UDP port: `4444`
- WiFi credentials: local `secrets.h`, not committed
- Public repository: https://github.com/nullyks/haptell-devices

## Sender Tools

| Tool | URL | Use for |
| --- | --- | --- |
| `tools/udp_sender/` | command line | Sending one UDP command from Python |
| `tools/udp_web_sender/` | `http://127.0.0.1:8080` | General `pulse`, `double`, `ramp`, `shape`, and `stop` testing |
| `tools/haptell_shape_designer/` | `http://127.0.0.1:8082` | Large amplitude-only shape editor with JSON save/load |
| `tools/haptell_03_frequency_web_sender/` | `http://127.0.0.1:8081` | haptell-03 amplitude and frequency pattern editor |
| `tools/haptell_04_triple_shape_designer/` | `http://127.0.0.1:8083` | haptell-04 three-motor shape editor |

Start a web tool from the repository root:

```powershell
node tools/haptell_shape_designer/server.js
```

## Quick Start

1. Pick the firmware folder for the hardware you are testing.
2. Copy `secrets.example.h` to `secrets.h` inside that firmware folder.
3. Fill in the closed-subnet WiFi SSID and password.
4. Open the sketch in Arduino IDE.
5. Select **Arduino UNO R4 WiFi**.
6. Upload the sketch.
7. Open Serial Monitor and note the Arduino IP address.
8. Send UDP commands to that IP address on port `4444`.

Example command:

```text
haptell-01 pulse intensity=180 duration=800
```

Python sender example:

```powershell
python tools/udp_sender/send_haptell_command.py 192.168.1.42 pulse intensity=180 duration=800
```

## Firmware Families

The repository keeps firmware variants separate so each hardware path stays
easy to inspect and upload.

### Main Non-Blocking Firmware

Use these for interactive testing. A new valid command or `stop` can interrupt
an active pattern after startup WiFi connection has completed.

| Hardware path | Device ID | Folder |
| --- | --- | --- |
| DC coin motor + MOSFET | `haptell-01` | `firmware/haptell_01_uno_r4_wifi_dc_coin/` |
| DRV2605L + VG1040003D LRA | `haptell-02` | `firmware/haptell_02_uno_r4_wifi_drv2605l_lra/` |
| PAM8403 + VG2230001H 70 Hz actuator | `haptell-02` | `firmware/haptell_02_uno_r4_wifi_pam8403_vg2230001h/` |
| PAM8403 + TEAX13C02-8/RH audio exciter | `haptell-03` | `firmware/haptell_03_uno_r4_wifi_pam8403_teax13c02_8ohm/` |

### Simple Blocking Firmware

Use these for reading, teaching, and first bench tests. Playback blocks the
sketch until the pattern finishes, so `stop` cannot interrupt an active pattern.

| Hardware path | Folder |
| --- | --- |
| DC coin motor + MOSFET | `firmware/haptell_01_uno_r4_wifi_dc_coin_simple_blocking/` |
| DRV2605L + VG1040003D LRA | `firmware/haptell_02_uno_r4_wifi_drv2605l_lra_simple_blocking/` |
| PAM8403 + VG2230001H 70 Hz actuator | `firmware/haptell_02_uno_r4_wifi_pam8403_vg2230001h_simple_blocking/` |
| PAM8403 + TEAX13C02-8/RH audio exciter | `firmware/haptell_03_uno_r4_wifi_pam8403_teax13c02_8ohm_simple_blocking/` |

### Shape-Only Blocking Firmware

These sketches are intentionally minimal and beginner-friendly. They support
only custom `shape` playback from the focused Shape Designer and an idle-state
`stop` command.

| Hardware path | UDP target | Folder |
| --- | --- | --- |
| DC coin motor + MOSFET | `haptell-01-dc-shape` | `firmware/haptell_01_uno_r4_wifi_dc_coin_shape_blocking/` |
| DRV2605L + VG1040003D LRA | `haptell-02-drv2605l-shape` | `firmware/haptell_02_uno_r4_wifi_drv2605l_lra_shape_blocking/` |
| PAM8403 + VG2230001H 70 Hz actuator | `haptell-02-pam8403-shape` | `firmware/haptell_02_uno_r4_wifi_pam8403_vg2230001h_shape_blocking/` |
| Three DC motors + MOSFET drivers | `haptell-04-triple-dc-shape` | `firmware/haptell_04_uno_r4_wifi_triple_dc_shape_blocking/` |

The unique target IDs let multiple haptell-02 variants share one WiFi network
without both reacting to the same blocking command.

These sketches do not accept `all`, because blocking playback can last up to
15 seconds.

## Command Overview

General haptell-01 and haptell-02 commands:

```text
haptell-01 pulse intensity=180 duration=800
haptell-01 double intensity=220 gap=120
haptell-01 ramp from=60 to=255 duration=1200
haptell-01 shape duration=1600 points=0:0,100:180,700:180,1200:60,1600:0
haptell-01 stop

haptell-02 pulse intensity=180 duration=800
haptell-02 double intensity=220 gap=120
haptell-02 ramp from=60 to=255 duration=1200
haptell-02 shape duration=1600 points=0:0,100:180,700:180,1200:60,1600:0
haptell-02 stop
```

Focused Shape Designer command:

```text
haptell-02-drv2605l-shape shape duration=15000 points=0:80,500:180,12000:80,15000:0
haptell-04-triple-dc-shape shape duration=3000 points=0:0:0:0,500:180:60:0,2200:80:180:140,3000:0:0:0
```

haptell-03 frequency pattern command:

```text
haptell-03 tone amplitude=120 frequency=560 duration=500
haptell-03 sweep amplitude=140 from=180 to=900 duration=1200
haptell-03 pattern duration=1200 points=0:0:560,80:150:560,700:180:760,1200:0:560
haptell-03 stop
```

Full protocol documentation: `docs/command-protocol.md`.

## Documentation Guide

| Document | Contents |
| --- | --- |
| `docs/command-protocol.md` | UDP command format and examples |
| `docs/firmware-variants.md` | Firmware family matrix and blocking/non-blocking behavior |
| `docs/custom-shape-designer.md` | Large Shape Designer workflow, JSON format, and shape-only firmware |
| `docs/haptell-04-triple-shape-designer.md` | haptell-04 three-motor shape workflow |
| `docs/lra-shape-designer.md` | Original shared shape designer for DC/LRA amplitude envelopes |
| `docs/haptell-03-frequency-patterns.md` | haptell-03 amplitude/frequency pattern workflow |
| `docs/hardware-notes.md` | Hardware decisions, wiring cautions, and power notes |
| `docs/lra-vibration-strength.md` | How to describe LRA vibration strength scientifically |
| `CODEX_HANDOFF.md` | Project memory for continuing work with Codex or another AI assistant |
| `AGENTS.md` | Repository-specific working instructions for Codex |

## Repository Map

```text
firmware/     Arduino UNO R4 WiFi sketches
schematics/   wiring notes and client-readable diagrams
docs/         protocol, hardware, and workflow documentation
tools/        UDP sender tools
```

Each Arduino sketch folder includes:

- matching `.ino` sketch file
- `secrets.example.h`
- `README.md`
- `CODE_WALKTHROUGH.md`

Arduino IDE expects the `.ino` filename to match the sketch folder name.

## Hardware Safety

Do not drive vibration motors directly from an Arduino GPIO pin.

- DC coin motor: use the MOSFET driver circuit in
  `schematics/haptell-01-dc-coin-motor/`.
- DRV2605L LRA path: connect the LRA to the DRV2605L differential output.
- PAM8403 paths: connect actuators across one bridged amplifier output channel.
  Do not connect either PAM8403 output pin to ground.
- haptell-04 triple DC path: use three separate MOSFET driver stages, one per
  motor, with one flyback diode per motor.

The first prototype can use the available IRF3205 MOSFET with Arduino UNO R4
WiFi 5 V logic for small-motor bench testing. For future 3.3 V boards, use a
logic-level MOSFET that switches well at 3.3 V gate drive.

For PAM8403 variants, start with low amplitude and measure differential AC Vrms
across the connected actuator before increasing drive.

## Compile Examples

```powershell
arduino-cli compile --fqbn arduino:renesas_uno:unor4wifi firmware/haptell_01_uno_r4_wifi_dc_coin
arduino-cli compile --fqbn arduino:renesas_uno:unor4wifi firmware/haptell_02_uno_r4_wifi_drv2605l_lra
arduino-cli compile --fqbn arduino:renesas_uno:unor4wifi firmware/haptell_02_uno_r4_wifi_pam8403_vg2230001h
arduino-cli compile --fqbn arduino:renesas_uno:unor4wifi firmware/haptell_03_uno_r4_wifi_pam8403_teax13c02_8ohm
arduino-cli compile --fqbn arduino:renesas_uno:unor4wifi firmware/haptell_04_uno_r4_wifi_triple_dc_shape_blocking
```

The DRV2605L firmware requires:

- `Adafruit DRV2605 Library`
- `Adafruit BusIO`

## References

- Arduino UNO R4 WiFi product page: https://store.arduino.cc/products/uno-r4-wifi
- TI DRV2605L product page: https://www.ti.com/product/DRV2605L
- PAM8403 product page: https://www.diodes.com/products/amplifiers-and-sensors/audio/part/PAM8403
- Tectonic TEAX13C02-8/RH data sheet: https://www.parts-express.com/pedocs/specs/297-214--tectonic-hiax13c02-8rh-spec-sheet.pdf
- Seeed Studio LiPo Rider Plus wiki: https://wiki.seeedstudio.com/Lipo-Rider-Plus/
- Vybronics VG2230001H LRA: https://www.vybronics.com/coin-vibration-motors/lra/v-g2230001h
- Vybronics VG1040003D LRA: https://www.vybronics.com/coin-vibration-motors/lra/v-g1040003d
