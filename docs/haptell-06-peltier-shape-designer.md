# Haptell-06 Peltier shape workflow

This device uses an Arduino UNO R4 WiFi, an IRLZ44N low-side MOSFET on D3,
and a FTVOGUE TEG SP1848-27145 module. A 3.7 V, 2000 mAh LiPo supplies a
LiPo Rider Plus whose 5 V output powers both the module and Arduino.
Temperature sensing is planned for a later version.

## Start and edit

1. Upload `firmware/haptell_06_uno_r4_wifi_peltier_shape/` with local `secrets.h`.
2. Run `node tools/haptell_06_peltier_shape_designer/server.js`.
3. Open <http://127.0.0.1:8085> and enter the Arduino IP from Serial Monitor.
4. Set duration (0.5–60 seconds). Drag points or edit their time and PWM values.
5. Save/load JSON as needed, then select **Send Shape**.
6. Select **Stop** to send an interrupt command to the last attempted device.

The x-axis and point table show seconds in 0.5-second steps; the y-axis is PWM
0–255. PWM 0 is off,
128 is approximately 50% duty, and 255 is continuously on. This controls
the duty of switching pulses, not an analog gate voltage or a temperature.
Intermediate values are interpolated linearly. The final point is fixed at
zero. The editor supports up to 30 points and horizontal zoom/pan.

The initial pattern is all off. Presets illustrate electrical shapes only;
they do not prescribe a safe surface temperature. There is no automatic repeat.

## UDP protocol

Send these UTF-8/ASCII datagrams to **4445** (without a newline):

```text
haptell-06-peltier-shape shape duration=50000 points=0:0,10000:96,20000:96,30000:192,45000:192,50000:0
haptell-06-peltier-shape stop
```

Each point is `timeMs:pwm`. Times use integer milliseconds in the network
protocol but must be divisible by 500. They must be strictly increasing, begin at zero
and end at duration; the last PWM must be zero. Only the exact device ID is
accepted. `all` and the older port 4444 are not used for this device.

New valid shapes replace active playback. Stop works during playback. The web
tool validates commands before sending, and firmware validates independently.
Successful UDP transmission does not confirm receipt. The UI countdown is
only an estimate and does not indicate measured temperature or device state.
No ongoing browser heartbeat is required; the device finishes its bounded
shape even if the page closes, unless WiFi disconnection is detected.

## JSON

```json
{
  "schema": "haptell-peltier-shape-pattern/v1",
  "durationMs": 50000,
  "points": [
    { "timeMs": 0, "intensity": 0 },
    { "timeMs": 10000, "intensity": 96 },
    { "timeMs": 20000, "intensity": 96 },
    { "timeMs": 30000, "intensity": 192 },
    { "timeMs": 45000, "intensity": 192 },
    { "timeMs": 50000, "intensity": 0 }
  ]
}
```

`intensity` is the PWM level, retaining the existing single-channel editor's
point field name. A separate schema prevents accidental loading of vibration
patterns. Invalid files are rejected without changing the current pattern.
Device IP, port and credentials are not saved in pattern files.

## Included presets

The presets use longer intervals and larger level differences so thermal change
has time to become perceptible in the physical assembly:

| Preset | Duration | Main PWM levels |
| --- | ---: | --- |
| Soft Start | 50 s | 0 → 96, hold, then 192, hold, return to 0 |
| Long Pulse | 45 s | Ramp to 192, hold 35 s, return to 0 |
| Steps | 60 s | 64, 144 and 224 with 10–15 s holds |
| All Off | 10 s | 0 |

Choosing a preset only edits the graph; it does not send a command. These are
perceptibility-oriented test shapes, not temperature limits. Stop the test if
the surface or heatsink approaches an unsuitable temperature.

## Battery estimate

Nominal battery energy is `3.7 V × 2 Ah = 7.4 Wh`. Assuming **85% boost
efficiency** (an estimate, not a measured Rider Plus specification), available
5 V energy is about `6.29 Wh`, equivalent to `1.258 Ah` at 5 V.

