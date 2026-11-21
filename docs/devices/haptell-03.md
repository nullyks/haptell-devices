<script setup>
import wiring from "../../schematics/haptell-03-pam8403-teax13c02-8ohm/wiring-diagram.png";
</script>

# Haptell-03 · Audio exciter

## Identify your device

This circuit turns a mounted surface into a vibration source. You need
an Arduino UNO R4 WiFi, a PAM8403 amplifier, a Tectonic TEAX13C02-8/RH
8 Ω exciter and a 5 V supply that can power the board and amplifier.
Frequency and strength can both change during playback.

## Wire the circuit

<WiringDiagram :src="wiring" alt="Arduino A0 feeds an AC-coupled PAM8403 input, and the exciter is connected across L+ and L−." />

| From | To |
| --- | --- |
| Regulated 5 V rail | Arduino USB-C input and PAM8403 VCC |
| Arduino GND | PAM8403 GND and supply GND |
| Arduino A0 (DAC) | PAM8403 L-IN through an AC-coupled input |
| PAM8403 L+ and L− | The two exciter leads |

Mount the exciter to a suitable test surface. Keep both PAM8403 outputs
isolated from ground. Leave the second amplifier channel disconnected and
use only the differential pair L+ and L−.

[Editable wiring diagram](https://github.com/nullyks/haptell-devices/blob/main/schematics/haptell-03-pam8403-teax13c02-8ohm/diagram.md)

## Upload the firmware

Open [`haptell_03_uno_r4_wifi_pam8403_teax13c02_8ohm.ino`](https://github.com/nullyks/haptell-devices/blob/main/firmware/haptell_03_uno_r4_wifi_pam8403_teax13c02_8ohm/haptell_03_uno_r4_wifi_pam8403_teax13c02_8ohm.ino)
and follow the [Arduino and WiFi setup](../start.md#upload-the-matching-sketch).
The UNO R4 board package supplies the libraries. See
[Haptell-03 firmware variants](../firmware-variants.md#haptell-03) for the
simple blocking sketch.

## Run the first test

From the repository folder, run this command.

```powershell
node tools/haptell_03_frequency_web_sender/server.js
```

Open [`http://127.0.0.1:8081`](http://127.0.0.1:8081) and enter the Arduino
IP from Serial Monitor. This sketch receives commands on **UDP 4444**.

Select **haptell-03** and start with low amplifier gain. In the **Tone**
panel try amplitude 40, frequency 560 Hz and duration 350 ms, then click
**Send Tone**. Expect a short buzz that may be audible depending on the
surface. **Send Stop** can interrupt a running tone, sweep or pattern
with the recommended sketch.

See [Haptell-03 frequency patterns](../haptell-03-frequency-patterns.md)
to edit amplitude and frequency together.
