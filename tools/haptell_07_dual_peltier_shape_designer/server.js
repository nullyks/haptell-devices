"use strict";

const dgram = require("node:dgram");
const fs = require("node:fs/promises");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const { PORT, validateCommand } = require("./public/pattern");

const HOST = "127.0.0.1";
const HTTP_PORT = Number(process.env.HAPTELL_07_WEB_PORT || 8086);
const assets = {
  "/": ["index.html", "text/html"],
  "/styles.css": ["styles.css", "text/css"],
  "/pattern.js": ["pattern.js", "text/javascript"],
  "/app.js": ["app.js", "text/javascript"],
};

function sendUdp(ipAddress, port, command) {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket("udp4");
    socket.send(command, port, ipAddress, (error, bytes) => {
      socket.close();
      if (error) reject(error);
      else resolve(bytes);
    });
  });
}

function json(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function handleSend(request, response, transmit) {
  if (request.headers["content-type"]?.split(";")[0] !== "application/json") {
    json(response, 415, { error: "Expected a JSON request." });
    return;
  }

  let raw = "";
  request.setEncoding("utf8");
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 2048) {
      json(response, 413, { error: "Request is too large." });
      return;
    }
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    json(response, 400, { error: "Invalid JSON request." });
    return;
  }
  const { ipAddress, command } = body ?? {};
  const firstOctet = typeof ipAddress === "string" ? parseInt(ipAddress, 10) : 0;
  if (!net.isIPv4(ipAddress) || firstOctet < 1 || firstOctet >= 224) {
    json(response, 400, { error: "Enter the Arduino's unicast IPv4 address." });
    return;
  }
  if (!validateCommand(command)) {
    json(response, 400, { error: "Invalid Haptell-07 shape or stop command." });
    return;
  }

  const bytesSent = await transmit(ipAddress, PORT, command);
  json(response, 200, { bytesSent });
}

function createServer(transmit = sendUdp) {
  return http.createServer(async (request, response) => {
    try {
      const asset = Object.hasOwn(assets, request.url) && assets[request.url];
      if (request.method === "GET" && asset) {
        const content = await fs.readFile(path.join(__dirname, "public", asset[0]));
        response.writeHead(200, { "Content-Type": `${asset[1]}; charset=utf-8` });
        response.end(content);
      } else if (request.method === "POST" && request.url === "/api/send") {
        await handleSend(request, response, transmit);
      } else {
        json(response, 404, { error: "Not found." });
      }
    } catch (error) {
      if (!response.headersSent) json(response, 500, { error: error.message });
    }
  });
}

if (require.main === module) {
  const server = createServer();
  server.listen(HTTP_PORT, HOST, () => {
    console.log(`Haptell-07 Shape Designer: http://${HOST}:${server.address().port}`);
  });
}

module.exports = { createServer };
