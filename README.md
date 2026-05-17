# Haptell Devices

Firmware and hardware notes for wireless handheld haptic artifacts.

The first prototype, `haptell-01`, uses an Arduino UNO R4 WiFi to drive a small 3-5 V DC coin vibration motor. The second prototype, `haptell-02`, uses the same board with a DRV2605L haptic driver and a Vybronics LRA actuator. Commands are sent over UDP on a closed WiFi subnet. Haptic patterns are defined in the device firmware and triggered with simple text commands.

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

## Repository Layout

```text
firmware/
  haptell_01_uno_r4_wifi_dc_coin/
    haptell_01_uno_r4_wifi_dc_coin.ino
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
docs/
  command-protocol.md
  hardware-notes.md
tools/
  udp_sender/
    send_haptell_command.py
    README.md
  udp_web_sender/
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

See `docs/command-protocol.md` for the supported commands.

You can also use the Python sender example in `tools/udp_sender/`:

```powershell
python tools/udp_sender/send_haptell_command.py 192.168.1.42 pulse intensity=180 duration=800
```

Or start the local browser-based Node.js sender:

```powershell
node tools/udp_web_sender/server.js
```

Then open `http://127.0.0.1:8080`.

## Hardware Warning

Do not drive vibration motors directly from an Arduino GPIO pin. Use the MOSFET driver circuit in `schematics/haptell-01-dc-coin-motor/` for the DC motor prototype, or the DRV2605L driver circuit in `schematics/haptell-02-drv2605l-lra/` for the LRA prototype.

The first prototype can use the available IRF3205 MOSFET with the Arduino UNO R4 WiFi's 5 V logic output. For future ESP32/ESP8266 versions, replace it with a logic-level MOSFET that switches well at 3.3 V gate drive.

LRA actuators such as the VG1040003D require an appropriate haptic driver. Do not connect the LRA directly to Arduino GPIO, PWM, or a simple DC MOSFET switch.

## References

- Arduino UNO R4 WiFi product page: https://store.arduino.cc/products/uno-r4-wifi
- TI DRV2605L product page: https://www.ti.com/product/DRV2605L
- Seeed Studio LiPo Rider Plus wiki: https://wiki.seeedstudio.com/Lipo-Rider-Plus/
- Vybronics VG2230001H LRA: https://www.vybronics.com/coin-vibration-motors/lra/v-g2230001h
- Vybronics VG1040003D LRA: https://www.vybronics.com/coin-vibration-motors/lra/v-g1040003d
