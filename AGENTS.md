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
- `firmware/haptell_02_uno_r4_wifi_drv2605l_lra/`: second Arduino UNO R4 WiFi firmware for DRV2605L + LRA.
- `firmware/haptell_02_uno_r4_wifi_drv2605l_lra/haptell_02_uno_r4_wifi_drv2605l_lra.ino`: UDP-controlled DRV2605L LRA sketch.
- `firmware/haptell_02_uno_r4_wifi_drv2605l_lra_simple_blocking/`: beginner-friendly blocking haptell-02 example sketch.
- `firmware/haptell_01_uno_r4_wifi_dc_coin/secrets.example.h`: WiFi credential template.
- `docs/command-protocol.md`: UDP command format.
- `docs/hardware-notes.md`: hardware decisions and cautions.
- `schematics/haptell-01-dc-coin-motor/`: first prototype schematic docs, SVG diagram, and KiCad draft.
- `schematics/haptell-02-drv2605l-lra/`: second prototype wiring documentation for LiPo Rider Plus, DRV2605L, and LRA.
- `tools/udp_sender/`: Python example for sending UDP commands from a computer.

## Development Rules

- Keep the project simple and accessible: static documentation, Arduino firmware, and KiCad/schematic files.
- Do not commit `secrets.h` or real WiFi credentials.
- Preserve the Arduino sketch folder/file naming convention with underscores; Arduino IDE expects the `.ino` name to match the folder name.
- For the first and second prototypes, target Arduino UNO R4 WiFi unless the user explicitly asks to move to ESP32/ESP8266.
- Keep UDP port `4444` unless the user changes the protocol decision.
- Device ID for the first prototype is `haptell-01`.
- Device ID for the second DRV2605L + LRA prototype is `haptell-02`.
- Prefer non-blocking firmware behavior so the device can receive new commands while a pattern is playing.
- Do not drive motors directly from GPIO pins. Document and use a driver stage.
- When adding hardware, include both human-readable documentation and schematic source files.

## Verification

When possible, compile the first firmware with Arduino CLI:

```powershell
arduino-cli compile --fqbn arduino:renesas_uno:unor4wifi firmware/haptell_01_uno_r4_wifi_dc_coin
arduino-cli compile --fqbn arduino:renesas_uno:unor4wifi firmware/haptell_02_uno_r4_wifi_drv2605l_lra
arduino-cli compile --fqbn arduino:renesas_uno:unor4wifi firmware/haptell_02_uno_r4_wifi_drv2605l_lra_simple_blocking
```

The second firmware requires the `Adafruit DRV2605 Library`, which also uses `Adafruit BusIO`.

When working on KiCad schematics, verify that the schematic can be loaded/exported:

```powershell
& 'C:/Users/Nullyks/AppData/Local/Programs/KiCad/10.0/bin/kicad-cli.exe' sch export svg --output $env:TEMP/haptell-02-kicad-check schematics/haptell-02-drv2605l-lra/haptell-02-drv2605l-lra.kicad_sch
& 'C:/Users/Nullyks/AppData/Local/Programs/KiCad/10.0/bin/kicad-cli.exe' sch erc --output $env:TEMP/haptell-02-kicad-erc.rpt schematics/haptell-02-drv2605l-lra/haptell-02-drv2605l-lra.kicad_sch
```

The `haptell-02` KiCad schematic uses embedded documentation symbols, so ERC may report library warnings for those custom symbols even when there are no connection errors.

## GitHub

- Public repository: https://github.com/nullyks/haptell-devices
- Default branch: `main`
- Initial public repo was created from this local folder: `C:/Users/Tanel Toova/Documents/haptell-devices`
