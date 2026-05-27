# LRA Vibration Strength Terminology

This note explains how to describe the strength of an LRA actuator vibration in
a technically precise way. It is written for the Haptell `haptell-02` prototype,
which uses a DRV2605L haptic driver and a Vybronics VG1040003D LRA actuator.

The short recommendation is:

```text
Describe measured haptic strength as acceleration along the actuator axis,
preferably as peak acceleration or RMS acceleration in g over a defined time
window.
```

Firmware values such as `intensity=180`, DRV2605L effect numbers, or realtime
playback values are drive commands. They are not direct physical measurements of
vibration strength.

## 1. What Is the Instantaneous Vibration Value?

An LRA is a resonant mechanical system. The moving mass oscillates back and
forth along one main axis. At any instant, its mechanical state can be described
with one of these physical quantities:

- displacement: `x(t)`, measured in meters or millimeters
- velocity: `v(t)`, measured in meters per second
- acceleration: `a(t)`, measured in meters per second squared or in `g`

For haptic vibration, acceleration is usually the most useful quantity because
it maps better to how vibration is commonly measured and perceived.

Scientific wording:

```text
The instantaneous vibration can be represented as acceleration a(t) along the
actuator's vibration axis.
```

The value `a(t)` is signed. It changes direction as the LRA moves back and
forth. For a sinusoidal vibration, `a(t)` is positive for part of the cycle and
negative for another part of the cycle.

If the goal is to describe instantaneous "strength" as a non-negative value,
use:

```text
|a(t)|
```

This is the instantaneous acceleration magnitude.

## 2. Why "Strength" Is Not Usually One Instantaneous Number

The word "strength" is intuitive, but it is not a single physical quantity by
itself. A vibration can have:

- a rapidly changing instantaneous acceleration `a(t)`
- a peak acceleration during a time window
- an RMS acceleration during a time window
- an amplitude envelope that grows and fades over time
- a subjective perceived intensity felt by a person

For example, the LRA motion may look like this:

```text
x(t) = A(t) * sin(2*pi*f0*t + phi)
```

Where:

- `x(t)` is displacement over time
- `A(t)` is the displacement amplitude envelope
- `f0` is the LRA resonant frequency, for example about `170 Hz`
- `phi` is phase

The corresponding acceleration is approximately:

```text
a(t) = -(2*pi*f0)^2 * A(t) * sin(2*pi*f0*t + phi)
```

This means the acceleration depends on both amplitude and frequency. For a fixed
displacement amplitude, acceleration increases with the square of frequency.

For this reason, acceleration is often a better description of vibration
strength than displacement alone.

## 3. Recommended Terms

Use these terms depending on what is being described.

### Instantaneous Acceleration

Use when describing the signed physical waveform:

```text
a(t)
```

Example:

```text
The actuator acceleration a(t) oscillates around zero at approximately the LRA
resonant frequency.
```

### Instantaneous Acceleration Magnitude

Use when a non-negative instantaneous value is needed:

```text
|a(t)|
```

Example:

```text
The instantaneous vibration magnitude is represented as |a(t)| along the LRA
axis.
```

### Peak Acceleration

Use when reporting the strongest acceleration reached during a defined time
window:

```text
a_peak = max(|a(t)|)
```

Example:

```text
The pulse reached a peak acceleration of 1.8 g during the first 80 ms.
```

Peak acceleration is easy to understand, but it can be sensitive to short spikes
and measurement noise.

### RMS Acceleration

Use when reporting the average vibration energy over a defined time window:

```text
a_rms = sqrt(mean(a(t)^2))
```

Example:

```text
The pulse produced 0.7 g RMS acceleration over a 100 ms measurement window.
```

RMS acceleration is often more stable than peak acceleration and is useful for
comparing patterns.

### Acceleration Envelope

Use when describing how the vibration strength grows, holds, and fades:

```text
A_a(t)
```

Example:

