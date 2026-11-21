<script setup>
import wiring from "../../schematics/haptell-02-pam8403-vg2230001h/wiring-diagram.png";
</script>

# Haptell-02 · PAM8403 and VG2230001H

## Identify your device

Use this guide for a PAM8403 amplifier and Vybronics VG2230001H 70 Hz
actuator. The Arduino UNO R4 WiFi makes a 70 Hz continuous waveform at A0
when a pattern plays. The amplifier supplies the actuator current. Use a
5 V supply such as the documented LiPo Rider Plus and protected 1S LiPo.
See the [variant comparison](./haptell-02.md) if your driver is a DRV2605L.

## Wire the circuit

<WiringDiagram :src="wiring" alt="Arduino A0 feeds one PAM8403 input through an AC-coupled path, then L+ and L− connect to the VG2230001H." />

| From | To |
| --- | --- |
| Protected LiPo battery | Rider Plus BAT input |
| Rider Plus 5 V output | Arduino USB-C power input and PAM8403 VCC |
| Rider Plus GND | Arduino and amplifier GND |
| Arduino A0 (DAC) | PAM8403 L-IN through the module's AC coupling |
| PAM8403 L+ and L− | The two VG2230001H leads |

If the amplifier input is DC-coupled, add the series input capacitor
described in the [wiring notes](https://github.com/nullyks/haptell-devices/blob/main/schematics/haptell-02-pam8403-vg2230001h/README.md).
Use one output channel and keep both output pins isolated from GND.
Start with low gain if adjustable and verify differential AC voltage
with the load connected against the actuator's 2 V RMS rating.

[Editable wiring diagram](https://github.com/nullyks/haptell-devices/blob/main/schematics/haptell-02-pam8403-vg2230001h/diagram.md)

## Upload the firmware

Open [`haptell_02_uno_r4_wifi_pam8403_vg2230001h.ino`](https://github.com/nullyks/haptell-devices/blob/main/firmware/haptell_02_uno_r4_wifi_pam8403_vg2230001h/haptell_02_uno_r4_wifi_pam8403_vg2230001h.ino)
and follow the [Arduino and WiFi setup](../start.md#upload-the-matching-sketch).
The UNO R4 board package supplies the libraries. See the
[Haptell-02 firmware variants](../firmware-variants.md#haptell-02) for
the simple and dedicated shape-only sketches.

## Run the first test

From the repository folder, run this command.

```powershell
node tools/udp_web_sender/server.js
```

Open [`http://127.0.0.1:8080`](http://127.0.0.1:8080) and enter the Arduino
IP from Serial Monitor. This sketch receives commands on **UDP 4444**.

Select **haptell-02**. Start at low gain and use **Send Pulse** with a low
intensity, such as 40, and duration of 300 ms. Expect a short buzz at a
fixed 70 Hz. **Send Stop** can interrupt a running pattern with this sketch.

Use the [Custom Shape Designer](../custom-shape-designer.md) with its
dedicated PAM8403 sketch for saved amplitude patterns.
