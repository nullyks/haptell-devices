# Codex Handoff: Haptell Devices

This file is project memory for continuing work with Codex on another computer.

## Project Goal

Create wireless handheld haptic artifacts called **Haptell devices**. Each artifact receives commands over WiFi and plays predefined haptic patterns stored in its firmware. The project should support multiple hardware variants over time, starting with a very simple DC vibration motor prototype.

The repository is public because the user wants to continue development from another computer by cloning the GitHub repo.

Repository: https://github.com/nullyks/haptell-devices

Related enclosure and physical model development repository:
https://github.com/nullyks/haptell-models

## User Preferences and Decisions

- Repository content should be in English because it is the client's communication language.
- The user speaks Estonian and may continue project discussion in Estonian.
- Keep the repository focused on firmware and schematics.
- Do not add private WiFi credentials to GitHub.
- Use `secrets.h` locally and commit only `secrets.example.h`.
- Start with Arduino UNO R4 WiFi.
- First device name: `haptell-01`.
- Second device name: `haptell-02`.
- Use UDP for the first closed-subnet prototype.
- UDP port: `4444`.
- Haptic patterns are predefined in firmware at this stage.
- Future goal: up to 10 artifacts on the same closed WiFi subnet.
- Include human-readable schematic documentation and client-readable diagrams.

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
- Tectonic TEAX13C02-8/RH: 8 ohm audio exciter, nominal resonance around 560 Hz, intended here for frequency-controlled haptic texture experiments

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

### haptell-02 PAM8403 / VG2230001H Variant

The repository now includes a separate `haptell-02` firmware and wiring note for
the Vybronics VG2230001H 70 Hz actuator:

```text
firmware/haptell_02_uno_r4_wifi_pam8403_vg2230001h/
schematics/haptell-02-pam8403-vg2230001h/
```

This variant uses Arduino UNO R4 WiFi `A0` / `DAC` to generate a 70 Hz sine
carrier. A PAM8403 class-D audio amplifier drives the VG2230001H from one
bridged output channel. The firmware accepts the same `haptell-02` UDP commands,
including `shape`, but maps intensity to carrier amplitude instead of DRV2605L
RTP values.

The firmware default `MAX_DAC_SWING_COUNTS` is intentionally conservative and
should be tuned only after measuring AC Vrms across the connected actuator.

### haptell-03 PAM8403 / TEAX13C02-8/RH Variant

The repository now includes a separate `haptell-03` firmware and wiring note for
the Tectonic TEAX13C02-8/RH 8 ohm audio exciter:

```text
firmware/haptell_03_uno_r4_wifi_pam8403_teax13c02_8ohm/
firmware/haptell_03_uno_r4_wifi_pam8403_teax13c02_8ohm_simple_blocking/
schematics/haptell-03-pam8403-teax13c02-8ohm/
tools/haptell_03_frequency_web_sender/
```

This variant uses Arduino UNO R4 WiFi `A0` / `DAC` to generate a sine carrier
whose amplitude and frequency both change over time. A PAM8403 class-D audio
amplifier drives the TEAX13C02-8/RH from one bridged output channel.

The custom command is:

```text
haptell-03 pattern duration=1200 points=0:0:560,80:150:560,700:180:760,1200:0:560
```

Each point is `timeMs:amplitude:frequencyHz`. The firmware linearly
interpolates amplitude and frequency between points. The accepted frequency
range is `40..1500 Hz`; the useful tactile range depends strongly on the
exciter mounting and the surface it drives.

### haptell-04 Triple DC Motor Variant

The repository now includes a shape-only `haptell-04` path for three DC
vibration motors:

```text
firmware/haptell_04_uno_r4_wifi_triple_dc_shape_blocking/
schematics/haptell-04-triple-dc-motor/
tools/haptell_04_triple_shape_designer/
```

It is similar to haptell-01, but uses three MOSFET-switched motor channels on
Arduino PWM pins `D9`, `D10`, and `D11`. The command format is:

```text
haptell-04-triple-dc-shape shape duration=3000 points=0:0:0:0,500:180:60:0,2200:80:180:140,3000:0:0:0
```

Each point is `timeMs:motor1:motor2:motor3`. The firmware linearly interpolates
all three motor intensities independently.

### haptell-05 Weighted Servo Variant

