const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const dgram = require("node:dgram");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { validateCommand, DEVICE_ID } = require("../protocol");

const shape = (duration, points) => `${DEVICE_ID} shape duration=${duration} points=${points}`;

test("full range and maximum duration remain valid", () => {
  assert.ok(validateCommand(shape(90000, "0:255,45000:128,90000:0")));
  assert.ok(validateCommand(`${DEVICE_ID} stop`));
  const points = Array.from({ length: 30 }, (_, i) => `${i * 3000}:${i === 29 ? 0 : 255}`);
  assert.ok(validateCommand(shape(87000, points.join(","))));
});

test("reject commands that could address the wrong device or violate drive bounds", () => {
  const invalid = [
    "all stop", "haptell-01-dc-shape stop", `${DEVICE_ID} pulse`,
    shape(90001, "0:0,90001:0"), shape(499, "0:0,499:0"),
    shape(1250, "0:0,1250:0"), shape(1000, "0:0,750:10,1000:0"),
    shape("1000junk", "0:0,1000:0"), shape(1000, "0:256,1000:0"),
    shape(1000, "0:-1,1000:0"), shape(1000, "1:10,1000:0"),
    shape(1000, "0:10,1000:1"), shape(1000, "0:10,999:0"),
    shape(1000, "0:10,1000:0,"), shape(1000, "0:10,0:20,1000:0"),
    shape(1000, "0:10,800:20,700:10,1000:0"),
    shape(1000, "0:10,1000:0:0"), shape(1000, "0:10,1000:0") + "\0junk",
    shape(1000, Array.from({ length: 31 }, (_, i) => `${i * 30}:0`).join(",")),
  ];
  for (const command of invalid) assert.equal(validateCommand(command), false, command);
});

// Exercise editor data logic without a browser or any real network writes.
function editorContext() {
  const elements = new Map();
  const get = (id) => {
    if (!elements.has(id)) elements.set(id, {
      value: id === "#target" ? DEVICE_ID : id === "#shapeDuration" ? "10" : "0",
      classList: { add() {}, remove() {} },
      addEventListener() {}, setAttribute() {},
    });
    return elements.get(id);
  };
  const context = vm.createContext({
    document: { querySelector: get, querySelectorAll: () => [] },
    setInterval, clearInterval, console,
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../public/app.js"), "utf8"), context);
  return context;
}

test("editor JSON roundtrip and duration scaling preserve endpoint constraints", () => {
  const context = editorContext();
  vm.runInContext('applyPreset("softStart"); setShapeDuration(90000, true); renderDesigner();', context);
  const command = vm.runInContext("buildCommand()", context);
  assert.equal(command, shape(90000, "0:0,18000:96,36000:96,54000:192,81000:192,90000:0"));
  assert.ok(validateCommand(command));
  assert.equal(vm.runInContext("validateLoadedPattern(JSON.parse(JSON.stringify(buildPatternJson()))).durationMs", context), 90000);
});

test("all perceptibility presets produce valid half-second commands", () => {
  const context = editorContext();
  for (const name of ["softStart", "longPulse", "steps", "off"]) {
    context.presetName = name;
    const command = vm.runInContext("applyPreset(presetName); buildCommand()", context);
    assert.ok(validateCommand(command), `${name}: ${command}`);
  }
});

test("graph labels every point with its number and time in seconds", () => {
  const context = editorContext();
  const markup = vm.runInContext('applyPreset("steps"); renderGraph(); document.querySelector("#pointLayer").innerHTML', context);
  assert.match(markup, /#1 · 0 s/);
  assert.match(markup, /#2 · 5 s/);
  assert.match(markup, /#8 · 60 s/);
});

test("editor rejects wrong schema, null points and malformed JSON data", () => {
  const context = editorContext();
  const valid = JSON.parse(vm.runInContext("JSON.stringify(buildPatternJson())", context));
  const invalid = [
    { ...valid, schema: "haptell-shape-pattern/v1" },
    { ...valid, durationMs: 90001 }, { ...valid, durationMs: 10250 }, { ...valid, durationMs: "10000" },
    { ...valid, points: [null, valid.points[1]] },
    { ...valid, points: [{ timeMs: 0, intensity: 256 }, valid.points[1]] },
    { ...valid, points: [{ timeMs: 0, intensity: 0 }, { timeMs: 9750, intensity: 0 }] },
    { ...valid, points: [...valid.points].reverse() },
    { ...valid, points: [{ timeMs: 0, intensity: 0.5 }, valid.points[1]] },
  ];
  for (const pattern of invalid) {
    context.testPattern = pattern;
    assert.throws(() => vm.runInContext("validateLoadedPattern(testPattern)", context));
  }
  assert.equal(vm.runInContext("buildCommand()", context), shape(10000, "0:0,10000:0"));
});

test("HTTP sends exact shape and stop datagrams on 4445; rejects other ports", async (t) => {
  const socket = dgram.createSocket("udp4");
  t.after(() => socket.close());
  socket.bind(4445, "127.0.0.1");
  await once(socket, "listening");
  const child = spawn(process.execPath, [path.join(__dirname, "../server.js")], {
    env: { ...process.env, HAPTELL_PELTIER_WEB_PORT: "0", HAPTELL_PELTIER_WEB_HOST: "127.0.0.1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(() => child.kill());
  let output = "";
  const url = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Server did not start")), 5000);
    child.once("error", reject);
    child.stdout.on("data", (chunk) => {
      output += chunk;
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(timeout); resolve(match[0]); }
    });
  });
  const post = (body) => fetch(`${url}/api/send`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  for (const command of [shape(90000, "0:255,90000:0"), `${DEVICE_ID} stop`]) {
    const received = once(socket, "message", { signal: AbortSignal.timeout(3000) });
    const response = await post({ ipAddress: "127.0.0.1", port: 4445, command });
    assert.equal(response.status, 200);
    assert.equal((await received)[0].toString(), command);
  }
  for (const body of [
    { port: 4444, command: `${DEVICE_ID} stop` },
    { port: 4445, command: "all stop" },
    { port: 4445, command: shape(90001, "0:0,90001:0") },
  ]) assert.equal((await post({ ipAddress: "127.0.0.1", ...body })).status, 400);
  assert.equal((await fetch(`${url}/api/send`, { method: "POST", body: "{" })).status, 400);
  assert.equal((await fetch(url)).status, 200);
});
