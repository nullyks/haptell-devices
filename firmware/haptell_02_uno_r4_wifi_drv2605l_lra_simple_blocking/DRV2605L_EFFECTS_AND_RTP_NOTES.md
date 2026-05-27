# DRV2605L Effects and Realtime Playback Notes

This note explains the DRV2605L behavior used by the simple blocking
`haptell-02` firmware example. It focuses on three practical questions:

- where the LRA resonant frequency is configured
- how built-in DRV2605L effects are selected and played
- what realtime playback mode does and how to test it safely

The target hardware is:

- Arduino UNO R4 WiFi
- Mavaol DRV2605L haptic motor controller module
- Vybronics VG1040003D LRA actuator

## 1. LRA Resonant Frequency

The current sketch does not explicitly write `170 Hz` or any other resonant
frequency value into the DRV2605L.

The relevant setup code is:

```cpp
drv.useLRA();
drv.selectLibrary(DRV2605_LRA_LIBRARY);
drv.setMode(DRV2605_MODE_INTTRIG);
```

This means:

- `drv.useLRA()` tells the DRV2605L that the actuator is an LRA, not an ERM
  eccentric rotating mass motor.
- `drv.selectLibrary(6)` selects the DRV2605L LRA effect library.
- `drv.setMode(DRV2605_MODE_INTTRIG)` selects internal-trigger playback, where
  `drv.go()` starts the configured waveform sequence.

For an LRA, the DRV2605L normally uses its closed-loop auto-resonance behavior.
In that mode, the chip tracks the LRA resonance from back-EMF feedback instead
of requiring the Arduino sketch to generate a fixed-frequency waveform.

There is one related advanced setting: `DRIVE_TIME` in Control1 register
`0x1B`. It is an initial guess for LRA drive timing, not a direct "set the
actuator to 170 Hz" command. For a 170 Hz LRA:

```text
period = 1000 ms / 170 Hz = about 5.88 ms
recommended drive time = 0.5 * period = about 2.94 ms
DRIVE_TIME = (2.94 ms - 0.5 ms) / 0.1 ms = about 24
```

Optional test helper:

```cpp
void setDriveTimeFor170HzLra() {
  const uint8_t driveTime = 24;
  uint8_t control1 = drv.readRegister8(DRV2605_REG_CONTROL1);

  // Preserve STARTUP_BOOST, reserved bits, and AC_COUPLE.
  // Replace only DRIVE_TIME[4:0].
  drv.writeRegister8(DRV2605_REG_CONTROL1, (control1 & 0xE0) | (driveTime & 0x1F));
}
```

Use this only as a tuning experiment after the basic actuator wiring and
library effects work.

## 2. Built-In Effect Selection and Playback

The simple blocking sketch uses DRV2605L ROM/library effects for these commands:

- `pulse`
- `double`
- `ramp`

The core playback helper is:

```cpp
void playLibraryEffect(uint8_t effect, int waitMs) {
  drv.setWaveform(0, effect);
  drv.setWaveform(1, 0);
  drv.go();
  delay(waitMs);
}
```

The parameters mean:

- `effect`: the effect number inside the currently selected DRV2605L library.
  In this sketch, library `6` is selected, which is the LRA library.
- `waitMs`: an Arduino-side delay. It does not configure the effect length
  inside the DRV2605L. It simply gives the chip time to play before the sketch
  continues.

The waveform calls mean:

```cpp
drv.setWaveform(0, effect);
```

Put `effect` into waveform sequencer slot 0.

```cpp
drv.setWaveform(1, 0);
```

Put `0` into slot 1. In the DRV2605L waveform sequencer, `0` marks the end of
the sequence.

```cpp
drv.go();
```

Start playback.

The blocking example uses Arduino `delay()` calls between effects. During those
delays, the sketch does not read new UDP packets.

### Built-In Effect Test

This helper plays the first three LRA library effects with a pause between them:

```cpp
void testFirstLraLibraryEffects() {
  drv.useLRA();
  drv.selectLibrary(6);
  drv.setMode(DRV2605_MODE_INTTRIG);

  for (uint8_t effect = 1; effect <= 3; effect++) {
    Serial.print("Playing LRA library effect ");
    Serial.println(effect);

    drv.setWaveform(0, effect);
    drv.setWaveform(1, 0);
    drv.go();

    delay(500);
  }
}
```

Call it from `loop()` or from a temporary command handler while tuning.

## 3. Realtime Playback Mode

Realtime playback mode, also called RTP mode, does not use ROM effect numbers.
Instead, the Arduino writes an 8-bit drive value to the DRV2605L RTP input
register:

```cpp
drv.setMode(DRV2605_MODE_REALTIME);
drv.setRealtimeValue(value);
```

The raw value range is:

```text
0 to 255
```

However, the meaning of that range depends on the DRV2605L RTP data format.

By default, the DRV2605L interprets RTP data as signed. With the default signed
configuration, values above `127` are not simply "stronger positive vibration".
They are on the signed negative side of the range. For an LRA, that can feel
like a short kick, braking, or a phase-shifted drive rather than a continuous
3-second vibration.