The repository now includes a shape-only `haptell-05` path for a weighted 270
degree hobby servo:

```text
firmware/haptell_05_uno_r4_wifi_servo_weight_shape_blocking/
schematics/haptell-05-servo-weight/
tools/haptell_05_servo_shape_designer/
```

The Arduino sends the servo signal on `D9`. The servo must use a separate
`4.8-6.8 V` supply sized for stall current, with common ground tied to Arduino
GND. Do not power the servo from the Arduino 5 V pin.

The command format is:

```text
servo-shape duration=800 points=0:135:linear,120:175:easeOut,260:95:easeInOut,800:135:easeOut
```

Each point is `timeMs:angleDeg:easing`. Supported easing values are `linear`,
`easeIn`, `easeOut`, and `easeInOut`. The firmware also accepts addressed forms
with `haptell-05-servo-shape` or `haptell-05`.

## Second Prototype Architecture

The second prototype is `haptell-02`:

- Board: Arduino UNO R4 WiFi
- Haptic driver: Mavaol DRV2605L haptic motor controller module over I2C
- Actuator: Vybronics VG1040003D LRA, 10 x 4 mm, 2.5 Vrms, 170 Hz
- Power: 3.7 V 1S protected LiPo battery -> Seeed Studio LiPo Rider Plus -> regulated 5 V rail
- Driver power: LiPo Rider Plus 5 V rail to DRV2605L VIN/VCC
- Controller power: LiPo Rider Plus 5 V rail to Arduino UNO R4 WiFi USB-C power input
- Signal wiring: Arduino SDA/SCL to DRV2605L SDA/SCL
- Actuator wiring: DRV2605L OUT+ and OUT- directly to the LRA leads

Do not add the DC motor flyback diode across the LRA output. The DRV2605L output is a differential haptic-driver output, not a simple switched inductive DC load.

## First Prototype Architecture

The first prototype is `haptell-01`:

- Board: Arduino UNO R4 WiFi
- Motor: 3-5 V DC coin vibration motor, 67 mA
- Driver: low-side N-channel MOSFET switch
- PWM pin: Arduino `D9`
- Gate resistor: 220 ohm
- Gate pulldown: 10k
- Flyback diode: 1N5819 across the motor
- Power: 3.7 V 1S protected LiPo battery -> LiPo Rider Plus charger/booster -> regulated 5 V rail
- Controller power: LiPo Rider Plus 5 V output to Arduino UNO R4 WiFi USB-C power input
- Motor driver power: LiPo Rider Plus 5 V output to motor positive lead / MOSFET driver 5 V side

IRF3205 is not ideal as a general-purpose low-voltage logic MOSFET, but it is acceptable for the first Arduino UNO R4 WiFi test because UNO R4 has 5 V logic and the motor current is small. For ESP32/ESP8266 prototypes, use a logic-level MOSFET that switches well at 3.3 V.

## Firmware Context

Current firmware path:

```text
firmware/haptell_01_uno_r4_wifi_dc_coin/haptell_01_uno_r4_wifi_dc_coin.ino
```

Simple blocking first prototype firmware example:

```text
firmware/haptell_01_uno_r4_wifi_dc_coin_simple_blocking/haptell_01_uno_r4_wifi_dc_coin_simple_blocking.ino
```

Second prototype firmware path:

```text
firmware/haptell_02_uno_r4_wifi_drv2605l_lra/haptell_02_uno_r4_wifi_drv2605l_lra.ino
```

Simple blocking second prototype firmware example:

```text
firmware/haptell_02_uno_r4_wifi_drv2605l_lra_simple_blocking/haptell_02_uno_r4_wifi_drv2605l_lra_simple_blocking.ino
```

PAM8403 / VG2230001H firmware path:

```text
firmware/haptell_02_uno_r4_wifi_pam8403_vg2230001h/haptell_02_uno_r4_wifi_pam8403_vg2230001h.ino
```

PAM8403 / VG2230001H simple blocking firmware path:

```text
firmware/haptell_02_uno_r4_wifi_pam8403_vg2230001h_simple_blocking/haptell_02_uno_r4_wifi_pam8403_vg2230001h_simple_blocking.ino
```

haptell-03 PAM8403 / TEAX13C02-8/RH firmware path:

```text
firmware/haptell_03_uno_r4_wifi_pam8403_teax13c02_8ohm/haptell_03_uno_r4_wifi_pam8403_teax13c02_8ohm.ino
```

haptell-03 PAM8403 / TEAX13C02-8/RH simple blocking firmware path:

```text
firmware/haptell_03_uno_r4_wifi_pam8403_teax13c02_8ohm_simple_blocking/haptell_03_uno_r4_wifi_pam8403_teax13c02_8ohm_simple_blocking.ino
```

haptell-04 triple DC shape-only firmware path:

```text
firmware/haptell_04_uno_r4_wifi_triple_dc_shape_blocking/haptell_04_uno_r4_wifi_triple_dc_shape_blocking.ino
```

haptell-05 weighted servo shape-only firmware path:

```text
firmware/haptell_05_uno_r4_wifi_servo_weight_shape_blocking/haptell_05_uno_r4_wifi_servo_weight_shape_blocking.ino
```

The firmware:

- Uses `WiFiS3.h` and `WiFiUdp.h`.
- Includes local `secrets.h`.
- Listens on UDP port `4444`.
- Uses device ID `haptell-01`.
- Drives the motor with PWM on pin `D9`.
- Uses a non-blocking pattern player.
- Supports `pulse`, `double`, `ramp`, `shape`, and `stop`.
- Accepts the same Shape Designer `shape duration=... points=...` command; the values become DC PWM envelope points.
- Accepts commands addressed to `haptell-01` or `all`.

The second firmware:

- Uses `WiFiS3.h`, `WiFiUdp.h`, `Wire.h`, and `Adafruit_DRV2605.h`.
- Includes local `secrets.h`.
- Listens on UDP port `4444`.
- Uses device ID `haptell-02`.
- Configures the DRV2605L in LRA mode.
- Maps the shared `pulse`, `double`, `ramp`, and `stop` commands to first-pass DRV2605L effect sequences.
- Accepts commands addressed to `haptell-02` or `all`.
- Requires the Adafruit DRV2605 Arduino library.

The simple blocking example:

- Uses the same hardware, WiFi, UDP port, and device ID.
- Uses blocking `delay()` calls during playback for easier reading.
- Supports `pulse`, `double`, `ramp`, `shape`, `custom`, and `stop`.
- Accepts the same `shape duration=... points=...` command generated by the Node.js Shape Designer, but playback blocks until the shape is finished.
- Demonstrates a custom realtime playback shape with `DRV2605_MODE_REALTIME` and `setRealtimeValue()`.

There are now simple blocking examples for all current hardware paths:

- `haptell_01_uno_r4_wifi_dc_coin_simple_blocking`
- `haptell_02_uno_r4_wifi_drv2605l_lra_simple_blocking`
- `haptell_02_uno_r4_wifi_pam8403_vg2230001h_simple_blocking`
- `haptell_03_uno_r4_wifi_pam8403_teax13c02_8ohm_simple_blocking`
- `haptell_04_uno_r4_wifi_triple_dc_shape_blocking`
- `haptell_05_uno_r4_wifi_servo_weight_shape_blocking`

The blocking examples are easier to read, but they do not receive new UDP
packets while a pattern is playing.

Current patterns:

- `pulse`
- `double`
- `ramp`
- `shape` on the haptell-01 and haptell-02 firmware variants
- `pattern`, `tone`, and `sweep` on the `haptell-03` audio-exciter variants
- `stop`

