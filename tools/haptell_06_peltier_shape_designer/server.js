const dgram = require("dgram");
const fs = require("fs");
const http = require("http");
const path = require("path");
const net = require("net");
const { UDP_PORT, validateCommand } = require("./protocol");

const HTTP_HOST = process.env.HAPTELL_PELTIER_WEB_HOST || "127.0.0.1";
const HTTP_PORT = Number(process.env.HAPTELL_PELTIER_WEB_PORT || 8085);
const DEFAULT_UDP_PORT = UDP_PORT;

const publicDir = path.join(__dirname, "public");

function sendUdpCommand(ipAddress, port, command) {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket("udp4");
    const payload = Buffer.from(command, "utf8");

    socket.once("error", (error) => {
      socket.close();
      reject(error);
    });

    socket.send(payload, port, ipAddress, (error, bytesSent) => {
      socket.close();
      if (error) {
        reject(error);
        return;
      }

      resolve(bytesSent);
    });
  });
}

function sendJson(response, statusCode, data) {
  const body = JSON.stringify(data);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  response.end(body);
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 8192) {
        reject(new Error("Request body is too large."));
        request.destroy();
      }
    });

    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function serveStatic(request, response) {
  const parsedUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const urlPath = parsedUrl.pathname === "/" ? "/index.html" : parsedUrl.pathname;
  const filePath = path.normalize(path.join(publicDir, urlPath));

  if (filePath !== publicDir && !filePath.startsWith(publicDir + path.sep)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    const extension = path.extname(filePath);
    const contentType =
      extension === ".css"
        ? "text/css; charset=utf-8"
        : extension === ".js"
          ? "application/javascript; charset=utf-8"
          : "text/html; charset=utf-8";

    response.writeHead(200, { "Content-Type": contentType });
    response.end(content);
  });
}

async function handleSend(request, response) {
  try {
    const rawBody = await readRequestBody(request);
    const body = JSON.parse(rawBody || "{}");
    const ipAddress = String(body.ipAddress || "").trim();
    const port = Number(body.port ?? DEFAULT_UDP_PORT);
    const command = String(body.command || "").trim();

    if (!net.isIPv4(ipAddress) || ipAddress === "255.255.255.255" || Number(ipAddress.split(".")[0]) >= 224 || ipAddress.startsWith("0.")) {
      sendJson(response, 400, { ok: false, error: "Enter the device's unicast IPv4 address." });
      return;
    }

    if (port !== UDP_PORT) {
      sendJson(response, 400, { ok: false, error: "Peltier commands use UDP port 4445." });
      return;
    }

    if (!validateCommand(command)) {
      sendJson(response, 400, { ok: false, error: "Invalid Peltier shape or stop command." });
      return;
    }

    const bytesSent = await sendUdpCommand(ipAddress, port, command);
    sendJson(response, 200, {
      ok: true,
      sent: command,
      ipAddress,
      port,
      bytesSent,
      sentAt: new Date().toISOString(),
    });
    console.log(`Sent ${bytesSent} bytes to ${ipAddress}:${port} -> ${command}`);
  } catch (error) {
    sendJson(response, error instanceof SyntaxError ? 400 : 500, { ok: false, error: error.message });
  }
}

const server = http.createServer((request, response) => {
  if (request.method === "POST" && request.url === "/api/send") {
    handleSend(request, response);
    return;
  }

  if (request.method === "GET") {
    serveStatic(request, response);
    return;
  }

  response.writeHead(405);
  response.end("Method not allowed");
});

server.listen(HTTP_PORT, HTTP_HOST, () => {
  console.log(`Haptell Peltier Shape Designer running at http://${HTTP_HOST}:${server.address().port}`);
  console.log("Press Ctrl+C to stop.");
});
