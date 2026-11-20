"use strict";

const { SCHEMA, STEP, MAX_DURATION, MAX_POINTS, STOP, commandFor, validate } = Haptell07;
const element = (id) => document.getElementById(id);
const bounds = { left: 48, right: 622, top: 15, bottom: 116 };
const channels = ["pwmD3", "pwmD5"];
const graphs = [element("graphD3"), element("graphD5")];
const rows = element("points");
const ip = element("ip");
const durationInput = element("duration");
const send = element("send");
const stop = element("stop");
const playback = element("playback");
let pattern = blankPattern(10000);
let drag = null;
let pendingSend = null;
let pendingStop = false;
let lastDestination = null;
let playbackEnds = 0;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const snapTime = (timeMs) => Math.round(timeMs / STEP) * STEP;
const zeroPoint = (timeMs) => ({ timeMs, pwmD3: 0, pwmD5: 0 });

function blankPattern(durationMs) {
  return { schema: SCHEMA, durationMs, points: [
    { timeMs: 0, pwmD3: 0, pwmD5: 0 },
    { timeMs: durationMs, pwmD3: 0, pwmD5: 0 },
  ] };
}

function status(message, error = false) {
  element("status").textContent = message;
  element("status").classList.toggle("error", error);
}

function commitDuration() {
  const { points, durationMs } = pattern;
  const requested = durationInput.valueAsNumber * 1000;
  const minimum = (points.length - 1) * STEP;
  const next = Number.isFinite(requested) ? clamp(snapTime(requested), minimum, MAX_DURATION) : durationMs;
  durationInput.value = next / 1000;
  if (next === durationMs) return;
  points.at(-1).timeMs = next;
  for (let i = 1; i < points.length - 1; i++) {
    const scaled = snapTime(points[i].timeMs * next / durationMs);
    points[i].timeMs = clamp(scaled, points[i - 1].timeMs + STEP, next - (points.length - 1 - i) * STEP);
  }
  pattern.durationMs = next;
  render();
}

function addPoint() {
  const { points } = pattern;
  if (points.length >= MAX_POINTS) return;
  const gaps = points.slice(1).map((point, i) => point.timeMs - points[i].timeMs);
  const largestGap = Math.max(...gaps);
  if (largestGap < STEP * 2) return;
  const i = gaps.indexOf(largestGap);
  const from = points[i];
  const to = points[i + 1];
  const timeMs = from.timeMs + snapTime(largestGap / 2);
  const ratio = (timeMs - from.timeMs) / largestGap;
  const point = zeroPoint(timeMs);
  for (const channel of channels) {
    point[channel] = Math.round(from[channel] + (to[channel] - from[channel]) * ratio);
  }
  points.splice(i + 1, 0, point);
  render();
  rows.querySelector(`input[data-index="${i + 1}"][data-field="timeMs"]`).focus();
}

function refreshGraph(graph, channel) {
  const { left, right, top, bottom } = bounds;
  const x = (timeMs) => left + timeMs / pattern.durationMs * (right - left);
  const y = (value) => bottom - value / 255 * (bottom - top);
  const guide = (label, vertical, pos) => vertical
    ? `<line x1="${pos}" x2="${pos}" y1="${top}" y2="${bottom}"/><text x="${pos}" y="140" text-anchor="middle">${label}</text>`
    : `<line x1="${left}" x2="${right}" y1="${pos}" y2="${pos}"/><text x="40" y="${pos + 4}" text-anchor="end">${label}</text>`;
  const grid = [255, 128, 0].map((value) => guide(value, false, y(value)));
  for (const ratio of [0, 0.25, 0.5, 0.75, 1]) {
    const time = pattern.durationMs * ratio;
    grid.push(guide(`${Number((time / 1000).toFixed(2))} s`, true, x(time)));
  }
  const line = pattern.points.map((point) => `${x(point.timeMs)},${y(point[channel])}`).join(" ");
  const markers = pattern.points.map((point, i) => {
    const locked = i === pattern.points.length - 1;
    return `<circle ${locked ? "" : `data-index="${i}"`} cx="${x(point.timeMs)}" cy="${y(point[channel])}" r="5"><title>Point ${i + 1} · ${point.timeMs / 1000} s · PWM ${point[channel]}${locked ? " (fixed)" : ""}</title></circle>`;
  }).join("");
  graph.innerHTML = `<g class="grid">${grid.join("")}</g><polyline points="${line}"/>${markers}`;
}

function refreshPreview() {
  graphs.forEach((graph, i) => refreshGraph(graph, channels[i]));
  element("command").value = commandFor(pattern);
  element("add").disabled = pattern.points.length >= MAX_POINTS ||
    !pattern.points.some((point, i) => i > 0 && point.timeMs - pattern.points[i - 1].timeMs >= STEP * 2);
}

