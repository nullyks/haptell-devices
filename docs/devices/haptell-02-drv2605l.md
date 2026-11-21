<script setup>
import wiring from "../../schematics/haptell-02-drv2605l-lra/wiring-diagram.png";
</script>

# Haptell-02 · DRV2605L and VG1040003D

## Identify your device

Use this guide if you have a DRV2605L haptic driver and a Vybronics
VG1040003D 170 Hz linear resonant actuator (LRA). An LRA vibrates most
strongly near a specific frequency. You also need an Arduino UNO R4 WiFi,
a LiPo Rider Plus and a protected 3.7 V 1S LiPo. For the other Haptell-02
hardware, see the [variant comparison](./haptell-02.md).

## Wire the circuit

<WiringDiagram :src="wiring" alt="Arduino SDA and SCL connect to the DRV2605L module, whose two output pins connect to the VG1040003D actuator." />

| From | To |
| --- | --- |
| Protected LiPo battery | Rider Plus BAT input |
| Rider Plus 5 V output | Arduino USB-C power input and driver VIN/VCC |
| Rider Plus GND | Arduino and driver GND |
| Arduino SDA / SCL | Driver SDA / SCL, respectively |
| Driver OUT+ / OUT− | The two VG1040003D actuator leads |

Both OUT pins carry the differential drive. Connect the actuator between
them and leave both output pins isolated from ground. This circuit uses
the DRV2605L output directly without a DC-motor flyback diode.

[Editable wiring diagram](https://github.com/nullyks/haptell-devices/blob/main/schematics/haptell-02-drv2605l-lra/diagram.md)

## Upload the firmware

Open [`haptell_02_uno_r4_wifi_drv2605l_lra.ino`](https://github.com/nullyks/haptell-devices/blob/main/firmware/haptell_02_uno_r4_wifi_drv2605l_lra/haptell_02_uno_r4_wifi_drv2605l_lra.ino)
and follow the [Arduino and WiFi setup](../start.md#upload-the-matching-sketch).
Install **Adafruit DRV2605 Library** and **Adafruit BusIO** in Arduino IDE.
For the simple and dedicated shape-only sketches, see
[Haptell-02 firmware variants](../firmware-variants.md#haptell-02).

## Run the first test

From the repository folder, run this command.

```powershell
node tools/udp_web_sender/server.js
```

Open [`http://127.0.0.1:8080`](http://127.0.0.1:8080) and enter the Arduino
IP from Serial Monitor. This sketch receives commands on **UDP 4444**.

Select **haptell-02**, set **Pulse** intensity to 120 and click **Send Pulse**.
Expect a short vibration or tap. Intensity selects a built-in DRV2605L
effect. That effect determines the pulse length for this sketch.
**Send Stop** can interrupt a running pattern with this sketch.

See [DRV2605L envelope playback](../lra-shape-designer.md) for graph-based
patterns and the meaning of the drive values.
