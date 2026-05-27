# Haptell Devices

Firmware and hardware notes for wireless handheld haptic artifacts.

The first prototype, `haptell-01`, uses an Arduino UNO R4 WiFi to drive a small 3-5 V DC coin vibration motor. The second prototype, `haptell-02`, has two LRA hardware paths: a DRV2605L driver path for the 170 Hz Vybronics VG1040003D, and a PAM8403 audio-amplifier path for the 70 Hz Vybronics VG2230001H. The third prototype, `haptell-03`, uses a PAM8403 and Tectonic TEAX13C02-8/RH audio exciter so firmware can control both amplitude and frequency. Commands are sent over UDP on a closed WiFi subnet.

## AI Handoff

This repo includes project memory for continuing work with Codex or another AI coding assistant:

- `AGENTS.md`: repository-specific working instructions
- `CODEX_HANDOFF.md`: project context, hardware decisions, and recommended next steps

When continuing from another computer, clone the repo and ask Codex to read both files before making larger changes.

## Current Prototypes

- Device ID: `haptell-01`
- Board: Arduino UNO R4 WiFi
- Actuator: 8 x 3 mm 3-5 V DC coin vibration motor, 67 mA rated current
- Driver: low-side N-channel MOSFET switch
- UDP port: `4444`
- WiFi credentials: local `secrets.h`, not committed

- Device ID: `haptell-02`
- Board: Arduino UNO R4 WiFi
- Actuator: Vybronics VG1040003D LRA, 10 x 4 mm, 2.5 Vrms, 170 Hz
- Driver: Mavaol DRV2605L haptic motor controller module over I2C
- Power: 3.7 V 1S protected LiPo -> Seeed Studio LiPo Rider Plus -> regulated 5 V rail
- UDP port: `4444`
- WiFi credentials: local `secrets.h`, not committed

- Device ID: `haptell-02`
- Board: Arduino UNO R4 WiFi
- Actuator: Vybronics VG2230001H LRA / voice-coil actuator, 2 Vrms, 70 Hz
- Driver: PAM8403 class-D audio amplifier module
- Signal path: Arduino `A0` DAC generates a 70 Hz sine carrier with an amplitude envelope
- UDP port: `4444`
- WiFi credentials: local `secrets.h`, not committed

- Device ID: `haptell-03`
- Board: Arduino UNO R4 WiFi
- Actuator: Tectonic TEAX13C02-8/RH 8 ohm audio exciter
- Driver: PAM8403 class-D audio amplifier module
- Signal path: Arduino `A0` DAC generates a sine carrier with amplitude and frequency control
- UDP port: `4444`
- WiFi credentials: local `secrets.h`, not committed

## Repository Layout

```text
firmware/
  haptell_01_uno_r4_wifi_dc_coin/
    haptell_01_uno_r4_wifi_dc_coin.ino
    secrets.example.h
    README.md
    CODE_WALKTHROUGH.md
  haptell_01_uno_r4_wifi_dc_coin_simple_blocking/
    haptell_01_uno_r4_wifi_dc_coin_simple_blocking.ino
    secrets.example.h
    README.md
    CODE_WALKTHROUGH.md
  haptell_01_uno_r4_wifi_dc_coin_shape_blocking/
    haptell_01_uno_r4_wifi_dc_coin_shape_blocking.ino
    secrets.example.h
    README.md
    CODE_WALKTHROUGH.md
  haptell_02_uno_r4_wifi_drv2605l_lra/
    haptell_02_uno_r4_wifi_drv2605l_lra.ino
    secrets.example.h
    README.md
    CODE_WALKTHROUGH.md
  haptell_02_uno_r4_wifi_drv2605l_lra_simple_blocking/
    haptell_02_uno_r4_wifi_drv2605l_lra_simple_blocking.ino
    secrets.example.h
    README.md
    CODE_WALKTHROUGH.md
  haptell_02_uno_r4_wifi_drv2605l_lra_shape_blocking/
    haptell_02_uno_r4_wifi_drv2605l_lra_shape_blocking.ino
    secrets.example.h
    README.md
    CODE_WALKTHROUGH.md
  haptell_02_uno_r4_wifi_pam8403_vg2230001h/
    haptell_02_uno_r4_wifi_pam8403_vg2230001h.ino
    secrets.example.h
    README.md
    CODE_WALKTHROUGH.md
  haptell_02_uno_r4_wifi_pam8403_vg2230001h_simple_blocking/
    haptell_02_uno_r4_wifi_pam8403_vg2230001h_simple_blocking.ino
    secrets.example.h
    README.md
    CODE_WALKTHROUGH.md
  haptell_02_uno_r4_wifi_pam8403_vg2230001h_shape_blocking/
    haptell_02_uno_r4_wifi_pam8403_vg2230001h_shape_blocking.ino
    secrets.example.h
    README.md
    CODE_WALKTHROUGH.md
  haptell_03_uno_r4_wifi_pam8403_teax13c02_8ohm/
    haptell_03_uno_r4_wifi_pam8403_teax13c02_8ohm.ino
    secrets.example.h
    README.md
    CODE_WALKTHROUGH.md
  haptell_03_uno_r4_wifi_pam8403_teax13c02_8ohm_simple_blocking/
    haptell_03_uno_r4_wifi_pam8403_teax13c02_8ohm_simple_blocking.ino
    secrets.example.h
    README.md
    CODE_WALKTHROUGH.md
schematics/
  haptell-01-dc-coin-motor/
    README.md
    diagram.md
    circuit-diagram.svg
    haptell-01-dc-coin-motor.kicad_pro
    haptell-01-dc-coin-motor.kicad_sch
  haptell-02-drv2605l-lra/
    README.md
    diagram.md
    circuit-diagram.svg
    haptell-02-drv2605l-lra.kicad_pro
    haptell-02-drv2605l-lra.kicad_sch
  haptell-02-pam8403-vg2230001h/
    README.md
    diagram.md
  haptell-03-pam8403-teax13c02-8ohm/
    README.md
    diagram.md
docs/
  command-protocol.md
  custom-shape-designer.md
  firmware-variants.md
  haptell-03-frequency-patterns.md
  hardware-notes.md
  lra-shape-designer.md
  lra-vibration-strength.md
tools/
  udp_sender/
    send_haptell_command.py
    README.md
  udp_web_sender/
    server.js
    package.json
    README.md
  haptell_03_frequency_web_sender/
    server.js
    package.json
    README.md
  haptell_shape_designer/
    server.js
    package.json
    README.md
```

