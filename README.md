# Haptell Devices

Firmware and hardware notes for wireless handheld haptic artifacts.

The first prototype, `haptell-01`, uses an Arduino UNO R4 WiFi to drive a small 3-5 V DC coin vibration motor. Commands are sent over UDP on a closed WiFi subnet. Haptic patterns are defined in the device firmware and triggered with simple text commands.

## AI Handoff

This repo includes project memory for continuing work with Codex or another AI coding assistant:

- `AGENTS.md`: repository-specific working instructions
- `CODEX_HANDOFF.md`: project context, hardware decisions, and recommended next steps

When continuing from another computer, clone the repo and ask Codex to read both files before making larger changes.

## Current Prototype

- Device ID: `haptell-01`
- Board: Arduino UNO R4 WiFi
- Actuator: 8 x 3 mm 3-5 V DC coin vibration motor, 67 mA rated current
- Driver: low-side N-channel MOSFET switch
- UDP port: `4444`
- WiFi credentials: local `secrets.h`, not committed

## Repository Layout

```text
firmware/
  haptell_01_uno_r4_wifi_dc_coin/
    haptell_01_uno_r4_wifi_dc_coin.ino
    secrets.example.h
    README.md
schematics/
  haptell-01-dc-coin-motor/
    README.md
    diagram.md
    circuit-diagram.svg
    haptell-01-dc-coin-motor.kicad_pro
    haptell-01-dc-coin-motor.kicad_sch
docs/
  command-protocol.md
  hardware-notes.md
tools/
  udp_sender/
    send_haptell_command.py
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

See `docs/command-protocol.md` for the supported commands.

You can also use the Python sender example in `tools/udp_sender/`:

```powershell
python tools/udp_sender/send_haptell_command.py 192.168.1.42 pulse intensity=180 duration=800
```

## Hardware Warning

Do not drive the vibration motor directly from an Arduino GPIO pin. Use the MOSFET driver circuit in `schematics/haptell-01-dc-coin-motor/`.

The first prototype can use the available IRF3205 MOSFET with the Arduino UNO R4 WiFi's 5 V logic output. For future ESP32/ESP8266 versions, replace it with a logic-level MOSFET that switches well at 3.3 V gate drive.

## References

- Arduino UNO R4 WiFi product page: https://store.arduino.cc/products/uno-r4-wifi
- Vybronics VG2230001H LRA: https://www.vybronics.com/coin-vibration-motors/lra/v-g2230001h
- Vybronics VG1040003D LRA: https://www.vybronics.com/coin-vibration-motors/lra/v-g1040003d
