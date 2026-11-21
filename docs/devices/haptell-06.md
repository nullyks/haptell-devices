<script setup>
import wiring from "../../schematics/haptell-06-peltier/wiring-diagram.svg";
</script>

# Haptell-06 · Single Peltier

## Identify your device

A Peltier module moves heat from one face to the other when powered.
This prototype uses an SP1848-27145 module, an IRLZ44N MOSFET, a LiPo Rider
Plus with a 3.7 V 1S LiPo, and a separately powered Arduino UNO R4 WiFi.
Use a suitable heatsink and thermal interface. The circuit has no
temperature sensing or thermal cutoff.

## Wire the circuit

<WiringDiagram :src="wiring" alt="A separately powered Arduino uses D3 to control an IRLZ44N, with one Peltier module powered by the LiPo Rider Plus." />

| From | To |
| --- | --- |
| Separate USB supply | Arduino USB-C input |
| LiPo battery | Rider Plus BAT input |
| Rider Plus 5 V | Peltier positive lead |
| Peltier negative lead | IRLZ44N drain |
| IRLZ44N source and Arduino GND | Rider Plus GND |
| Arduino D3 | IRLZ44N gate, directly in the documented prototype |

The documented prototype has operated from a battery, but its on-state
current is unmeasured. Verify connector polarity, MOSFET pinout and supply
current before a supervised powered test. PWM changes the share of time
the switch is on. Even at low duty, the on-pulse draws the full on-state current.

[Editable wiring diagram](https://github.com/nullyks/haptell-devices/blob/main/schematics/haptell-06-peltier/diagram.md)

## Upload the firmware

Open [`haptell_06_uno_r4_wifi_peltier_shape.ino`](https://github.com/nullyks/haptell-devices/blob/main/firmware/haptell_06_uno_r4_wifi_peltier_shape/haptell_06_uno_r4_wifi_peltier_shape.ino)
and follow the [Arduino and WiFi setup](../start.md#upload-the-matching-sketch).
The UNO R4 board package supplies the libraries. The exact target is
`haptell-06-peltier-shape`.

## Run the first test

From the repository folder, run this command.

```powershell
node tools/haptell_06_peltier_shape_designer/server.js
```

Open [`http://127.0.0.1:8085`](http://127.0.0.1:8085) and enter the Arduino
IP from Serial Monitor. This sketch receives commands on **UDP 4445**.

Leave actuator power disconnected for the first software check. Choose
**All Off**, verify the preview contains only zero PWM values, then click
**Send Shape**. Expect the sender to report a transmission and estimate
playback time. **Stop** sends an interrupt to the Arduino. UDP transmission
alone gives no confirmation of receipt. Before trying powered patterns,
verify the supply and monitor the hot-side and contact-surface temperatures.

See the [Peltier Shape Designer reference](../haptell-06-peltier-shape-designer.md)
for time handles, JSON, battery estimates and temperature measurement.
