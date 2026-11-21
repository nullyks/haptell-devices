<script setup>
import wiring from "../../schematics/haptell-05-servo-weight/wiring-diagram.svg";
</script>

# Haptell-05 · Weighted servo

## Identify your device

A 270° hobby servo moves an offset weight attached to its horn. The
software sets angles over time. You need an Arduino UNO R4 WiFi, the
270° servo and a separate supply rated for the servo's stall current
(about 2.7 A for the documented servo). Leave the weight off for
initial calibration and testing.

## Wire the circuit

<WiringDiagram :src="wiring" alt="Arduino D9 drives the servo signal, while a separate servo supply and Arduino USB supply share ground." />

| From | To |
| --- | --- |
| Arduino USB-C | USB power |
| Arduino D9 | Servo signal lead |
| External 4.8–6.8 V supply positive | Servo V+ |
| External supply GND | Servo GND and Arduino GND |

Verify the supply range and wire labels on your servo. The servo gets its
power from the external supply. Keep the horn clear of the wiring and
enclosure throughout the motion.

[Editable wiring diagram](https://github.com/nullyks/haptell-devices/blob/main/schematics/haptell-05-servo-weight/diagram.md)

## Upload the firmware

Open [`haptell_05_uno_r4_wifi_servo_weight_shape_blocking.ino`](https://github.com/nullyks/haptell-devices/blob/main/firmware/haptell_05_uno_r4_wifi_servo_weight_shape_blocking/haptell_05_uno_r4_wifi_servo_weight_shape_blocking.ino)
and follow the [Arduino and WiFi setup](../start.md#upload-the-matching-sketch).
Install the **Servo** library through Arduino Library Manager. This tool
sends the `servo-shape` command, which the sketch accepts without a target
prefix.

## Run the first test

From the repository folder, run this command.

```powershell
node tools/haptell_05_servo_shape_designer/server.js
```

Open [`http://127.0.0.1:8084`](http://127.0.0.1:8084) and enter the Arduino
IP from Serial Monitor. This sketch receives commands on **UDP 4444**.

Try the **Nudge** preset and use **Play** in the preview panel to check the
motion around the 135° center before sending. Verify the pulse mapping
against the servo documentation. Click **Send Shape** with the servo
unloaded and expect a small movement back toward center.

The animation panel's **Stop** controls the preview. The blocking sketch
cannot process a UDP Stop during motion. It handles Stop when it returns
to the command loop.

See the [Servo Shape Designer reference](../haptell-05-servo-shape-designer.md)
for angle limits, easing and pulse width.