```text
The haptic pattern has a fast attack, a short hold, and a slower decay in its
acceleration envelope.
```

This is a good concept for firmware and pattern design. A realtime DRV2605L
shape is better described as an intended drive envelope, not as a guaranteed
physical acceleration envelope.

### Perceived Intensity

Use when describing what a person feels:

```text
perceived haptic intensity
```

Example:

```text
The second pattern was perceived as stronger, even though both patterns had a
similar peak acceleration.
```

Perceived intensity depends on acceleration, frequency, contact force, enclosure
mechanics, hand position, duration, and the person's sensitivity.

## 4. Drive Command vs Physical Output

In the Haptell firmware, values such as these are control inputs:

```text
intensity=180
drv.setRealtimeValue(120)
drv.setWaveform(0, 1)
```

They are not direct measurements of actuator acceleration.

Better wording:

```text
The firmware sends a drive command with intensity 180.
```

Avoid:

```text
The motor vibrates at strength 180.
```

Reason: the same drive command can produce different physical acceleration
depending on:

- actuator model and resonant frequency
- DRV2605L configuration and calibration
- battery voltage and power path
- enclosure mass and stiffness
- mounting method
- contact with the user's hand
- whether the actuator is driven in library-effect mode or realtime mode

## 5. Practical Measurement Recommendation

For meaningful measurements, attach a small accelerometer to the same mechanical
structure that the user feels. Measure acceleration along the main LRA vibration
axis.

Record:

- axis measured
- sampling rate
- measurement window
- peak acceleration in `g`
- RMS acceleration in `g`
- firmware command used
- power source and battery state
- actuator mounting and enclosure condition

Example measurement note:

```text
Command: haptell-02 pulse
Driver mode: DRV2605L library effect 1
Actuator: Vybronics VG1040003D
Mounting: taped to 3D-printed enclosure wall
Axis: actuator normal axis
Window: first 100 ms after command
Peak acceleration: 1.8 g
RMS acceleration: 0.7 g
```

This is much clearer than reporting only the firmware intensity value.

## 6. Example Descriptions for Haptell

Use these styles in documentation or test notes.

### Firmware-Level Description

```text
The `pulse` command triggers a predefined DRV2605L LRA effect. The command
parameter `intensity` is a firmware-level drive setting and should not be
interpreted as a calibrated acceleration value.
```

### Physical Measurement Description

```text
The vibration strength was measured as acceleration along the actuator axis. The
reported values are peak acceleration and RMS acceleration in g over a 100 ms
window.
```

### Pattern Shape Description

```text
The pattern has a fast attack and a gradual decay in its acceleration envelope.
The exact measured envelope depends on the enclosure and actuator mounting.
```

### Scientific Short Form

```text
Let a(t) be the actuator acceleration along its vibration axis. The instantaneous
vibration magnitude is |a(t)|. For comparison between patterns, report a_peak or
a_rms over a defined time window.
```

## 7. Suggested Project Vocabulary

For Haptell, use this vocabulary consistently:

- `firmware intensity`: command-level value used by the sketch
- `drive value`: raw value sent to DRV2605L realtime playback mode
- `effect number`: DRV2605L ROM/library effect ID
- `acceleration`: measured physical vibration, in `m/s^2` or `g`
- `peak acceleration`: maximum `|a(t)|` in a measurement window
- `RMS acceleration`: root-mean-square acceleration in a measurement window
- `acceleration envelope`: the time-varying strength contour of a haptic pattern
- `perceived intensity`: subjective user experience of haptic strength

## Summary

The most precise instantaneous physical quantity is acceleration:

```text
a(t)
```

The most practical non-negative instantaneous "strength" value is:

```text
|a(t)|
```

For real testing and comparison, report:

```text
a_peak or a_rms in g over a defined time window
```

Firmware drive values and DRV2605L effect IDs should be documented as commands,
not as calibrated vibration strength values.
