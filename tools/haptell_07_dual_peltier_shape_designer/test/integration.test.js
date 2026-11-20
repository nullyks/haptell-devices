"use strict";

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { Readable } = require("node:stream");
const test = require("node:test");
const vm = require("node:vm");
const { createServer } = require("../server");
const { SCHEMA, PORT, STOP, validate, commandFor, validateCommand } = require("../public/pattern");

const sample = {
  schema: SCHEMA,
  durationMs: 1000,
  points: [
    { timeMs: 0, pwmD3: 255, pwmD5: 0 },
    { timeMs: 500, pwmD3: 0, pwmD5: 220 },
    { timeMs: 1000, pwmD3: 0, pwmD5: 0 },
  ],
};

const command = "haptell-07-dual-peltier-shape shape duration=1000 points=0:255:0,500:0:220,1000:0:0";

test("two channel positions, D3 then D5, survive JSON and UDP encoding", () => {
  assert.deepEqual(validate(JSON.parse(JSON.stringify(sample))), sample);
  assert.equal(commandFor(sample), command);
  assert.equal(validateCommand(command), true);
  assert.equal(validateCommand(STOP), true);
  const max = {
    schema: SCHEMA,
    durationMs: 90000,
    points: [
      ...Array.from({ length: 29 }, (_, i) => ({ timeMs: 500 * i, pwmD3: 255, pwmD5: 255 })),
      { timeMs: 90000, pwmD3: 0, pwmD5: 0 },
    ],
  };
  assert.equal(validateCommand(commandFor(max)), true);
});

test("rejects wrong target, timing, channel count and a nonzero final PWM", () => {
  for (const invalid of [
    command.replace("haptell-07-dual-peltier-shape", "all"),
    command.replace("255:0", "255"),
    command.replace("255:0", "256:0"),
    command.replace("500:", "501:"),
    command.replace("500:", "0:"),
    command.replace(/0$/, "1"),
    command + "\n",
    command + "\0",
  ]) assert.equal(validateCommand(invalid), false, invalid);
  assert.throws(() => validate({ ...sample, schema: "haptell-peltier-shape-pattern/v1" }));
  assert.throws(() => validate({ ...sample, points: [null, sample.points.at(-1)] }));
});

function request(server, method, url, body) {
  const incoming = Readable.from(body === undefined ? [] : [JSON.stringify(body)]);
  incoming.method = method;
  incoming.url = url;
  incoming.headers = { "content-type": "application/json" };
  return new Promise((resolve) => {
    let status;
    server.emit("request", incoming, {
      writeHead(code) { status = code; },
      end(data) { resolve({ status, body: String(data) }); },
    });
  });
}

test("HTTP serves the editor and sends validated Shape and Stop to UDP 4444", async () => {
  const sent = [];
  const server = createServer((...args) => { sent.push(args); return args[2].length; });
  const page = await request(server, "GET", "/");
  assert.equal(page.status, 200);
  assert.match(page.body, /graphD3[\s\S]+graphD5/);
  for (const script of ["/pattern.js", "/app.js", "/styles.css"]) {
    assert.equal((await request(server, "GET", script)).status, 200);
  }
  const ipAddress = "192.0.2.7";
  for (const payload of [command, STOP]) {
    const result = await request(server, "POST", "/api/send", { ipAddress, command: payload });
    assert.equal(result.status, 200);
    assert.equal(JSON.parse(result.body).bytesSent, payload.length);
  }
  assert.equal((await request(server, "POST", "/api/send", { ipAddress, command: "all stop" })).status, 400);
  assert.equal((await request(server, "POST", "/api/send", { ipAddress: "255.255.255.255", command: STOP })).status, 400);
  assert.deepEqual(sent, [[ipAddress, PORT, command], [ipAddress, PORT, STOP]]);
});

test("browser initializes both graphs and keeps the active destination for Stop", async () => {
  const elements = new Map();
  const requests = [];
  let releaseSend;
  const context = vm.createContext({
    document: {
      getElementById(id) {
        if (!elements.has(id)) {
          elements.set(id, {
            listeners: {},
            classList: { toggle() {} },
            addEventListener(event, listener) { this.listeners[event] = listener; },
          });
        }
        return elements.get(id);
      },
    },
    performance: { now: () => 1 },
    setInterval() {},
    AbortSignal,
    fetch(_url, { body }) {
      requests.push(JSON.parse(body));
      const response = { ok: true, json: async () => ({}) };
      return requests.length === 1 ? new Promise((resolve) => {
        releaseSend = () => resolve(response);
      }) : Promise.resolve(response);
    },
  });
  for (const filename of ["pattern.js", "app.js"]) {
    vm.runInContext(readFileSync(path.join(__dirname, "../public", filename), "utf8"), context);
  }
  const get = (id) => elements.get(id);
  for (const graph of ["graphD3", "graphD5"]) assert.match(get(graph).innerHTML, /<polyline/);
  get("ip").value = "192.0.2.7";
  await get("load").listeners.change({ target: { files: [{ name: "test.json", text: async () => JSON.stringify(sample) }] } });
  assert.equal(get("command").value, command);
  const editD5 = { dataset: { field: "pwmD5", index: "1" }, valueAsNumber: 128 };
  get("points").listeners.change({ target: editD5 });
  const edited = command.replace("500:0:220", "500:0:128");
  assert.equal(get("command").value, edited);
  const send = get("sendForm").listeners.submit({ preventDefault() {} });
  get("ip").value = "192.0.2.8";
  const stop = get("stop").listeners.click();
  assert.equal(requests.length, 1);
  releaseSend();
  await Promise.all([send, stop]);
  assert.deepEqual(requests, [
    { ipAddress: "192.0.2.7", command: edited },
    { ipAddress: "192.0.2.7", command: STOP },
  ]);
});
