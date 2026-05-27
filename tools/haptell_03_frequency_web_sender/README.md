# Haptell 03 Frequency Web Sender

This is a local Node.js browser UI for sending UDP commands to the
`haptell-03` firmware.

It is separate from `tools/udp_web_sender/` because `haptell-03` patterns
control both amplitude and frequency.

## Start

From the repository root:

```powershell
node tools/haptell_03_frequency_web_sender/server.js
```

Then open:

```text
http://127.0.0.1:8081
```

No npm packages are required.

Optional environment variables:

```powershell
$env:HAPTELL_03_WEB_HOST = "127.0.0.1"
$env:HAPTELL_03_WEB_PORT = "8081"
node tools/haptell_03_frequency_web_sender/server.js
```

## Pattern Command

The pattern designer sends:

```text
haptell-03 pattern duration=1200 points=0:0:560,80:150:560,900:150:760,1200:0:560
```

Each point is:

```text
timeMs:amplitude:frequencyHz
```

The firmware linearly interpolates amplitude and frequency between points.

## Quick Commands

The UI can also send:

```text
haptell-03 tone amplitude=120 frequency=560 duration=500
haptell-03 sweep amplitude=140 from=180 to=900 duration=1200
haptell-03 stop
```
