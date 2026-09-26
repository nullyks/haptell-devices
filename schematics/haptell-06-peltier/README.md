# Haptell-06: IRLZ44N + SP1848-27145

## Components

| Component | Selection |
| --- | --- |
| Controller | Arduino UNO R4 WiFi |
| Actuator | FTVOGUE Peltier TEG SP1848-27145 |
| Switch | IRLZ44N N-channel logic-level MOSFET |
| Gate resistor | 1 kohm from D3 to gate |
| Gate pulldown | 10 kohm from gate to source/common ground |
| Battery | 3.7 V, 2000 mAh 1S LiPo; verify discharge rating and protection |
| Charger/boost | Seeed LiPo Rider Plus, 5 V output |
| Thermal hardware | Suitable heatsink and thermal interface; fan if required |
| Temperature sensor | Not installed; planned for a later version |

## Wiring

1. Battery -> Rider Plus battery input, with verified connector polarity.
2. Rider Plus 5 V -> Peltier positive lead and Arduino USB-C power input.
3. Peltier negative lead -> IRLZ44N drain.
4. IRLZ44N source -> Rider Plus GND -> Arduino GND.
5. Arduino **D3 -> 1 kohm -> gate**; gate -> 10 kohm -> source/GND.

Route Peltier load current directly through the power wiring and MOSFET,
not through Arduino GPIO or a breadboard trace rated below the load current.
The MOSFET control terminal is the **gate**, not a transistor base.
Verify the purchased component's pinout before wiring; the metal tab can be
electrically connected to drain. [Diagram source](diagram.md).

The [IRLZ44N manufacturer page](https://www.infineon.com/part/IRLZ44N) specifies
logic-level gate drive. The 1 kohm resistor limits initial D3 gate charging
current to about 5 mA; the pulldown holds the output off during reset. This is
for the board's default `analogWrite` PWM frequency; inspect gate switching
and MOSFET heating before changing that frequency.
[Arduino lists D3 as PWM-capable](https://docs.arduino.cc/tutorials/uno-r4-wifi/cheat-sheet/).

## Power and thermal behavior

The [Rider Plus specification](https://wiki.seeedstudio.com/Lipo-Rider-Plus/)
lists output up to **5 V / 2.4 A**. This budget is shared with Arduino/WiFi and
any fan. Verify the total on-state current as well as average current: lower
PWM duty does not by itself limit current during each on-pulse. Battery,
connector and wire discharge ratings must also support the boost input load.

The user has observed heating/cooling with the SP1848-27145 on this supply.
Its exact powered input current still needs measurement. Generator-output
ratings are not cooling-mode input ratings. See the [battery calculation](../../docs/haptell-06-peltier-shape-designer.md#battery-estimate).

A single MOSFET controls one polarity. It cannot swap which face heats or
cools; polarity reversal would require a different driver. Attach a heatsink
to the hot side and verify surface temperatures during supervised bench tests.
There is no temperature regulation or overtemperature cutoff in this version;
the 60-second limit and network Stop are not substitutes for either. Residual
heat remains after electrical output stops. Before skin-contact use, add
temperature sensing and a suitable independent thermal cutoff.
