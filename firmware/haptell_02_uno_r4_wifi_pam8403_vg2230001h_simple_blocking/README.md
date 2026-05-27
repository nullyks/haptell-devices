# haptell-02 Simple Blocking PAM8403 + VG2230001H Firmware

This is the beginner-friendly blocking version of the `haptell-02` PAM8403 /
VG2230001H firmware. It uses the same hardware and UDP command format as the
main non-blocking version, but playback stays inside the active pattern function
until the envelope is finished.

For a line-by-line explanation, see `CODE_WALKTHROUGH.md`.

## Setup

1. Install the Arduino IDE.
2. Install/select the Arduino UNO R4 WiFi board package.
3. Copy `secrets.example.h` to `secrets.h`.
4. Add WiFi credentials to `secrets.h`.
5. Open `haptell_02_uno_r4_wifi_pam8403_vg2230001h_simple_blocking.ino`.
6. Upload to Arduino UNO R4 WiFi.

No external Arduino library is required beyond the UNO R4 WiFi board package.

## Wiring Summary

Use the same wiring as the main PAM8403 firmware:

- LiPo Rider Plus 5 V output -> Arduino UNO R4 WiFi USB-C 5 V power input
- LiPo Rider Plus 5 V output -> PAM8403 `5V` / `VCC`
- Common GND -> Arduino GND and PAM8403 GND
- Arduino `A0` / `DAC` -> one PAM8403 channel input through the module input coupling path
- VG2230001H lead 1 -> same PAM8403 channel `L+`
- VG2230001H lead 2 -> same PAM8403 channel `L-`

Do not connect either PAM8403 output lead to GND.

## Supported Commands

```text
haptell-02 pulse intensity=180 duration=800
haptell-02 double intensity=220 gap=120
haptell-02 ramp from=60 to=220 duration=1200
haptell-02 shape duration=1600 points=0:0,100:180,700:180,1200:60,1600:0
haptell-02 stop
```

The `shape` command uses the same Shape Designer format as the non-blocking
PAM8403 firmware.

## Blocking Behavior

While a pattern is playing, this sketch continues to generate the 70 Hz carrier
but does not read new UDP packets. A `stop` command can only be handled after
the current blocking playback function returns.

Use the main `haptell_02_uno_r4_wifi_pam8403_vg2230001h` firmware when
responsive interruption is needed.
