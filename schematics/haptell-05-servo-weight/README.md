# haptell-05 Weighted Servo Actuator

This wiring variant describes an Arduino UNO R4 WiFi commanding a 270 degree
hobby servo with an attached offset weight.

The Arduino provides only the control signal. The servo must be powered from a
separate supply that can handle stall current.

## Files

- `diagram.md`: human-readable wiring explanation with a Mermaid diagram

## Bill of Materials

| Reference | Part | Notes |
| --- | --- | --- |
| U1 | Arduino UNO R4 WiFi | WiFi controller |
| M1 | 270 degree digital hobby servo | 500-2500 us pulse range |
| PS1 | 4.8-6.8 V servo supply | Size for about 2.7 A stall current |
| W1 | Offset weight and servo horn | Mechanical haptic mass |

## Connection Summary

| Arduino UNO R4 WiFi | Connection |
| --- | --- |
| `D9` | Servo signal |
| `GND` | Common ground with servo supply |
| USB-C power | Arduino power input |

Servo power:

```text
external 4.8-6.8 V supply + -> servo V+
external supply GND -> servo GND
external supply GND -> Arduino GND
Arduino D9 -> servo signal
```

## Prototype Notes

- Do not power the servo from the Arduino 5 V pin.
- Keep the common ground connection short and reliable.
- The servo can draw high current during stalls and sudden direction changes.
- Keep the first tests within a conservative angle range, for example
  `60..210 deg`.
- Make sure the offset weight cannot strike the enclosure, wiring, or the
  user's hand.

## Firmware

Use:

```text
firmware/haptell_05_uno_r4_wifi_servo_weight_shape_blocking/
```

The matching web tool is:

```text
tools/haptell_05_servo_shape_designer/
```
