# Codex Handoff: Haptell Devices

This file is project memory for continuing work with Codex on another computer.

## Project Goal

Create wireless handheld haptic artifacts called **Haptell devices**. Each artifact receives commands over WiFi and plays predefined haptic patterns stored in its firmware. The project should support multiple hardware variants over time, starting with a very simple DC vibration motor prototype.

The repository is public because the user wants to continue development from another computer by cloning the GitHub repo.

Repository: https://github.com/nullyks/haptell-devices

## User Preferences and Decisions

- Repository content should be in English because it is the client's communication language.
- The user speaks Estonian and may continue project discussion in Estonian.
- Keep the repository focused on firmware and schematics.
- Do not add private WiFi credentials to GitHub.
- Use `secrets.h` locally and commit only `secrets.example.h`.
- Start with Arduino UNO R4 WiFi.
- First device name: `haptell-01`.
- Use UDP for the first closed-subnet prototype.
- UDP port: `4444`.
- Haptic patterns are predefined in firmware at this stage.
- Future goal: up to 10 artifacts on the same closed WiFi subnet.
- Include both human-readable schematic documentation and KiCad files.

## Hardware Context

### Available Development Boards

- Arduino UNO R4 WiFi
- Heltec WiFi Kit 32 V3
- AZ-Delivery NodeMCU Lolin V3 ESP8266

### Motors and Actuators

First prototype:

- Mini vibration motor, DC 3-5 V
- Flat coin/button type
- 8 x 3 mm
- Rated current: 67 mA
- Rated voltage: DC 3 V
- Voltage range: DC 3-5 V

Planned LRA actuators:

- Vybronics VG2230001H: 2 Vrms, 70 Hz LRA/voice-coil style actuator
- Vybronics VG1040003D: 2.5 Vrms, 170 Hz LRA

Important: LRA motors should not be driven like the DC coin motor. Use a suitable haptic driver such as DRV2605L, a suitable amplifier approach, or another proper AC drive circuit.

### Components the User Has

- IRF3205 N-channel MOSFET
- 9 V batteries
- 1N5819 diodes
- Resistors of different values
- Other simple prototyping components

### Ordered Components

- LiPo Rider Plus charger/booster, 5 V / 2.4 A, USB-C
- 3.7 V 1S LiPo batteries, 2000 mAh, protection board, Micro JST 1.25 plug
- DRV2605L haptic motor controller I2C vibration feedback module, analog/audio trigger, 3 V / 5 V input
- PAM8403 2 x 3 W class-D amplifier boards, 2.5-5 V input

## First Prototype Architecture

The first prototype is `haptell-01`:

- Board: Arduino UNO R4 WiFi
- Motor: 3-5 V DC coin vibration motor, 67 mA
- Driver: low-side N-channel MOSFET switch
- PWM pin: Arduino `D9`
- Gate resistor: 220 ohm
- Gate pulldown: 10k
- Flyback diode: 1N5819 across the motor
- Test power: 9 V battery to Arduino barrel jack / VIN for short tests only
- Intended portable power later: LiPo battery -> LiPo Rider Plus -> regulated 5 V rail

IRF3205 is not ideal as a general-purpose low-voltage logic MOSFET, but it is acceptable for the first Arduino UNO R4 WiFi test because UNO R4 has 5 V logic and the motor current is small. For ESP32/ESP8266 prototypes, use a logic-level MOSFET that switches well at 3.3 V.

## Firmware Context

Current firmware path:

```text
firmware/haptell_01_uno_r4_wifi_dc_coin/haptell_01_uno_r4_wifi_dc_coin.ino
```

The firmware:

- Uses `WiFiS3.h` and `WiFiUdp.h`.
- Includes local `secrets.h`.
- Listens on UDP port `4444`.
- Uses device ID `haptell-01`.
- Drives the motor with PWM on pin `D9`.
- Uses a non-blocking pattern player.
- Accepts commands addressed to `haptell-01` or `all`.

Current patterns:

- `pulse`
- `double`
- `ramp`
- `stop`

Example commands:

```text
haptell-01 pulse intensity=180 duration=800
haptell-01 double intensity=220 gap=120
haptell-01 ramp from=60 to=255 duration=1200
haptell-01 stop
all stop
```

The first firmware was successfully compiled locally with Arduino CLI for `arduino:renesas_uno:unor4wifi`.

## Schematic Context

Current schematic folder:

```text
schematics/haptell-01-dc-coin-motor/
```

Contents:

- `README.md`: BOM and connection summary.
- `diagram.md`: text and Mermaid circuit diagram.
- `circuit-diagram.svg`: visual documentation diagram.
- `haptell-01-dc-coin-motor.kicad_pro`: KiCad project draft.
- `haptell-01-dc-coin-motor.kicad_sch`: KiCad schematic draft.

The first circuit:

```text
Arduino D9 PWM -> 220R -> MOSFET gate
MOSFET gate -> 10k -> GND
MOSFET source -> GND
MOSFET drain -> motor negative
Motor positive -> 5V
1N5819 across motor:
  cathode / marked end -> motor positive / 5V
  anode -> motor negative / MOSFET drain
```

## How to Continue on Another Computer

1. Clone the repository:

   ```powershell
   git clone https://github.com/nullyks/haptell-devices.git
   cd haptell-devices
   ```

2. Open the folder in Codex.
3. Ask Codex to read `AGENTS.md` and `CODEX_HANDOFF.md`.
4. Install/open Arduino IDE if firmware upload is needed.
5. Copy:

   ```text
   firmware/haptell_01_uno_r4_wifi_dc_coin/secrets.example.h
   ```

   to:

   ```text
   firmware/haptell_01_uno_r4_wifi_dc_coin/secrets.h
   ```

6. Fill in closed-subnet WiFi credentials.
7. Upload firmware to Arduino UNO R4 WiFi.
8. Send UDP commands to the board IP address on port `4444`.

## Recommended Next Steps

1. Physically build and test the DC motor driver circuit.
2. Upload firmware to Arduino UNO R4 WiFi.
3. Confirm the Arduino joins the WiFi network and prints its IP address to Serial Monitor.
4. Test `pulse`, `double`, `ramp`, and `stop` commands with a UDP sender.
5. Measure whether IRF3205 switches the small motor reliably at the selected PWM levels.
6. Add a small client tool or web controller for sending UDP commands.
7. After LiPo hardware arrives, document and test the portable 5 V power path.
8. Prototype DRV2605L support for the LRA motors as a separate firmware/schematic variant.
9. Decide how device discovery and addressing should work for up to 10 artifacts.

## Open Questions

- What closed WiFi subnet SSID/password will be used for testing?
- Should the command sender be a small Python script, a web interface, or another controller device?
- Should multi-device synchronization require acknowledgements or timed commands?
- What physical enclosure or handheld artifact form factor will the first device use?
- Which exact logic-level MOSFET should replace IRF3205 for future ESP32/ESP8266 variants?

## Notes for Future Codex Sessions

- Avoid replacing the simple UDP approach until the first physical test confirms the basic haptic device works.
- Keep the first prototype intentionally small; do not overbuild a framework before hardware validation.
- If adding a sender/controller, document the exact way to test commands from Windows.
- If adding new hardware variants, keep each board/motor combination in its own firmware and schematic folder.
- When committing, verify that `secrets.h` is ignored and not staged.