function render() {
  durationInput.min = (pattern.points.length - 1) * STEP / 1000;
  durationInput.value = pattern.durationMs / 1000;
  rows.innerHTML = pattern.points.map((point, i) => {
    const endpoint = i === 0 || i === pattern.points.length - 1;
    const last = i === pattern.points.length - 1;
    const input = (field, name, value, min, max, step, locked) =>
      `<input aria-label="Point ${i + 1} ${name}" type="number" min="${min}" max="${max}" step="${step}" value="${value}" data-index="${i}" data-field="${field}" ${locked ? "readonly" : ""}>`;
    return `<tr><th scope="row">${i + 1}</th>
      <td>${input("timeMs", "time in seconds", point.timeMs / 1000, 0, pattern.durationMs / 1000, 0.5, endpoint)}</td>
      <td>${input("pwmD3", "D3 PWM", point.pwmD3, 0, 255, 1, last)}</td>
      <td>${input("pwmD5", "D5 PWM", point.pwmD5, 0, 255, 1, last)}</td>
      <td>${endpoint ? "" : `<button type="button" aria-label="Remove point ${i + 1}" data-remove="${i}">Remove</button>`}</td></tr>`;
  }).join("");
  refreshPreview();
}

rows.addEventListener("change", (event) => {
  const input = event.target;
  const index = Number(input.dataset.index);
  const field = input.dataset.field;
  const point = pattern.points[index];
  if (!point || !field || input.readOnly) return;
  const requested = input.valueAsNumber;
  if (field === "timeMs") {
    if (Number.isFinite(requested)) {
      const min = pattern.points[index - 1].timeMs + STEP;
      const max = pattern.points[index + 1].timeMs - STEP;
      point.timeMs = clamp(snapTime(requested * 1000), min, max);
    }
    input.value = point.timeMs / 1000;
  } else {
    if (Number.isFinite(requested)) point[field] = clamp(Math.round(requested), 0, 255);
    input.value = point[field];
  }
  refreshPreview();
});

rows.addEventListener("click", ({ target }) => {
  if (target.dataset.remove === undefined) return;
  pattern.points.splice(Number(target.dataset.remove), 1);
  render();
});

graphs.forEach((graph, channelIndex) => {
  graph.addEventListener("pointerdown", (event) => {
    if (drag || event.button !== 0 || event.target.dataset.index === undefined) return;
    event.preventDefault();
    drag = { graph, index: Number(event.target.dataset.index), pointerId: event.pointerId };
    graph.setPointerCapture(event.pointerId);
  });
  graph.addEventListener("pointermove", (event) => {
    if (drag?.graph !== graph || drag.pointerId !== event.pointerId) return;
    const matrix = graph.getScreenCTM();
    if (!matrix) return;
    const { y } = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const pwm = clamp(Math.round(255 * (bounds.bottom - y) / (bounds.bottom - bounds.top)), 0, 255);
    const field = channels[channelIndex];
    pattern.points[drag.index][field] = pwm;
    rows.querySelector(`input[data-index="${drag.index}"][data-field="${field}"]`).value = pwm;
    refreshPreview();
  });
  graph.addEventListener("lostpointercapture", (event) => {
    if (drag?.pointerId === event.pointerId) drag = null;
  });
});

async function transmit(ipAddress, command) {
  const response = await fetch("/api/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ipAddress, command }),
    signal: AbortSignal.timeout(5000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Sending failed.");
}

function updatePlayback() {
  const remaining = playbackEnds - performance.now();
  playback.hidden = remaining <= 0;
  if (!playback.hidden) playback.textContent = `Estimated playback remaining: ${(remaining / 1000).toFixed(1)} s`;
  ip.disabled = remaining > 0 || Boolean(pendingSend) || pendingStop;
  send.disabled = Boolean(pendingSend) || pendingStop;
  stop.disabled = pendingStop;
}

element("sendForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (pendingSend || pendingStop) return;
  commitDuration();
  const destination = ip.value.trim();
  const { durationMs } = pattern;
  lastDestination = destination;
  status("Sending shape…");
  pendingSend = transmit(destination, commandFor(pattern));
  updatePlayback();
  try {
    await pendingSend;
    playbackEnds = performance.now() + durationMs;
    if (!pendingStop) status(`Shape sent to ${destination} · Device receipt unconfirmed`);
  } catch (error) {
    if (!pendingStop) status(error.message, true);
  } finally {
    pendingSend = null;
    updatePlayback();
  }
});

stop.addEventListener("click", async () => {
  if (pendingStop) return;
  const destination = ip.disabled ? lastDestination : ip.value.trim();
  pendingStop = true;
  updatePlayback();
  status("Sending stop…");
  try {
    await pendingSend?.catch(() => {});
    await transmit(destination, STOP);
    playbackEnds = 0;
    status(`Stop sent to ${destination} · Device receipt unconfirmed`);
  } catch (error) {
    status(error.message, true);
  } finally {
    pendingStop = false;
    updatePlayback();
  }
});

durationInput.addEventListener("change", commitDuration);
element("add").addEventListener("click", addPoint);
element("clear").addEventListener("click", () => {
  pattern = blankPattern(pattern.durationMs);
  render();
});
element("save").addEventListener("click", () => {
  commitDuration();
  const blob = new Blob([JSON.stringify(validate(pattern), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "haptell-07-pattern.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
element("load").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file) return;
  try {
    pattern = validate(JSON.parse(await file.text()));
    render();
    status(`Loaded ${file.name}`);
  } catch (error) {
    status(error.message, true);
  }
});

render();
setInterval(updatePlayback, 100);
