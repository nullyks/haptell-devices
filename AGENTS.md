# Codex Working Notes

This repository contains the firmware and schematic documentation for **Haptell devices**: wireless handheld haptic artifacts that receive WiFi commands and play predefined haptic feedback patterns.

Read `CODEX_HANDOFF.md` before making larger changes. It contains the project memory, hardware context, decisions made with the user, and recommended next steps for continuing work in another Codex session.

## Project Language

- Repository content should be written in English.
- User conversation may be in Estonian.
- Keep technical documentation concise and practical for a client-facing engineering context.

## Repository Structure

- `README.md`: project overview and quick start.
- `firmware/haptell_01_uno_r4_wifi_dc_coin/`: first Arduino UNO R4 WiFi firmware.
- `firmware/haptell_01_uno_r4_wifi_dc_coin/haptell_01_uno_r4_wifi_dc_coin.ino`: UDP-controlled DC vibration motor sketch.
- `firmware/haptell_01_uno_r4_wifi_dc_coin_shape_blocking/`: shape-only blocking DC coin motor sketch for the custom Shape Designer.
- `firmware/haptell_02_uno_r4_wifi_drv2605l_lra/`: second Arduino UNO R4 WiFi firmware for DRV2605L + LRA.
- `firmware/haptell_02_uno_r4_wifi_drv2605l_lra/haptell_02_uno_r4_wifi_drv2605l_lra.ino`: UDP-controlled DRV2605L LRA sketch.
- `firmware/haptell_02_uno_r4_wifi_drv2605l_lra_simple_blocking/`: beginner-friendly blocking haptell-02 example sketch.
- `firmware/haptell_02_uno_r4_wifi_drv2605l_lra_shape_blocking/`: shape-only blocking DRV2605L LRA sketch for the custom Shape Designer.
- `firmware/haptell_02_uno_r4_wifi_pam8403_vg2230001h_shape_blocking/`: shape-only blocking PAM8403/VG2230001H sketch for the custom Shape Designer.
- `firmware/haptell_03_uno_r4_wifi_pam8403_teax13c02_8ohm/`: third Arduino UNO R4 WiFi firmware for PAM8403 + TEAX13C02-8/RH audio exciter.
- `firmware/haptell_03_uno_r4_wifi_pam8403_teax13c02_8ohm_simple_blocking/`: beginner-friendly blocking haptell-03 example sketch.
- `firmware/haptell_04_uno_r4_wifi_triple_dc_shape_blocking/`: shape-only blocking haptell-04 sketch for three DC motors.
- `firmware/haptell_01_uno_r4_wifi_dc_coin/secrets.example.h`: WiFi credential template.
- `docs/command-protocol.md`: UDP command format.
- `docs/custom-shape-designer.md`: focused amplitude-only Shape Designer workflow and JSON format.
- `docs/hardware-notes.md`: hardware decisions and cautions.
- `docs/haptell-03-frequency-patterns.md`: custom amplitude/frequency pattern workflow for the audio exciter path.
- `schematics/haptell-01-dc-coin-motor/`: first prototype schematic docs.
- `schematics/haptell-02-drv2605l-lra/`: second prototype wiring documentation for LiPo Rider Plus, DRV2605L, and LRA.
- `schematics/haptell-03-pam8403-teax13c02-8ohm/`: third prototype wiring documentation for PAM8403 and TEAX13C02-8/RH.
- `tools/udp_sender/`: Python example for sending UDP commands from a computer.
- `tools/udp_web_sender/`: local Node.js browser UI for sending UDP commands.
- `tools/haptell_03_frequency_web_sender/`: local Node.js browser UI for designing haptell-03 amplitude/frequency patterns.
- `tools/haptell_shape_designer/`: focused local Node.js browser UI for amplitude-only custom shape design, JSON save/load, and shape-only firmware sending.
- `tools/haptell_04_triple_shape_designer/`: local Node.js browser UI for three-motor haptell-04 shape design.

## Development Rules

- Keep the project simple and accessible: static documentation, Arduino firmware, and schematic documentation files.
- Do not commit `secrets.h` or real WiFi credentials.
- Preserve the Arduino sketch folder/file naming convention with underscores; Arduino IDE expects the `.ino` name to match the folder name.
- For the first and second prototypes, target Arduino UNO R4 WiFi unless the user explicitly asks to move to ESP32/ESP8266.
- Keep UDP port `4444` unless the user changes the protocol decision.
- Device ID for the first prototype is `haptell-01`.
- Device ID for the second DRV2605L + LRA prototype is `haptell-02`.
- Device ID for the third PAM8403 + TEAX13C02-8/RH audio-exciter prototype is `haptell-03`.
- Device ID for the fourth three-DC-motor shape prototype is `haptell-04-triple-dc-shape`.
- Prefer non-blocking firmware behavior so the device can receive new commands while a pattern is playing.
- Do not drive motors directly from GPIO pins. Document and use a driver stage.
- When adding hardware, include both human-readable documentation and schematic source files.

## Verification

When possible, compile the first firmware with Arduino CLI:

```powershell
arduino-cli compile --fqbn arduino:renesas_uno:unor4wifi firmware/haptell_01_uno_r4_wifi_dc_coin
arduino-cli compile --fqbn arduino:renesas_uno:unor4wifi firmware/haptell_02_uno_r4_wifi_drv2605l_lra
arduino-cli compile --fqbn arduino:renesas_uno:unor4wifi firmware/haptell_02_uno_r4_wifi_drv2605l_lra_simple_blocking
arduino-cli compile --fqbn arduino:renesas_uno:unor4wifi firmware/haptell_03_uno_r4_wifi_pam8403_teax13c02_8ohm
arduino-cli compile --fqbn arduino:renesas_uno:unor4wifi firmware/haptell_03_uno_r4_wifi_pam8403_teax13c02_8ohm_simple_blocking
arduino-cli compile --fqbn arduino:renesas_uno:unor4wifi firmware/haptell_01_uno_r4_wifi_dc_coin_shape_blocking
arduino-cli compile --fqbn arduino:renesas_uno:unor4wifi firmware/haptell_02_uno_r4_wifi_drv2605l_lra_shape_blocking
arduino-cli compile --fqbn arduino:renesas_uno:unor4wifi firmware/haptell_02_uno_r4_wifi_pam8403_vg2230001h_shape_blocking
arduino-cli compile --fqbn arduino:renesas_uno:unor4wifi firmware/haptell_04_uno_r4_wifi_triple_dc_shape_blocking
```

The second firmware requires the `Adafruit DRV2605 Library`, which also uses `Adafruit BusIO`.

KiCad and Fritzing drafts are not currently kept under `schematics/`; use the manual documentation diagrams unless the user asks to reintroduce a schematic CAD workflow.

## GitHub

- Public repository: https://github.com/nullyks/haptell-devices
- Default branch: `main`
- Initial public repo was created from this local folder: `C:/Users/Tanel Toova/Documents/haptell-devices`
