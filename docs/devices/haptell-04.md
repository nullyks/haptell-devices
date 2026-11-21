<script setup>
import wiring from "../../schematics/haptell-04-triple-dc-motor/wiring-diagram.svg";
</script>

# Haptell-04 · Three vibration motors

## Identify your device

This device controls three DC coin vibration motors independently.
Use an Arduino UNO R4 WiFi, a LiPo Rider Plus and protected 3.7 V 1S LiPo,
plus one 3–5 V DC coin motor, N-channel MOSFET, 220 Ω resistor, 10 kΩ resistor
and 1N5819 diode per channel.

## Wire the circuit

<WiringDiagram :src="wiring" alt="One DC motor driver to repeat for M1, M2 and M3, including 5 V, ground, gate resistors, and flyback diode." />

Repeat the circuit for each motor. The motors share the supply and ground
but each has its own signal and switch.

| From | To |
| --- | --- |
| Battery | Rider Plus BAT input |
| Rider Plus 5 V | Arduino USB-C power input and all motor positive leads |
| D9, D10, D11 | M1, M2, M3 MOSFET gates via individual 220 Ω resistors |
| Each gate | Common ground through its own 10 kΩ resistor |
| Each motor negative lead | Drain of its own MOSFET |
| All MOSFET sources and Arduino GND | Rider Plus GND |
| Each 1N5819 diode | Striped end to that motor's positive lead. Other end to its negative lead. |

[Editable wiring diagram](https://github.com/nullyks/haptell-devices/blob/main/schematics/haptell-04-triple-dc-motor/diagram.md)

## Upload the firmware

Open [`haptell_04_uno_r4_wifi_triple_dc_shape_blocking.ino`](https://github.com/nullyks/haptell-devices/blob/main/firmware/haptell_04_uno_r4_wifi_triple_dc_shape_blocking/haptell_04_uno_r4_wifi_triple_dc_shape_blocking.ino)
and follow the [Arduino and WiFi setup](../start.md#upload-the-matching-sketch).
The UNO R4 board package supplies the libraries. The exact target is
`haptell-04-triple-dc-shape`.

## Run the first test

From the repository folder, run this command.

```powershell
node tools/haptell_04_triple_shape_designer/server.js
```

Open [`http://127.0.0.1:8083`](http://127.0.0.1:8083) and enter the Arduino
IP from Serial Monitor. This sketch receives commands on **UDP 4444**.

Start with only M1 connected. In the point table set the first and last M1
values to 0 and a middle M1 value to about 120. Keep M2 and M3 at zero and
use a short duration such as 2 seconds. Click **Send Shape**. Expect M1 to
ramp up and back down. If the motor does not start, check its channel
connections before increasing the value. Repeat with the other channels
one at a time.

The sketch finishes the current shape before processing another UDP
command. It handles `stop` when idle.

See the [Triple Shape Designer reference](../haptell-04-triple-shape-designer.md)
for the three-channel command and JSON format.
