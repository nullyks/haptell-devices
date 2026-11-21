# Start here

A Haptell device is an Arduino UNO R4 WiFi connected to a driver and an actuator.
The actuator is the part that vibrates, moves, heats or cools. The driver
supplies the actuator with power. The Arduino tells the driver what to do.

## Choose your hardware guide

Use the [device comparison](./devices/index.md) to match your driver and
actuator. Power the circuit down before making connections. The hardware
guide identifies the power inputs, common ground and signal pins for that
specific circuit.

## Get the software

1. Install [Arduino IDE](https://www.arduino.cc/en/software/). Open **Boards
   Manager**, find **Arduino UNO R4 Boards** and install it. Install any
   additional libraries listed in your device guide through **Library Manager**.
2. On macOS, follow [Clone and update Haptell](./macos-git.md) to get a local
   copy you can update. You can also
   [download and extract the project ZIP](https://github.com/nullyks/haptell-devices/archive/refs/heads/main.zip).
   Keep the complete folder so the Arduino code and sender tools are
   available together.
3. If you plan to use a browser sender, install [Node.js LTS](https://nodejs.org/en/download).
   The project's sender tools start directly with `node`, with no npm
   packages to install.

## Upload the matching sketch

1. In the exact sketch folder named in the device guide, copy
   `secrets.example.h` to `secrets.h`. Edit the quoted WiFi name (SSID)
   and password in the copy. Save it alongside the `.ino` file and keep this
   credential file private.
2. Open the `.ino` in Arduino IDE. Keep its folder name intact so it matches
   the sketch name. Connect the board to your computer with a USB data cable.
3. Select **Arduino UNO R4 WiFi** and its serial port. Click **Verify** to
   compile the sketch and **Upload** to install it on the board.
4. Open **Serial Monitor**, select **115200 baud** and wait for the Arduino
   to join WiFi and print its IP address. If you missed the startup output,
   reset the board with Serial Monitor open and the actuator in a safe state.

## Send a first pattern

1. Connect your computer and Arduino to the same reachable local network.
2. Open a terminal in the extracted or cloned repository folder. Run the
   command in your device guide and leave that terminal open.
3. Open the listed `127.0.0.1` address in your browser. This address opens
   the sender on your computer. Enter the **Arduino IP** from Serial Monitor
   into the sender. The **UDP port** identifies where the sketch receives
   commands on the Arduino.
4. Follow the first-test steps and check the result against the guide. A send
   confirmation means the tool sent the packet. Verify playback on the
   device.

See [Troubleshooting](./troubleshooting.md) if you cannot upload or find the
Arduino's IP address.
