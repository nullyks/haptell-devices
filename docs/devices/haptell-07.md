<script setup>
import wiring from "../../schematics/haptell-07-dual-peltier/wiring-diagram.svg";
</script>

# Haptell-07 · Dual Peltier

## Identify your device

Two SP1848-27145 thermoelectric modules each use an IRLZ44N MOSFET.
The Arduino UNO R4 WiFi controls D3 and D5 independently. The editor uses
one timeline for both PWM curves. PWM controls electrical drive, and there
are no temperature sensors or thermal cutoffs in this prototype.

## Wire the circuit

**Draft wiring.** The diagram shows a proposed shared 5 V rail from a
LiPo Rider Plus and protected 3.7 V 1S LiPo. Confirm the combined on-state
current and supply, battery, wire and connector ratings before powering
both modules. Fit suitable heatsinks and thermal interfaces.

<WiringDiagram :src="wiring" alt="Draft circuit with a separately powered Arduino, D3 and D5 driving separate IRLZ44N MOSFETs, and two Peltier modules sharing the proposed 5 V rail." />

| From | To |
| --- | --- |
| Separate USB supply | Arduino USB-C input |
| LiPo battery | Rider Plus BAT input |
| Proposed controlled 5 V rail | Peltier 1 and Peltier 2 positive leads |
| Peltier 1 negative lead | MOSFET 1 drain |
| Peltier 2 negative lead | MOSFET 2 drain |
| Arduino D3 / D5 | MOSFET 1 gate / MOSFET 2 gate, respectively |
| Both MOSFET sources and Arduino GND | Supply GND |

[Editable wiring diagram](https://github.com/nullyks/haptell-devices/blob/main/schematics/haptell-07-dual-peltier/diagram.md)

## Upload the firmware

Open [`haptell_07_uno_r4_wifi_dual_peltier_shape.ino`](https://github.com/nullyks/haptell-devices/blob/main/firmware/haptell_07_uno_r4_wifi_dual_peltier_shape/haptell_07_uno_r4_wifi_dual_peltier_shape.ino)
and follow the [Arduino and WiFi setup](../start.md#upload-the-matching-sketch).
The UNO R4 board package supplies the libraries. The sketch expects the
target `haptell-07-dual-peltier-shape`.

## Run the first test

From the repository folder, run this command.

```powershell
node tools/haptell_07_dual_peltier_shape_designer/server.js
```

Open [`http://127.0.0.1:8086`](http://127.0.0.1:8086) and enter the Arduino
IP from Serial Monitor. This sketch receives commands on **UDP 4444**.

Leave actuator power disconnected for the first software check. Select a
2-second duration and click **Add Point**. Keep D3 and D5 at zero and
expand **UDP command preview**. Check for
`duration=2000 points=0:0:0,1000:0:0,2000:0:0`.
Use **Send Shape** and **Stop Both** to check sending. The tool reports
UDP transmission and shows an estimated countdown, without confirmation
from the Arduino. A valid Stop can interrupt playback on the device.
Only proceed to a powered, supervised bench test after validating the
circuit. Test one channel at a time before testing them together.

To edit a pattern, drag circles to set PWM on each channel. Drag a colored
handle under either graph to move that point in time for both channels.
The shared table shows both values and their time.

See the [Dual Peltier Shape Designer reference](../haptell-07-dual-peltier-shape-designer.md)
for JSON and the command format.
