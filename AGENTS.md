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
- `firmware/haptell_01_uno_r4_wifi_dc_coin/secrets.example.h`: WiFi credential template.
- `docs/command-protocol.md`: UDP command format.
- `docs/hardware-notes.md`: hardware decisions and cautions.
- `schematics/haptell-01-dc-coin-motor/`: first prototype schematic docs, SVG diagram, and KiCad draft.

## Development Rules

- Keep the project simple and accessible: static documentation, Arduino firmware, and KiCad/schematic files.
- Do not commit `secrets.h` or real WiFi credentials.
- Preserve the Arduino sketch folder/file naming convention with underscores; Arduino IDE expects the `.ino` name to match the folder name.
- For the first prototype, target Arduino UNO R4 WiFi unless the user explicitly asks to move to ESP32/ESP8266.
- Keep UDP port `4444` unless the user changes the protocol decision.
- Device ID for the first prototype is `haptell-01`.
- Prefer non-blocking firmware behavior so the device can receive new commands while a pattern is playing.
- Do not drive motors directly from GPIO pins. Document and use a driver stage.
- When adding hardware, include both human-readable documentation and schematic source files.

## Verification

When possible, compile the first firmware with Arduino CLI:

```powershell
& 'C:/Program Files/Arduino IDE/resources/app/lib/backend/resources/arduino-cli.exe' compile --fqbn arduino:renesas_uno:unor4wifi 'C:/Users/Tanel Toova/Documents/haptell-devices/firmware/haptell_01_uno_r4_wifi_dc_coin'
```

If working on another computer, adapt the path to `arduino-cli`.

## GitHub

- Public repository: https://github.com/nullyks/haptell-devices
- Default branch: `main`
- Initial public repo was created from this local folder: `C:/Users/Tanel Toova/Documents/haptell-devices`

