# Haptell 05 Servo Shape-Only Code Walkthrough

This sketch controls a 270 degree servo by receiving a compact `servo-shape`
UDP command. It is intentionally blocking and easy to read.

## Output

```cpp
const int SERVO_PIN = 9;
```

Arduino `D9` carries only the servo control signal. The servo power pins must be
connected to an external supply that can handle stall current, with common
ground tied to Arduino ground.

## Servo Mapping

The sketch uses the user's servo calibration:

```cpp
const int SERVO_MIN_US = 500;
const int SERVO_MAX_US = 2500;
const int SERVO_NEUTRAL_ANGLE_DEG = 135;
```

`angleToPulseUs()` maps `0..270 deg` linearly to `500..2500 us`, so `135 deg`
lands at the neutral `1500 us` pulse.

## UDP Command Format

The main supported command is:

```text
servo-shape duration=<duration_ms> points=<time:angle:easing,...>
```

Example:

```text
servo-shape duration=800 points=0:135:linear,120:175:easeOut,260:95:easeInOut,800:135:easeOut
```

The firmware also accepts:

```text
haptell-05-servo-shape servo-shape duration=800 points=...
haptell-05 servo-shape duration=800 points=...
```

## Point Storage

Each point stores time, target angle, and easing:

```cpp
struct ServoShapePoint {
  unsigned int timeMs;
  int angleDeg;
  Easing easing;
};
```

The first point must be at `0 ms`; the last point must be at `duration`.

## Playback

`playShape()` parses the command and plays each pair of adjacent points as a
segment. Inside each segment, `playSegment()` updates the servo target every
`10 ms`.

The easing value belongs to the point being reached. In this example, the
segment from `0 ms` to `120 ms` uses `easeOut`:

```text
0:135:linear,120:175:easeOut
```

## Easing

The sketch includes four simple easing curves:

- `linear`: steady interpolation
- `easeIn`: starts slowly, ends faster
- `easeOut`: starts faster, ends slowly
- `easeInOut`: smooth acceleration and deceleration

The interpolation uses floating-point angle math and then writes the target as
a servo pulse with `writeMicroseconds()`.

## Blocking Behavior

While a shape is playing, the Arduino stays inside `playSegment()` and uses
`delay()`. It cannot read another UDP packet until the full shape finishes.
This keeps the code easy to follow during the physical prototype phase.

## Serial Plotter

During playback, the sketch can print:

```text
angle:<deg> pulse:<us> neutral:135 min:0 max:270
```

Arduino Serial Plotter then shows the commanded angle curve on a `0..270`
scale.
