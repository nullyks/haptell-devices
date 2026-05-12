#!/usr/bin/env python3
"""Send a UDP command to a Haptell device.

Example:
    python send_haptell_command.py 192.168.1.42 pulse intensity=180 duration=800
"""

import argparse
import socket


DEFAULT_PORT = 4444
DEFAULT_TARGET = "haptell-01"


def build_command(target: str, pattern: str, params: list[str]) -> str:
    parts = [target, pattern]
    parts.extend(params)
    return " ".join(parts)


def send_udp_message(ip_address: str, port: int, message: str) -> None:
    payload = message.encode("utf-8")

    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        sock.sendto(payload, (ip_address, port))


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Send a text command to a Haptell device over UDP."
    )
    parser.add_argument(
        "ip_address",
        help="Device IP address, for example 192.168.1.42.",
    )
    parser.add_argument(
        "pattern",
        choices=["pulse", "double", "ramp", "stop"],
        help="Pattern command to send.",
    )
    parser.add_argument(
        "params",
        nargs="*",
        help="Optional key=value parameters, for example intensity=180 duration=800.",
    )
    parser.add_argument(
        "--target",
        default=DEFAULT_TARGET,
        help=f"Command target. Defaults to {DEFAULT_TARGET}. Use 'all' for broadcast-style commands.",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=DEFAULT_PORT,
        help=f"UDP port. Defaults to {DEFAULT_PORT}.",
    )

    args = parser.parse_args()
    command = build_command(args.target, args.pattern, args.params)

    send_udp_message(args.ip_address, args.port, command)
    print(f"Sent UDP command to {args.ip_address}:{args.port}")
    print(command)


if __name__ == "__main__":
    main()