Example commands:

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
all stop
haptell-03 tone amplitude=120 frequency=560 duration=500
haptell-03 sweep amplitude=140 from=180 to=900 duration=1200
haptell-03 pattern duration=1200 points=0:0:560,80:150:560,700:180:760,1200:0:560
haptell-03 stop
haptell-04-triple-dc-shape shape duration=3000 points=0:0:0:0,500:180:60:0,2200:80:180:140,3000:0:0:0
servo-shape duration=800 points=0:135:linear,120:175:easeOut,260:95:easeInOut,800:135:easeOut
```

The same `shape ...` command works across the DC, DRV2605L, and
PAM8403/VG2230001H firmware paths. DC uses it as a PWM envelope, DRV2605L uses
it as realtime playback values, and PAM8403 uses it to scale a fixed 70 Hz sine
carrier.

All current Arduino UNO R4 WiFi firmware variants were successfully compiled
locally with Arduino CLI using temporary dummy `secrets.h` files, then the dummy
credentials files were removed. This includes the DC motor non-blocking and
blocking sketches, the DRV2605L non-blocking and blocking sketches, and the
PAM8403/VG2230001H non-blocking and blocking sketches.

Installed local Arduino tooling:

- `arduino-cli` 1.4.1
- `arduino:renesas_uno` 1.5.3
- `Adafruit DRV2605 Library` 1.2.4
- `Adafruit BusIO` 1.17.4

Local schematic notes:

- KiCad and Fritzing drafts were removed from `schematics/`; the current path is manual client-readable documentation diagrams.

## Command Sender Tool

The repository includes a small Python sender:

```text
tools/udp_sender/send_haptell_command.py
```

It sends one UDP text command to a device IP address on port `4444`.

The repository also includes a local Node.js web sender:

```text
tools/udp_web_sender/server.js
```

It starts a local HTTP server at `http://127.0.0.1:8080` and provides buttons for `pulse`, `double`, `ramp`, and `stop`, plus a `haptell-02` LRA shape designer. The shape designer visualizes a realtime amplitude envelope, shows the outgoing data as a structured array, and sends compact UDP commands such as `haptell-02 shape duration=1600 points=0:0,100:180,700:180,1200:60,1600:0`. No npm packages are required.

The shape designer and firmware workflow are documented in `docs/lra-shape-designer.md`.

A dedicated `haptell-03` frequency sender is available at:

```text
tools/haptell_03_frequency_web_sender/server.js
```

It starts at `http://127.0.0.1:8081` by default. The UI visualizes both the
amplitude envelope and frequency path, shows the outgoing structured data array,
and sends compact UDP commands such as
`haptell-03 pattern duration=1200 points=0:0:560,80:150:560,700:180:760,1200:0:560`.
The workflow is documented in `docs/haptell-03-frequency-patterns.md`.

A focused amplitude-only Shape Designer is available at:

```text
tools/haptell_shape_designer/server.js
```

It starts at `http://127.0.0.1:8082` by default. It designs custom `shape`
commands up to `15000 ms` and `30` points. The graph and point table both show
point numbers to help users navigate longer shapes. The graph supports
horizontal zooming with `+`, `-`, `Fit`, mouse wheel zoom, and a pan slider.
The duration field is a plain numeric text entry; when duration changes, point
times are scaled proportionally so the relative shape timing is preserved.
The `Add Point` control has an `after` menu so users can choose after which
existing point the new point is inserted.
JSON save/load stores only the pattern; on browsers with the File System
Access API, Save Shape asks for a filename/folder and Load Shape opens a file
picker. The UI shows a blocking playback warning after Node.js confirms that
the UDP packet was sent.

It targets dedicated shape-only blocking firmware:

```text
firmware/haptell_01_uno_r4_wifi_dc_coin_shape_blocking/              -> haptell-01-dc-shape
firmware/haptell_02_uno_r4_wifi_drv2605l_lra_shape_blocking/         -> haptell-02-drv2605l-shape
firmware/haptell_02_uno_r4_wifi_pam8403_vg2230001h_shape_blocking/   -> haptell-02-pam8403-shape
```

These sketches support only `shape` and idle-state `stop`. They intentionally
do not accept `all`, because blocking playback can last 15 seconds and should
not be started accidentally on multiple devices sharing the same WiFi network.
The workflow is documented in `docs/custom-shape-designer.md`.

A dedicated haptell-04 three-motor Shape Designer is available at:

```text
tools/haptell_04_triple_shape_designer/server.js
```

It starts at `http://127.0.0.1:8083` by default. It uses one shared timeline
with three independently editable motor intensity curves and sends compact
commands such as
`haptell-04-triple-dc-shape shape duration=3000 points=0:0:0:0,500:180:60:0,2200:80:180:140,3000:0:0:0`.
The workflow is documented in `docs/haptell-04-triple-shape-designer.md`.

A dedicated haptell-05 servo Shape Designer is available at:

```text
tools/haptell_05_servo_shape_designer/server.js
```

It starts at `http://127.0.0.1:8084` by default. It designs one angle-vs-time
curve, shows the `135 deg` neutral line and a shaded safe range, supports
draggable keyframes, calculates `pulse us`, saves/loads JSON, shows speed
warnings, includes `Nudge`, `Swing`, `Kick`, `Recoil`, and `Wobble` presets,
and previews a small servo horn animation.

