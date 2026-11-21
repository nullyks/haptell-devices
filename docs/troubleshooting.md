# Troubleshooting

## Arduino does not appear in the IDE

Try a USB data cable and a direct USB port on the computer. Open Arduino IDE
and check that the **Arduino UNO R4 Boards** package is installed. Reconnect
the board and select the serial port that appeared. Select **Arduino UNO R4
WiFi** as the board.

## The sketch does not compile

Check that the `.ino` filename matches its folder name. If the IDE reports
that `secrets.h` is missing, copy the example header in that same folder
and check that your file is really named `secrets.h`. If a library header
is missing, install the library listed in the [device guide](./devices/index.md).

## Serial Monitor shows no IP address

Select **115200 baud**. Confirm that the WiFi name and password in your
local `secrets.h` match the intended network. Upload again after editing
the file. Open Serial Monitor before restarting the Arduino so you can see
the connection messages.

## The local sender page does not open

Start the command from the top-level repository folder and keep the terminal
running. Copy the full local URL printed by the tool. A missing `node`
command means Node.js is unavailable in that terminal. If the tool reports
that its HTTP port is in use, close the other instance or see the
[tool guide](./tools.md) for the matching tool and address.

## The tool says it sent a command and the device stays still

1. Compare the IP address in the tool with the latest one shown in Serial
   Monitor. Some guest networks isolate devices, even on the same SSID.
2. Check the target next to your [exact firmware sketch](./firmware-variants.md).
   Haptell-06 listens on UDP **4445**. Haptell-07 and the other documented
   sketches listen on UDP **4444**.
3. Re-run the first test from the device guide. Some editors start with an
   all-zero pattern. Check the command preview and confirm whether you are
   running an all-off test or expecting output.
4. Power down before checking actuator supply, common ground and the signal
   and output connections against the device's diagram.

## Stop does not interrupt playback

A blocking sketch finishes its current pattern before processing another
UDP packet. Haptell-05's **Stop** button in the animation panel stops the
on-screen preview. Check the [firmware table](./firmware-variants.md) for
what your sketch accepts. If the hardware presents a problem during a test,
use the physical actuator power disconnect.