`runtime hours ≈ 6.29 / (5 × average total 5 V current in A)`

| Average total 5 V current | Total load | Estimated runtime |
| --- | --- | --- |
| 0.5 A | 2.5 W | 151 minutes |
| 1.0 A | 5.0 W | 75 minutes |
| 1.5 A | 7.5 W | 50 minutes |
| 2.0 A | 10.0 W | 38 minutes |

These are scenarios, not measured consumption for SP1848-27145. Include the
Arduino, WiFi and any fan in the total. Battery condition, cutoff voltage,
temperature, conversion efficiency and wiring losses affect real runtime.
At 2 A on the 5 V output, the approximate battery current at nominal 3.7 V is
`10 W / (0.85 × 3.7 V) = 3.18 A`; 2000 mAh capacity alone does not establish
the battery's allowed discharge current.

For an approximate repeated-pattern estimate, measure the 5 V current with
PWM zero (`I_idle`) and full drive (`I_on`) under the actual thermal conditions:

`I_average ≈ I_idle + mean_duty × (I_on − I_idle)`

For linear segments, mean duty over one shape is the sum of
`segment_ms × (start_pwm + end_pwm) / (2 × 255)`, divided by total duration.
Include idle time between shapes in the cycle duration. Actual current varies
with the module temperature difference, so measuring cycle-average power is
more reliable than this interpolation.

The SP1848-27145 is documented as a thermoelectric **generator** in this
[experimental study](https://www.ijsrp.org/research-paper-0222/ijsrp-p12246.pdf).
Its quoted generated voltage/current must not be treated as its input current
when powered as a Peltier device. The user has confirmed heating/cooling in
bench tests; a verified FTVOGUE input-current specification is still missing.

See [hardware notes](../schematics/haptell-06-peltier/README.md) for connections
and the power budget.

## PWM and temperature estimation

PWM alone does not determine either surface temperature. For a level `p`, the
duty cycle is `D = p / 255`. With direct, unfiltered PWM, a first electrical
estimate is:

`P_average ≈ D × 5 V × I_on`

where `I_on` is the measured 5 V Peltier current at PWM 255 under the actual
thermal conditions. This estimates average electrical input, not cooling power
or surface temperature. The module receives full-current pulses during the on
portion; a lower duty cycle does not reduce their peak current.

A temperature prediction additionally needs the module's Seebeck coefficient,
electrical resistance and thermal conductance, plus hot- and cold-side thermal
resistances, thermal masses, ambient temperature and applied thermal load.
Published SP1848-27145 values are inconsistent and commonly describe generator
operation. They are not sufficient for a defensible cooler-temperature model.
[Experimental thermoelectric system modeling](https://pmc.ncbi.nlm.nih.gov/articles/PMC6937336/)
also shows that heatsink thermal resistance changes the achievable cold-side
temperature and optimum drive.

For this exact prototype, calibrate after adding temperature sensors:

1. Measure ambient, hot-side and cold-side temperature, plus 5 V current.
2. From a stable starting temperature, run PWM 0, 32, 64, 96, 128, 160, 192,
   224 and 255 using the final heatsink, mounting pressure and enclosure.
3. Record until each level approaches steady state, then repeat the sequence to
   expose hysteresis and battery-voltage effects.
4. Store each level's steady temperature change and time constant. Interpolate
   between calibrated levels for an approximate preview.

A useful first-order approximation for each calibrated level is
`T(t) = T_start + (T_steady − T_start) × (1 − exp(−t / tau))`. Its accuracy is
limited when ambient, contact, airflow or thermal load differs from calibration.
Until sensors exist, the UI intentionally labels the vertical axis as PWM rather
than temperature.

[Thermoelectric design guidance](https://www.coherent.com/resources/datasheet/materials/related-resources/thermoelectrics/thermoelectric-cooling-systems-design-guide-br.pdf)
recommends smooth DC to avoid thermal cycling. If long-term reliability becomes
important, test a filtered or current-regulated driver rather than assuming
direct PWM is equivalent to reduced DC current.