The shape-only blocking firmware variants now all expose Arduino Serial Plotter
envelope debug with a fixed 0..255 Y scale. DC prints
`pwm:<value> min:0 max:255`, while DRV2605L and PAM8403/VG2230001H print
`drive:<value> min:0 max:255`. For DRV2605L, `drive` is the value sent through
`setRealtimeValue()`; for PAM8403, `drive` scales the fixed 70 Hz carrier. In
all three sketches, the shape envelope update interval is `10 ms`, but Serial
Plotter output is decimated to about `240` samples per shape so the full shape
fits better in a FullHD fullscreen plotter window.

For all LRA/PAM8403 shape and pattern interpolation code, keep elapsed time and
duration in signed `long` variables before multiplying by a signed delta. This
prevents falling segments such as `210 -> 0` from overflowing through unsigned
arithmetic and clipping to `255`.

Example:

```powershell
python tools/udp_sender/send_haptell_command.py 192.168.1.42 pulse intensity=180 duration=800
```

It has no external Python dependencies.

## Schematic Context

Current schematic folder:

```text
schematics/haptell-01-dc-coin-motor/
```

Second prototype schematic folder:

```text
schematics/haptell-02-drv2605l-lra/
```

haptell-03 schematic documentation folder:

```text
schematics/haptell-03-pam8403-teax13c02-8ohm/
```

haptell-04 schematic documentation folder:

```text
schematics/haptell-04-triple-dc-motor/
```

haptell-05 schematic documentation folder:

```text
schematics/haptell-05-servo-weight/
```

Contents:

- `README.md`: BOM and connection summary.
- `diagram.md`: text and Mermaid circuit diagram.

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

The second circuit:

```text
LiPo battery -> LiPo Rider Plus battery connector
LiPo Rider Plus 5V -> Arduino USB-C 5V power input and DRV2605L VIN/VCC
LiPo Rider Plus GND -> Arduino GND and DRV2605L GND
Arduino SDA -> DRV2605L SDA
Arduino SCL -> DRV2605L SCL
DRV2605L OUT+ -> VG1040003D lead 1
DRV2605L OUT- -> VG1040003D lead 2
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
4. Test `pulse`, `double`, `ramp`, `shape`, and `stop` commands with a UDP sender.
5. Measure whether IRF3205 switches the small motor reliably at the selected PWM levels.
6. Use the Node.js web sender to design and send short `haptell-02` LRA envelope shapes.
7. Build and test the LiPo Rider Plus portable 5 V power path for haptell-01.
8. Install the Adafruit DRV2605 Arduino library and compile `haptell-02`.
9. Physically build and test the DRV2605L + VG1040003D LRA prototype.
10. Tune DRV2605L library/effect mappings for the real actuator feel.
11. Decide how device discovery and addressing should work for up to 10 artifacts.
12. Build and bench-test the `haptell-03` PAM8403 + TEAX13C02-8/RH path.
13. Use the haptell-03 web sender to test tone, sweep, and custom amplitude/frequency patterns.
14. Use the focused Shape Designer to create and save longer custom amplitude patterns.
15. Build and bench-test haptell-04 one motor channel at a time, then test all three channels with the triple Shape Designer.
16. Build and bench-test haptell-05 with a current-capable servo supply before adding the offset weight.

## Open Questions

- What closed WiFi subnet SSID/password will be used for testing?
- Should the command sender be a small Python script, a web interface, or another controller device?
- Should multi-device synchronization require acknowledgements or timed commands?
- What physical enclosure or handheld artifact form factor will the first device use?
- Which exact logic-level MOSFET should replace IRF3205 for future ESP32/ESP8266 variants?
- Which DRV2605L LRA library/effect mapping feels best with the VG1040003D in the final enclosure?

## Notes for Future Codex Sessions

- Avoid replacing the simple UDP approach until the first physical test confirms the basic haptic device works.
- Keep the first prototype intentionally small; do not overbuild a framework before hardware validation.
- If adding a sender/controller, document the exact way to test commands from Windows.
- If adding new hardware variants, keep each board/motor combination in its own firmware and schematic folder.
- When committing, verify that `secrets.h` is ignored and not staged.