## Quick Start

1. Open `firmware/haptell_01_uno_r4_wifi_dc_coin/` in Arduino IDE.
2. Copy `secrets.example.h` to `secrets.h`.
3. Add the WiFi SSID and password for the closed subnet.
4. Select **Arduino UNO R4 WiFi** as the board.
5. Upload the firmware.
6. Send UDP commands to the device IP address on port `4444`.

Example command:

```text
haptell-01 pulse intensity=180 duration=800
```

See `docs/command-protocol.md` for the supported commands, and
`docs/firmware-variants.md` for the non-blocking and simple blocking firmware
pairs.

You can also use the Python sender example in `tools/udp_sender/`:

```powershell
python tools/udp_sender/send_haptell_command.py 192.168.1.42 pulse intensity=180 duration=800
```

Or start the local browser-based Node.js sender:

```powershell
node tools/udp_web_sender/server.js
```

Then open `http://127.0.0.1:8080`.

The web sender also includes a simple shape designer. It visualizes a custom
amplitude envelope, shows the outgoing data as an array, and sends a compact
`shape` command to the firmware. The same command format works for the DC motor,
DRV2605L LRA, and PAM8403/VG2230001H firmware variants. See
`docs/lra-shape-designer.md`.

For longer custom amplitude patterns, use the focused Shape Designer:

```powershell
node tools/haptell_shape_designer/server.js
```

Then open `http://127.0.0.1:8082`. This tool supports up to `15 s` patterns,
up to `30` points, numbered graph/table points, and JSON save/load for pattern
files. It targets the shape-only blocking firmware variants. See
`docs/custom-shape-designer.md`.

For the `haptell-03` audio-exciter prototype, use the dedicated frequency
pattern sender:

```powershell
node tools/haptell_03_frequency_web_sender/server.js
```

Then open `http://127.0.0.1:8081`. It sends `pattern` commands with
`timeMs:amplitude:frequencyHz` points. See
`docs/haptell-03-frequency-patterns.md`.

## Hardware Warning

Do not drive vibration motors directly from an Arduino GPIO pin. Use the MOSFET driver circuit in `schematics/haptell-01-dc-coin-motor/` for the DC motor prototype, or the DRV2605L driver circuit in `schematics/haptell-02-drv2605l-lra/` for the LRA prototype.

The first prototype can use the available IRF3205 MOSFET with the Arduino UNO R4 WiFi's 5 V logic output. For future ESP32/ESP8266 versions, replace it with a logic-level MOSFET that switches well at 3.3 V gate drive.

LRA actuators such as the VG1040003D and VG2230001H require an appropriate AC drive path. Do not connect the LRA directly to Arduino GPIO, PWM, or a simple DC MOSFET switch. The VG2230001H 70 Hz actuator is not a good fit for the DRV2605L frequency range; use the PAM8403 firmware/wiring variant or another driver that can generate a controlled 70 Hz waveform.

The TEAX13C02-8/RH path is an audio-exciter experiment, not a direct LRA
replacement. The PAM8403 output is bridged, so do not connect either speaker
output pin to ground. Start with low amplitude and measure differential AC Vrms
across the exciter.

## References

- Arduino UNO R4 WiFi product page: https://store.arduino.cc/products/uno-r4-wifi
- TI DRV2605L product page: https://www.ti.com/product/DRV2605L
- PAM8403 product page: https://www.diodes.com/products/amplifiers-and-sensors/audio/part/PAM8403
- Tectonic TEAX13C02-8/RH data sheet: https://www.parts-express.com/pedocs/specs/297-214--tectonic-hiax13c02-8rh-spec-sheet.pdf
- Seeed Studio LiPo Rider Plus wiki: https://wiki.seeedstudio.com/Lipo-Rider-Plus/
- Vybronics VG2230001H LRA: https://www.vybronics.com/coin-vibration-motors/lra/v-g2230001h
- Vybronics VG1040003D LRA: https://www.vybronics.com/coin-vibration-motors/lra/v-g1040003d
