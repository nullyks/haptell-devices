# Haptell 04 Triple DC Shape-Only Code Walkthrough

This sketch extends the haptell-01 DC motor shape idea to three independently
controlled motors. It remains intentionally blocking and beginner-friendly.

## Outputs

```cpp
const int MOTOR_PWM_PINS[MOTOR_COUNT] = { 9, 10, 11 };
```

Each Arduino PWM pin drives one MOSFET gate driver stage. The firmware writes a
separate `0..255` PWM value to each pin.

## UDP Command Format

The firmware listens on UDP port `4444` and accepts only this target:

```text
haptell-04-triple-dc-shape
```

The supported shape command is:

```text
<target> shape duration=<duration_ms> points=<time:m1:m2:m3,...>
```

Example:

```text
haptell-04-triple-dc-shape shape duration=3000 points=0:0:0:0,500:180:60:0,2200:80:180:140,3000:0:0:0
```

## Point Storage

Each point stores one time and three intensities:

```cpp
struct ShapePoint {
  unsigned int timeMs;
  uint8_t intensity[MOTOR_COUNT];
};
```

The last point must be at the full duration and all three motor intensities
must be `0`, so every playback ends with the motors off.

## Playback

`playShape()` parses the command, then plays each pair of adjacent points as a
segment. Inside each segment, `playSegment()` linearly interpolates all three
motor values every `10 ms`.

The interpolation uses signed arithmetic:

```cpp
long delta = (long)to - (long)from;
```

This lets falling envelope segments work correctly, for example `220 -> 0`.

## Blocking Behavior

While a shape is playing, the Arduino stays inside `playSegment()` and uses
`delay()`. It cannot read another UDP packet until the full shape finishes.
That is why the matching web tool shows a busy warning after sending.

## Serial Plotter

During playback, the sketch can print:

```text
m1:<value> m2:<value> m3:<value> min:0 max:255
```

Arduino Serial Plotter then shows all three motor envelopes on the same
`0..255` scale.
