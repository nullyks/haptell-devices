# Choose your Haptell device

Match the parts printed on your module or actuator to the table. Each guide
includes a wiring diagram, an exact Arduino sketch and a first test. Every
prototype uses an Arduino UNO R4 WiFi.

| Device guide | Parts to look for | What it produces |
| --- | --- | --- |
| [Haptell-01 · Coin vibration motor](./haptell-01.md) | One DC coin motor and an IRF3205 MOSFET | One vibration pattern |
| [Haptell-02 · DRV2605L](./haptell-02-drv2605l.md) | DRV2605L haptic driver and VG1040003D, 170 Hz LRA | Short taps and strength envelopes |
| [Haptell-02 · PAM8403](./haptell-02-pam8403.md) | PAM8403 amplifier and VG2230001H, 70 Hz actuator | A fixed-frequency vibration with variable strength |
| [Haptell-03 · Audio exciter](./haptell-03.md) | PAM8403 amplifier and TEAX13C02-8/RH exciter | Vibration with variable frequency and strength |
| [Haptell-04 · Three vibration motors](./haptell-04.md) | Three DC coin motors and three MOSFET switches | Independent vibration patterns on three channels |
| [Haptell-05 · Weighted servo](./haptell-05.md) | 270° hobby servo, horn and offset weight | Motion through programmed angles |
| [Haptell-06 · Single Peltier](./haptell-06.md) | One SP1848-27145 module and one IRLZ44N MOSFET | One thermoelectric drive curve |
| [Haptell-07 · Dual Peltier](./haptell-07.md) | Two SP1848-27145 modules and two IRLZ44N MOSFETs | Two thermoelectric drive curves with shared timing |

If you are choosing between the two Haptell-02 circuits, use the
[Haptell-02 comparison](./haptell-02.md). For IDE installation or WiFi setup,
follow [Start here](../start.md).
