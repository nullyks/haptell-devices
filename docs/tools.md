# Senders and Shape Designers

A browser sender uses a local Node.js server to send UDP packets to an
Arduino on your network. Run one of the commands below from the repository
folder, then open its local address. [Start here](./start.md) covers Node.js
and Arduino setup.

| Tool | Matching hardware and firmware | Local address | Arduino UDP |
| --- | --- | --- | --- |
| UDP Web Sender | Haptell-01 or either Haptell-02 main or simple sketch | [127.0.0.1:8080](http://127.0.0.1:8080) | 4444 |
| Frequency Sender | Haptell-03 main or simple sketch | [127.0.0.1:8081](http://127.0.0.1:8081) | 4444 |
| Custom Shape Designer | Haptell-01 or Haptell-02 dedicated shape-only sketch | [127.0.0.1:8082](http://127.0.0.1:8082) | 4444 |
| Triple Shape Designer | Haptell-04 | [127.0.0.1:8083](http://127.0.0.1:8083) | 4444 |
| Servo Shape Designer | Haptell-05 | [127.0.0.1:8084](http://127.0.0.1:8084) | 4444 |
| Peltier Shape Designer | Haptell-06 | [127.0.0.1:8085](http://127.0.0.1:8085) | 4445 |
| Dual Peltier Shape Designer | Haptell-07 | [127.0.0.1:8086](http://127.0.0.1:8086) | 4444 |

## Start a browser tool

Choose the command for your tool. Stop its local server with **Ctrl+C** in
the terminal when you finish. To stop a device pattern, follow the device
guide. Closing the tool or its terminal does not stop the Arduino.

```powershell
node tools/udp_web_sender/server.js
node tools/haptell_03_frequency_web_sender/server.js
node tools/haptell_shape_designer/server.js
node tools/haptell_04_triple_shape_designer/server.js
node tools/haptell_05_servo_shape_designer/server.js
node tools/haptell_06_peltier_shape_designer/server.js
node tools/haptell_07_dual_peltier_shape_designer/server.js
```

The [firmware compatibility table](./firmware-variants.md) lists the exact
target each sketch accepts. See [Reference](./reference.md) for per-tool
instructions, saved pattern formats and command examples.

## Send an individual command from Python

The [Python sender](https://github.com/nullyks/haptell-devices/tree/main/tools/udp_sender)
uses Python 3 and the standard library. The following example sends a short
pulse to the Haptell-01 main sketch. Replace the sample IP address with the
one shown in Serial Monitor.

```powershell
python tools/udp_sender/send_haptell_command.py 192.168.1.42 pulse intensity=120 duration=350 --target haptell-01 --port 4444
```

The Python example supports `pulse`, `double`, `ramp` and `stop`.
Use the matching browser tool for custom shapes and frequency patterns.
