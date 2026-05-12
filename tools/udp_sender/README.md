# UDP Sender Example

This small Python tool sends Haptell text commands to a device over UDP.

Use it from a computer connected to the same closed WiFi subnet as the Haptell device.

## Requirements

- Python 3
- No external Python packages are required

## Find the Device IP Address

Upload the Arduino firmware and open the Arduino Serial Monitor. After the board joins WiFi, it prints its IP address.

Example:

```text
Connected. IP address: 192.168.1.42
```

Use that IP address when sending commands.

## Basic Use

From the repository root:

```powershell
python tools/udp_sender/send_haptell_command.py 192.168.1.42 pulse intensity=180 duration=800
```

This sends the following UDP text command to port `4444`:

```text
haptell-01 pulse intensity=180 duration=800
```

## Examples

Single pulse:

```powershell
python tools/udp_sender/send_haptell_command.py 192.168.1.42 pulse intensity=180 duration=800
```

Two short taps:

```powershell
python tools/udp_sender/send_haptell_command.py 192.168.1.42 double intensity=220 gap=120
```

Ramp up and fade out:

```powershell
python tools/udp_sender/send_haptell_command.py 192.168.1.42 ramp from=60 to=255 duration=1200
```

Stop the device:

```powershell
python tools/udp_sender/send_haptell_command.py 192.168.1.42 stop
```

Send a command addressed to all Haptell devices that receive it:

```powershell
python tools/udp_sender/send_haptell_command.py 192.168.1.42 stop --target all
```

## Broadcast Note

For later multi-device tests, commands may be sent to a subnet broadcast address instead of a single device IP address, for example:

```powershell
python tools/udp_sender/send_haptell_command.py 192.168.1.255 stop --target all
```

The exact broadcast address depends on the WiFi subnet. UDP broadcast behavior can also depend on router and operating system settings.

## What the Command Means

The command format is:

```text
<target> <pattern> <key=value> <key=value>
```

Example:

```text
haptell-01 pulse intensity=180 duration=800
```

- `haptell-01`: device target
- `pulse`: predefined pattern name
- `intensity=180`: motor PWM intensity from `0` to `255`
- `duration=800`: pattern duration in milliseconds

