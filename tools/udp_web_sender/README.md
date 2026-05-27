# UDP Web Sender

This is a small local Node.js web app for sending Haptell UDP commands from a browser. It also includes a simple LRA shape designer for custom `haptell-02` realtime amplitude envelopes.

It is a browser-based companion to `tools/udp_sender/send_haptell_command.py`. The browser does not send UDP directly. Instead, the browser sends an HTTP request to the local Node.js server, and the Node.js server sends the UDP packet to the Haptell device.

Use it from a computer connected to the same WiFi subnet as the Haptell device.

## Requirements

- Node.js 18 or newer
- No npm packages are required

The app only uses built-in Node.js modules:

- `http` for the local web server
- `fs` and `path` for static files
- `dgram` for UDP sending

## Find the Device IP Address

Upload the Arduino firmware and open the Arduino Serial Monitor. After the board joins WiFi, it prints its IP address.

Example:

```text
Connected. IP address: 192.168.1.42
```

Use that IP address in the web UI.

## Start

From the repository root:

```powershell
node tools/udp_web_sender/server.js
```

Or from this folder:

```powershell
npm start
```

The server prints:

```text
Haptell UDP web sender running at http://127.0.0.1:8080
Press Ctrl+C to stop.
```

Open this address in a browser:

```text
http://127.0.0.1:8080
```

Stop the server with `Ctrl+C`.

## Web UI Fields

### Device IP

The IP address of the Arduino device.

Example:

```text
192.168.1.42
```

For later multi-device tests, this may also be a subnet broadcast address, for example:

```text
192.168.1.255
```

The exact broadcast address depends on the WiFi subnet.

### UDP Port

The UDP port used by the firmware.

Default:

```text
4444
```

Leave this unchanged unless the firmware command port changes.

### Target

The first word of the Haptell command.

Options:

- `haptell-01`: first DC coin motor prototype
- `haptell-02`: second DRV2605L + LRA prototype
- `all`: all Haptell devices that receive the UDP packet

## Command Buttons

The UI has buttons for the common commands and a custom shape designer for the main `haptell-02` firmware.

### Pulse

Sends:

```text
haptell-02 pulse intensity=180 duration=800
```

Fields:

- `intensity`: default `180`
- `duration`: default `800`

### Double

Sends:

```text
haptell-02 double intensity=220 gap=120
```

Fields:

- `intensity`: default `220`
- `gap`: default `120`

### Ramp

Sends:

```text
haptell-02 ramp from=60 to=255 duration=1200
```

Fields:

- `from`: default `60`
- `to`: default `255`
- `duration`: default `1200`

### Stop

Sends:

```text
haptell-02 stop
```

Use `stop` to stop playback immediately.

## Shape Designer

The Shape Designer sends a compact realtime envelope command to the main
`haptell-02` firmware and to the simple blocking `haptell-02` example:

```text
haptell-02 shape duration=1600 points=0:0,100:180,700:180,1200:60,1600:0
```

The graph shows the amplitude envelope that the firmware will interpolate. The
data preview shows the outgoing command as a structured array:

```js
[
  ["target", "haptell-02"],
  ["command", "shape"],
  ["durationMs", 1600],
  ["mode", "rtp-envelope"],
  ["points", [
    ["timeMs", "intensity"],
    [0, 0],
    [100, 180],
    [700, 180],
    [1200, 60],
    [1600, 0]
  ]]
]
```

Limits:

- duration: up to `5000 ms`
- points: up to `24`
- intensity: `0` to `255`
- first point: `0 ms`
- last point: `duration`

For the firmware behavior, unsigned realtime playback setup, and test commands,
see `../../docs/lra-shape-designer.md`.

## Command Preview

The bottom field shows the exact UDP text command that will be sent. It updates when the target or parameter fields change, and when a command button is hovered or focused.

The command format is:

```text
<target> <pattern> <key=value> <key=value>
```

Example:

```text
haptell-02 pulse intensity=180 duration=800
```

## Optional Web Server Port

The web server defaults to `127.0.0.1:8080`.

To use another HTTP port in PowerShell:

```powershell
$env:HAPTELL_WEB_PORT=8090
node tools/udp_web_sender/server.js
```

Then open:

```text
http://127.0.0.1:8090
```

You can also change the bind host:

```powershell
$env:HAPTELL_WEB_HOST="0.0.0.0"
node tools/udp_web_sender/server.js
```

Binding to `0.0.0.0` makes the web UI reachable from other machines on the local network if the firewall allows it. For normal local use, keep the default `127.0.0.1`.

## Troubleshooting

### The Page Does Not Open

Check that the Node.js server is still running and that the terminal shows:

```text
Haptell UDP web sender running at http://127.0.0.1:8080
```

If port `8080` is already in use, start with another port:

```powershell
$env:HAPTELL_WEB_PORT=8090
node tools/udp_web_sender/server.js
```

### The UI Says the Command Was Sent, but the Device Does Nothing

UDP sending can succeed even when the device does not receive or act on the packet. Check:

- The computer and Arduino are on the same WiFi subnet.
- The Arduino Serial Monitor shows the expected IP address.
- The UI Device IP field matches the Arduino IP address.
- The firmware is listening on UDP port `4444`.
- The selected target matches the firmware device ID, or the target is `all`.
- The device is powered and the haptic driver wiring is correct.

### Firewall Notes

The web UI is local HTTP traffic to `127.0.0.1`. The actual device command is an outgoing UDP packet from Node.js to the Arduino device. Some firewall tools may ask for permission the first time Node.js sends UDP traffic.
