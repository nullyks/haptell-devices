const dgram = require("dgram");
const fs = require("fs");
const http = require("http");
const path = require("path");

const HTTP_HOST = process.env.HAPTELL_04_WEB_HOST || "127.0.0.1";
const HTTP_PORT = Number(process.env.HAPTELL_04_WEB_PORT || 8083);
const DEFAULT_UDP_PORT = 4444;

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
      if (body.length > 12288) {
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
    const port = Number(body.port || DEFAULT_UDP_PORT);
    const command = String(body.command || "").trim();

    if (!ipAddress) {
      sendJson(response, 400, { ok: false, error: "Device IP address is required." });
      return;
    }

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      sendJson(response, 400, { ok: false, error: "UDP port must be 1-65535." });
      return;
    }

    if (!command) {
      sendJson(response, 400, { ok: false, error: "Command is required." });
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
    sendJson(response, 500, { ok: false, error: error.message });
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
  console.log(`Haptell 04 Triple Shape Designer running at http://${HTTP_HOST}:${HTTP_PORT}`);
  console.log("Press Ctrl+C to stop.");
});