That explains this observation:

```cpp
drv.setMode(DRV2605_MODE_REALTIME);
drv.setRealtimeValue(180);
delay(3000);
```

Even though RTP mode can hold a drive value, `180` is not a simple positive
amplitude in the default signed setup.

### Default Signed RTP Test

Use this to compare values that stay in the positive signed range against `180`:

```cpp
void testDefaultSignedRtpValues() {
  drv.useLRA();
  drv.setMode(DRV2605_MODE_REALTIME);

  const uint8_t values[] = { 40, 80, 120, 127, 180 };

  for (uint8_t i = 0; i < sizeof(values) / sizeof(values[0]); i++) {
    uint8_t value = values[i];

    Serial.print("Default signed RTP value ");
    Serial.println(value);

    drv.setRealtimeValue(value);
    delay(1000);

    drv.setRealtimeValue(0);
    delay(800);
  }

  drv.setRealtimeValue(0);
  drv.setMode(DRV2605_MODE_INTTRIG);
}
```

Expected result: values up to `127` should behave more like positive drive
levels. The value `180` may behave differently because it is outside the simple
positive signed range.

### Unsigned Unidirectional RTP Test

For an easier mental model, configure RTP as unsigned/unidirectional:

```text
0   = no drive
255 = full-scale drive
```

Helper functions:

```cpp
void configureUnsignedUnidirectionalRtp() {
  uint8_t control2 = drv.readRegister8(DRV2605_REG_CONTROL2);
  uint8_t control3 = drv.readRegister8(DRV2605_REG_CONTROL3);

  // Control2 bit 7: BIDIR_INPUT
  // 0 = unidirectional input mode
  drv.writeRegister8(DRV2605_REG_CONTROL2, control2 & ~0x80);

  // Control3 bit 3: DATA_FORMAT_RTP
  // 1 = unsigned RTP input data
  drv.writeRegister8(DRV2605_REG_CONTROL3, control3 | 0x08);
}

void restoreSignedBidirectionalInput() {
  uint8_t control2 = drv.readRegister8(DRV2605_REG_CONTROL2);
  uint8_t control3 = drv.readRegister8(DRV2605_REG_CONTROL3);

  // Return to the default-style bidirectional input interpretation.
  drv.writeRegister8(DRV2605_REG_CONTROL2, control2 | 0x80);

  // Return RTP data format to signed.
  drv.writeRegister8(DRV2605_REG_CONTROL3, control3 & ~0x08);
}
```

Hold-test example:

```cpp
void testUnsignedRtpHold() {
  drv.useLRA();
  configureUnsignedUnidirectionalRtp();
  drv.setMode(DRV2605_MODE_REALTIME);

  Serial.println("Unsigned RTP value 180 for 3 seconds");
  drv.setRealtimeValue(180);
  delay(3000);

  drv.setRealtimeValue(0);
  delay(500);

  drv.setMode(DRV2605_MODE_INTTRIG);
  restoreSignedBidirectionalInput();
}
```

Expected result: `180` should now behave much more like a positive continuous
drive level. If it still stops quickly, check power, actuator wiring, calibration
settings, and whether the module has any board-level behavior that differs from
the TI reference behavior.

### Realtime Ramp Test

This is the same basic shape as the current `custom` command, but with explicit
unsigned RTP setup:

```cpp
void testUnsignedRtpRamp() {
  drv.useLRA();
  configureUnsignedUnidirectionalRtp();
  drv.setMode(DRV2605_MODE_REALTIME);

  for (uint8_t value = 0; value <= 180; value += 10) {
    drv.setRealtimeValue(value);
    delay(15);
  }

  delay(120);

  for (int value = 180; value >= 0; value -= 10) {
    drv.setRealtimeValue((uint8_t)value);
    delay(20);
  }

  drv.setRealtimeValue(0);
  drv.setMode(DRV2605_MODE_INTTRIG);
  restoreSignedBidirectionalInput();
}
```

## Practical Limits of RTP Mode

RTP mode is useful when the Arduino should define its own amplitude curve. It is
not the same as asking the DRV2605L to play a polished built-in haptic effect.

Practical limits:

- The Arduino must update values over I2C to shape the waveform.
- Timing depends on the sketch, delays, and I2C traffic.
- In the blocking example, UDP commands are not read while RTP playback is
  running.
- RTP values control drive amplitude, not a direct 170 Hz waveform.
- The DRV2605L still handles LRA drive generation and auto-resonance tracking in
  closed-loop mode.
- The meaning of values above `127` depends on whether RTP is configured as
  signed or unsigned.

For first hardware tests, use built-in library effects first. Then use RTP after
the actuator, power path, and I2C connection are known to work.

## References

- TI DRV2605L datasheet: https://www.ti.com/lit/ds/symlink/drv2605l.pdf
- Adafruit DRV2605 Arduino library: https://github.com/adafruit/Adafruit_DRV2605_Library
