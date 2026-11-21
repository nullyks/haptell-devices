<script setup>
import wiring from "../../schematics/haptell-01-dc-coin-motor/wiring-diagram.png";
</script>

# Haptell-01 · Coin vibration motor

## Identify your device

This is the simplest Haptell prototype. It vibrates one small DC coin motor
using an N-channel MOSFET as a switch. Use an Arduino UNO R4 WiFi, a 3–5 V
coin motor, an IRF3205, 220 Ω and 10 kΩ resistors, a 1N5819 diode, a LiPo Rider
Plus and a protected 3.7 V 1S LiPo battery.

## Wire the circuit

<WiringDiagram :src="wiring" alt="Wiring for a DC coin motor on Arduino D9 through an IRF3205 MOSFET, with a flyback diode and shared ground." />

| From | To |
| --- | --- |
| Battery connector | Rider Plus BAT input |
| Rider Plus 5 V output | Arduino USB-C power input and motor positive lead |
| Arduino D9 | MOSFET gate through the 220 Ω resistor |
| MOSFET gate | Common GND through the 10 kΩ resistor |
| Motor negative lead | MOSFET drain |
| MOSFET source and Arduino GND | Rider Plus GND |
| 1N5819 diode | Striped end to motor positive / 5 V. Other end to motor negative / drain. |

The motor draws from the 5 V supply through the MOSFET. Keep its wires off
the Arduino signal pin.

[Editable wiring diagram](https://github.com/nullyks/haptell-devices/blob/main/schematics/haptell-01-dc-coin-motor/diagram.md)

## Upload the firmware

Open [`haptell_01_uno_r4_wifi_dc_coin.ino`](https://github.com/nullyks/haptell-devices/blob/main/firmware/haptell_01_uno_r4_wifi_dc_coin/haptell_01_uno_r4_wifi_dc_coin.ino)
and follow the [Arduino and WiFi setup](../start.md#upload-the-matching-sketch).
The UNO R4 board package supplies the libraries for this sketch. For
the simple blocking and dedicated shape-only versions, see the
[firmware compatibility table](../firmware-variants.md#haptell-01).

## Run the first test

From the repository folder, run this command.

```powershell
node tools/udp_web_sender/server.js
```

Open [`http://127.0.0.1:8080`](http://127.0.0.1:8080) and enter the Arduino
IP from Serial Monitor. This sketch receives commands on **UDP 4444**.

Select target **haptell-01**. In the **Pulse** panel set intensity to 120 and
duration to 350 ms, then click **Send Pulse**. Expect one short buzz.
**Send Stop** can interrupt a running pattern with this sketch.

See the [UDP command examples](../command-protocol.md#pulse) or use the
[Custom Shape Designer](../custom-shape-designer.md) with its matching sketch.
