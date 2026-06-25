const MIN_DURATION_MS = 100;
const MAX_DURATION_MS = 15000;
const MAX_POINTS = 30;
const ANGLE_MIN = 0;
const ANGLE_MAX = 270;
const NEUTRAL_ANGLE = 135;
const PULSE_MIN_US = 500;
const PULSE_MAX_US = 2500;
const SERVO_FAST_SPEED_DEG_PER_SEC = 333;
const SERVO_WARN_SPEED_DEG_PER_SEC = 280;
const EASINGS = ["linear", "easeIn", "easeOut", "easeInOut"];
const GRAPH = {
  left: 78,
  top: 28,
  width: 842,
  height: 430,
};

const statusEl = document.querySelector("#status");
const busyPanelEl = document.querySelector("#busyPanel");
const busyTextEl = document.querySelector("#busyText");
const previewEl = document.querySelector("#commandPreview");
const dataPreviewEl = document.querySelector("#dataPreview");
const graphEl = document.querySelector("#angleGraph");
const gridLayerEl = document.querySelector("#gridLayer");
const segmentLayerEl = document.querySelector("#segmentLayer");
const pointLayerEl = document.querySelector("#pointLayer");
const safeBandEl = document.querySelector("#safeBand");
const neutralLineEl = document.querySelector("#neutralLine");
const neutralLabelEl = document.querySelector("#neutralLabel");
const pointsListEl = document.querySelector("#pointsList");
const addAfterPointEl = document.querySelector("#addAfterPoint");
const addPointButtonEl = document.querySelector("#addPoint");
const warningsListEl = document.querySelector("#warningsList");
const hornGroupEl = document.querySelector("#hornGroup");
const previewAngleEl = document.querySelector("#previewAngle");
const previewScrubEl = document.querySelector("#previewScrub");

const inputs = {
  ipAddress: document.querySelector("#ipAddress"),
  port: document.querySelector("#port"),
  shapeDuration: document.querySelector("#shapeDuration"),
  tableShapeDuration: document.querySelector("#tableShapeDuration"),
  safeMin: document.querySelector("#safeMin"),
  safeMax: document.querySelector("#safeMax"),
};

const presets = {
  nudge: {
    durationMs: 700,
    points: [
      { timeMs: 0, angleDeg: 135, easing: "linear" },
      { timeMs: 110, angleDeg: 155, easing: "easeOut" },
      { timeMs: 260, angleDeg: 135, easing: "easeInOut" },
      { timeMs: 700, angleDeg: 135, easing: "linear" },
    ],
  },
  swing: {
    durationMs: 1800,
    points: [
      { timeMs: 0, angleDeg: 135, easing: "linear" },
      { timeMs: 350, angleDeg: 205, easing: "easeOut" },
      { timeMs: 950, angleDeg: 65, easing: "easeInOut" },
      { timeMs: 1450, angleDeg: 135, easing: "easeOut" },
      { timeMs: 1800, angleDeg: 135, easing: "linear" },
    ],
  },
  kick: {
    durationMs: 1100,
    points: [
      { timeMs: 0, angleDeg: 135, easing: "linear" },
      { timeMs: 250, angleDeg: 198, easing: "easeOut" },
      { timeMs: 550, angleDeg: 118, easing: "easeIn" },
      { timeMs: 850, angleDeg: 135, easing: "easeOut" },
      { timeMs: 1100, angleDeg: 135, easing: "linear" },
    ],
  },
  recoil: {
    durationMs: 1100,
    points: [
      { timeMs: 0, angleDeg: 135, easing: "linear" },
      { timeMs: 170, angleDeg: 92, easing: "easeOut" },
      { timeMs: 450, angleDeg: 165, easing: "easeInOut" },
      { timeMs: 760, angleDeg: 135, easing: "easeOut" },
      { timeMs: 1100, angleDeg: 135, easing: "linear" },
    ],
  },
  wobble: {
    durationMs: 1700,
    points: [
      { timeMs: 0, angleDeg: 135, easing: "linear" },
      { timeMs: 180, angleDeg: 170, easing: "easeOut" },
      { timeMs: 430, angleDeg: 105, easing: "easeInOut" },
      { timeMs: 680, angleDeg: 162, easing: "easeInOut" },
      { timeMs: 920, angleDeg: 118, easing: "easeInOut" },
      { timeMs: 1250, angleDeg: 135, easing: "easeOut" },
      { timeMs: 1700, angleDeg: 135, easing: "linear" },
    ],
  },
};

let shapePoints = [
  { timeMs: 0, angleDeg: 135, easing: "linear" },
  { timeMs: 120, angleDeg: 175, easing: "easeOut" },
  { timeMs: 260, angleDeg: 95, easing: "easeInOut" },
  { timeMs: 800, angleDeg: 135, easing: "easeOut" },
];
let currentDurationMs = 800;
let activePoint = null;
let addAfterIndex = 0;
let busyTimer = null;
let previewAnimation = null;
let previewStartedAt = 0;

function copyPoint(point) {
  return {
    timeMs: Math.round(Number(point.timeMs) || 0),
    angleDeg: Math.round(Number(point.angleDeg) || NEUTRAL_ANGLE),
    easing: EASINGS.includes(point.easing) ? point.easing : "linear",
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function sanitizeDurationInput() {
  for (const input of [inputs.shapeDuration, inputs.tableShapeDuration]) {
    const cleaned = input.value.replace(/\D/g, "");
    if (input.value !== cleaned) {
      input.value = cleaned;
    }
  }
}

function getDurationInputValue() {
  sanitizeDurationInput();
  const rawValue = Number(inputs.shapeDuration.value);
  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    return currentDurationMs;
  }

  return clamp(Math.round(rawValue), MIN_DURATION_MS, MAX_DURATION_MS);
}

function setShapeDuration(nextDurationMs, scalePoints) {
  nextDurationMs = clamp(Math.round(Number(nextDurationMs) || currentDurationMs), MIN_DURATION_MS, MAX_DURATION_MS);
  const previousDurationMs = currentDurationMs;

  if (scalePoints && previousDurationMs > 0 && nextDurationMs !== previousDurationMs) {
    const ratio = nextDurationMs / previousDurationMs;
    shapePoints = shapePoints.map((point, index) => {
      const isFirst = index === 0;
      const isLast = index === shapePoints.length - 1;
      return {
        timeMs: isFirst ? 0 : isLast ? nextDurationMs : clamp(Math.round(point.timeMs * ratio), 0, nextDurationMs),
        angleDeg: clamp(Math.round(point.angleDeg), ANGLE_MIN, ANGLE_MAX),
        easing: point.easing,
      };
    });
  }

  currentDurationMs = nextDurationMs;
  inputs.shapeDuration.value = currentDurationMs;
  inputs.tableShapeDuration.value = currentDurationMs;
  previewScrubEl.max = String(currentDurationMs);
}

function commitDurationInput() {
  setShapeDuration(getDurationInputValue(), true);
  renderDesigner();
}

function getSafeRange() {
  const rawMin = clamp(Math.round(Number(inputs.safeMin.value) || 20), ANGLE_MIN, ANGLE_MAX);
  const rawMax = clamp(Math.round(Number(inputs.safeMax.value) || 250), ANGLE_MIN, ANGLE_MAX);
  const safeMin = Math.min(rawMin, rawMax);
  const safeMax = Math.max(rawMin, rawMax);
  inputs.safeMin.value = safeMin;
  inputs.safeMax.value = safeMax;
  return { safeMin, safeMax };
}

function normalizeShapePoints() {
  const durationMs = currentDurationMs;
  inputs.shapeDuration.value = durationMs;
  inputs.tableShapeDuration.value = durationMs;

  shapePoints = shapePoints
    .map(copyPoint)
    .map((point) => ({
      ...point,
      timeMs: clamp(point.timeMs, 0, durationMs),
      angleDeg: clamp(point.angleDeg, ANGLE_MIN, ANGLE_MAX),
    }))
    .sort((a, b) => a.timeMs - b.timeMs);

  shapePoints = shapePoints.filter((point, index, points) => {
    return index === 0 || point.timeMs !== points[index - 1].timeMs;
  });

  if (shapePoints.length === 0 || shapePoints[0].timeMs !== 0) {
    const firstAngle = shapePoints[0]?.angleDeg ?? NEUTRAL_ANGLE;
    shapePoints.unshift({ timeMs: 0, angleDeg: firstAngle, easing: "linear" });
  }

  if (shapePoints[shapePoints.length - 1].timeMs !== durationMs) {
    shapePoints.push({ timeMs: durationMs, angleDeg: NEUTRAL_ANGLE, easing: "easeOut" });
  }

  shapePoints[0] = { ...shapePoints[0], timeMs: 0, easing: "linear" };
  shapePoints[shapePoints.length - 1] = {
    ...shapePoints[shapePoints.length - 1],
    timeMs: durationMs,
  };

  if (shapePoints.length > MAX_POINTS) {
    const first = shapePoints[0];
    const last = shapePoints[shapePoints.length - 1];
    shapePoints = [first, ...shapePoints.slice(1, MAX_POINTS - 1), last];
  }
}

function angleToPulseUs(angleDeg) {
  return Math.round(PULSE_MIN_US + ((angleDeg - ANGLE_MIN) / (ANGLE_MAX - ANGLE_MIN)) * (PULSE_MAX_US - PULSE_MIN_US));
}

function pointToText(point) {
  return `${point.timeMs}:${point.angleDeg}:${point.easing}`;
}

function buildCommand() {
  normalizeShapePoints();
  const pointText = shapePoints.map(pointToText).join(",");
  return `servo-shape duration=${currentDurationMs} points=${pointText}`;
}

function buildPatternJson() {
  normalizeShapePoints();
  const { safeMin, safeMax } = getSafeRange();
  return {
    schema: "haptell-servo-shape-pattern/v1",
    durationMs: currentDurationMs,
    servo: {
      minAngleDeg: ANGLE_MIN,
      maxAngleDeg: ANGLE_MAX,
      neutralAngleDeg: NEUTRAL_ANGLE,
      minPulseUs: PULSE_MIN_US,
      maxPulseUs: PULSE_MAX_US,
      safeMinAngleDeg: safeMin,
      safeMaxAngleDeg: safeMax,
    },
    points: shapePoints.map(copyPoint),
  };
}

function setStatus(message, kind) {
  statusEl.textContent = message;
  statusEl.className = `status ${kind || ""}`.trim();
}

function updatePreview() {
  previewEl.value = buildCommand();
  dataPreviewEl.value = JSON.stringify(buildPatternJson(), null, 2);
}

function easeProgress(t, easing) {
  t = clamp(t, 0, 1);

  if (easing === "easeIn") {
    return t * t;
  }

  if (easing === "easeOut") {
    const u = 1 - t;
    return 1 - u * u;
  }

  if (easing === "easeInOut") {
    if (t < 0.5) {
      return 2 * t * t;
    }

    const u = -2 * t + 2;
    return 1 - (u * u) / 2;
  }

  return t;
}

function getAngleAtTime(timeMs) {
  normalizeShapePoints();
  if (timeMs <= shapePoints[0].timeMs) {
    return shapePoints[0].angleDeg;
  }

  for (let i = 1; i < shapePoints.length; i++) {
    const previous = shapePoints[i - 1];
    const next = shapePoints[i];

    if (timeMs <= next.timeMs) {
      const durationMs = next.timeMs - previous.timeMs;
      if (durationMs === 0) {
        return next.angleDeg;
      }

      const elapsedMs = timeMs - previous.timeMs;
      const progress = easeProgress(elapsedMs / durationMs, next.easing);
      return previous.angleDeg + (next.angleDeg - previous.angleDeg) * progress;
    }
  }

  return shapePoints[shapePoints.length - 1].angleDeg;
}

function graphPoint(timeMs, angleDeg) {
  const x = GRAPH.left + (timeMs / currentDurationMs) * GRAPH.width;
  const y = GRAPH.top + GRAPH.height - (angleDeg / ANGLE_MAX) * GRAPH.height;
  return { x, y };
}

function drawGrid() {
  const lines = [];
  const bottom = GRAPH.top + GRAPH.height;
  const right = GRAPH.left + GRAPH.width;

  lines.push(`<text class="axis-label" x="${GRAPH.left}" y="18" text-anchor="start">angle deg</text>`);

  for (let i = 0; i <= 6; i++) {
    const x = GRAPH.left + (GRAPH.width * i) / 6;
    const time = Math.round((currentDurationMs * i) / 6);
    const anchor = i === 0 ? "start" : i === 6 ? "end" : "middle";
    lines.push(`<line class="grid-line" x1="${x}" y1="${GRAPH.top}" x2="${x}" y2="${bottom}"></line>`);
    lines.push(`<text class="grid-text" x="${x}" y="${bottom + 30}" text-anchor="${anchor}">${time} ms</text>`);
  }

  for (let i = 0; i <= 6; i++) {
    const angle = Math.round(ANGLE_MAX - (ANGLE_MAX * i) / 6);
    const y = GRAPH.top + (GRAPH.height * i) / 6;
    lines.push(`<line class="grid-line" x1="${GRAPH.left}" y1="${y}" x2="${right}" y2="${y}"></line>`);
    lines.push(`<text class="grid-text" x="${GRAPH.left - 16}" y="${y + 5}" text-anchor="end">${angle}</text>`);
  }

  gridLayerEl.innerHTML = lines.join("");
}

function segmentSpeed(previous, next) {
  const dt = Math.max(1, next.timeMs - previous.timeMs);
  return Math.abs(next.angleDeg - previous.angleDeg) / (dt / 1000);
}

function speedClass(speed) {
  if (speed > SERVO_FAST_SPEED_DEG_PER_SEC) {
    return "over";
  }

  if (speed > SERVO_WARN_SPEED_DEG_PER_SEC) {
    return "warn";
  }

  return "ok";
}

function renderGraph() {
  normalizeShapePoints();
  const { safeMin, safeMax } = getSafeRange();
  drawGrid();

  const safeTop = graphPoint(0, safeMax).y;
  const safeBottom = graphPoint(0, safeMin).y;
  safeBandEl.setAttribute("y", safeTop);
  safeBandEl.setAttribute("height", safeBottom - safeTop);

  const neutralY = graphPoint(0, NEUTRAL_ANGLE).y;
  neutralLineEl.setAttribute("y1", neutralY);
  neutralLineEl.setAttribute("y2", neutralY);
  neutralLabelEl.setAttribute("y", neutralY);

  const segments = [];
  for (let i = 1; i < shapePoints.length; i++) {
    const previous = shapePoints[i - 1];
    const next = shapePoints[i];
    const samples = [];
    const steps = Math.max(2, Math.ceil((next.timeMs - previous.timeMs) / 24));
    for (let step = 0; step <= steps; step++) {
      const timeMs = previous.timeMs + ((next.timeMs - previous.timeMs) * step) / steps;
      const angleDeg = getAngleAtTime(timeMs);
      const point = graphPoint(timeMs, angleDeg);
      samples.push(`${point.x},${point.y}`);
    }

    const speed = segmentSpeed(previous, next);
    segments.push(`<polyline class="shape-segment ${speedClass(speed)}" points="${samples.join(" ")}"></polyline>`);
  }
  segmentLayerEl.innerHTML = segments.join("");

  const pointMarkup = shapePoints
    .map((point, index) => {
      const coords = graphPoint(point.timeMs, point.angleDeg);
      const previous = shapePoints[index - 1];
      const cls = previous ? speedClass(segmentSpeed(previous, point)) : "ok";
      const labelY = coords.y < GRAPH.top + 34 ? coords.y + 28 : coords.y - 14;
      return `
        <circle class="shape-point ${cls}" data-index="${index}" cx="${coords.x}" cy="${coords.y}" r="8"></circle>
        <text class="shape-point-label" x="${coords.x}" y="${labelY}" text-anchor="middle">${index + 1}</text>
      `;
    })
    .join("");
  pointLayerEl.innerHTML = pointMarkup;
}

function renderWarnings() {
  normalizeShapePoints();
  const warnings = [];
  const { safeMin, safeMax } = getSafeRange();

  for (let i = 0; i < shapePoints.length; i++) {
    const point = shapePoints[i];
    if (point.angleDeg < safeMin || point.angleDeg > safeMax) {
      warnings.push({
        kind: "warn",
        text: `Point ${i + 1}: ${point.angleDeg} deg is outside the shaded safe band (${safeMin}-${safeMax} deg).`,
      });
    }
  }

  for (let i = 1; i < shapePoints.length; i++) {
    const speed = segmentSpeed(shapePoints[i - 1], shapePoints[i]);
    if (speed > SERVO_FAST_SPEED_DEG_PER_SEC) {
      warnings.push({
        kind: "over",
        text: `Segment ${i}-${i + 1}: ${Math.round(speed)} deg/s exceeds the conservative 4.8 V no-load speed estimate (${SERVO_FAST_SPEED_DEG_PER_SEC} deg/s).`,
      });
    } else if (speed > SERVO_WARN_SPEED_DEG_PER_SEC) {
      warnings.push({
        kind: "warn",
        text: `Segment ${i}-${i + 1}: ${Math.round(speed)} deg/s is close to the conservative speed limit.`,
      });
    }
  }

  const last = shapePoints[shapePoints.length - 1];
  if (last.angleDeg !== NEUTRAL_ANGLE) {
    warnings.push({
      kind: "warn",
      text: `Final point ends at ${last.angleDeg} deg instead of neutral ${NEUTRAL_ANGLE} deg.`,
    });
  }

  if (warnings.length === 0) {
    warningsListEl.innerHTML = `<div class="warning-item ok">No warnings for this pattern.</div>`;
    return;
  }

  warningsListEl.innerHTML = warnings
    .map((warning) => `<div class="warning-item ${warning.kind}">${warning.text}</div>`)
    .join("");
}

function renderAddAfterOptions() {
  const maxIndex = Math.max(0, shapePoints.length - 2);
  addAfterIndex = clamp(Math.round(addAfterIndex), 0, maxIndex);

  addAfterPointEl.innerHTML = shapePoints
    .slice(0, -1)
    .map((point, index) => `<option value="${index}">#${index + 1} (${point.timeMs} ms)</option>`)
    .join("");

  addAfterPointEl.value = String(addAfterIndex);
  addAfterPointEl.disabled = shapePoints.length >= MAX_POINTS;
  addPointButtonEl.disabled = shapePoints.length >= MAX_POINTS;
}

function easingOptions(selected) {
  return EASINGS.map((easing) => {
    const isSelected = easing === selected ? "selected" : "";
    return `<option value="${easing}" ${isSelected}>${easing}</option>`;
  }).join("");
}

function renderPointRows() {
  normalizeShapePoints();
  renderAddAfterOptions();

  const rows = shapePoints
    .map((point, index) => {
      const isFirst = index === 0;
      const isLast = index === shapePoints.length - 1;
      const previous = shapePoints[index - 1];
      const cls = previous ? speedClass(segmentSpeed(previous, point)) : "ok";
      const actionCell = isFirst || isLast
        ? `<div class="point-action" aria-hidden="true"></div>`
        : `<button class="point-action" type="button" data-remove-point="${index}">Remove</button>`;

      return `
        <div class="point-row ${cls}">
          <div class="point-number">${index + 1}</div>
          <input aria-label="Point ${index + 1} time" type="number" min="0" max="${currentDurationMs}" step="10" value="${point.timeMs}" data-point-time="${index}" ${isFirst || isLast ? "readonly" : ""}>
          <input aria-label="Point ${index + 1} angle" type="number" min="0" max="270" step="1" value="${point.angleDeg}" data-point-angle="${index}">
          <input aria-label="Point ${index + 1} pulse" type="text" value="${angleToPulseUs(point.angleDeg)}" readonly>
          <select aria-label="Point ${index + 1} easing" data-point-easing="${index}" ${isFirst ? "disabled" : ""}>${easingOptions(point.easing)}</select>
          ${actionCell}
        </div>
      `;
    })
    .join("");

  pointsListEl.innerHTML = `
    <div class="point-row point-row-head">
      <div>#</div>
      <div>time</div>
      <div>angle</div>
      <div>pulse us</div>
      <div>easing</div>
      <div></div>
    </div>
    ${rows}
  `;
}

function renderDesigner() {
  normalizeShapePoints();
  previewScrubEl.max = String(currentDurationMs);
  renderGraph();
  renderWarnings();
  renderPointRows();
  updateServoPreview(Number(previewScrubEl.value || 0));
  updatePreview();
}

function addPoint() {
  normalizeShapePoints();

  if (shapePoints.length >= MAX_POINTS) {
    setStatus("Max 30 points", "error");
    return;
  }

  const afterIndex = clamp(Number(addAfterPointEl.value) || 0, 0, shapePoints.length - 2);
  const previous = shapePoints[afterIndex];
  const next = shapePoints[afterIndex + 1];
  if (!next || next.timeMs - previous.timeMs <= 1) {
    setStatus(`No time gap after point ${afterIndex + 1}`, "error");
    return;
  }

  const timeMs = previous.timeMs + Math.round((next.timeMs - previous.timeMs) / 2);
  const angleDeg = Math.round(getAngleAtTime(timeMs));
  shapePoints.splice(afterIndex + 1, 0, { timeMs, angleDeg, easing: next.easing });
  addAfterIndex = afterIndex + 1;
  renderDesigner();
}

function removePoint(index) {
  normalizeShapePoints();
  if (index <= 0 || index >= shapePoints.length - 1) {
    return;
  }

  shapePoints.splice(index, 1);
  renderDesigner();
}

function applyPreset(name) {
  const preset = presets[name];
  if (!preset) {
    return;
  }

  setShapeDuration(preset.durationMs, false);
  shapePoints = preset.points.map(copyPoint);
  previewScrubEl.value = "0";
  stopPreview();
  renderDesigner();
}

function graphCoordinatesFromEvent(event) {
  const rect = graphEl.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * graphEl.viewBox.baseVal.width;
  const y = ((event.clientY - rect.top) / rect.height) * graphEl.viewBox.baseVal.height;
  return {
    x: clamp(x, GRAPH.left, GRAPH.left + GRAPH.width),
    y: clamp(y, GRAPH.top, GRAPH.top + GRAPH.height),
  };
}

function updatePointFromGraph(active, event) {
  const index = active.index;
  const isFirst = index === 0;
  const isLast = index === shapePoints.length - 1;
  const coords = graphCoordinatesFromEvent(event);
  const minTime = isFirst ? 0 : shapePoints[index - 1].timeMs + 10;
  const maxTime = isLast ? currentDurationMs : shapePoints[index + 1].timeMs - 10;
  const timeMs = Math.round(((coords.x - GRAPH.left) / GRAPH.width) * currentDurationMs);
  const angleDeg = Math.round(((GRAPH.top + GRAPH.height - coords.y) / GRAPH.height) * ANGLE_MAX);

  shapePoints[index] = {
    ...shapePoints[index],
    timeMs: clamp(timeMs, minTime, maxTime),
    angleDeg: clamp(angleDeg, ANGLE_MIN, ANGLE_MAX),
  };

  renderDesigner();
}

function updateServoPreview(timeMs) {
  const angle = getAngleAtTime(timeMs);
  const pulseUs = angleToPulseUs(angle);
  hornGroupEl.setAttribute("transform", `rotate(${angle - NEUTRAL_ANGLE} 140 117)`);
  previewAngleEl.textContent = `${Math.round(angle)} deg / ${pulseUs} us`;
  previewScrubEl.value = String(clamp(Math.round(timeMs), 0, currentDurationMs));
}

function playPreviewFrame(timestamp) {
  if (!previewStartedAt) {
    previewStartedAt = timestamp;
  }

  const elapsedMs = timestamp - previewStartedAt;
  updateServoPreview(elapsedMs);

  if (elapsedMs >= currentDurationMs) {
    stopPreview(false);
    updateServoPreview(currentDurationMs);
    return;
  }

  previewAnimation = requestAnimationFrame(playPreviewFrame);
}

function playPreview() {
  stopPreview(false);
  previewStartedAt = 0;
  previewAnimation = requestAnimationFrame(playPreviewFrame);
}

function stopPreview(resetToScrub = true) {
  if (previewAnimation) {
    cancelAnimationFrame(previewAnimation);
    previewAnimation = null;
  }
  previewStartedAt = 0;

  if (resetToScrub) {
    updateServoPreview(Number(previewScrubEl.value || 0));
  }
}

function showBusyWarning(durationMs) {
  if (busyTimer) {
    clearInterval(busyTimer);
  }

  const sendButton = document.querySelector("#sendShape");
  const endsAt = Date.now() + durationMs;
  busyPanelEl.classList.remove("hidden");
  sendButton.disabled = true;

  function updateBusyText() {
    const remainingMs = Math.max(0, endsAt - Date.now());
    const remainingSeconds = (remainingMs / 1000).toFixed(1);
    busyTextEl.textContent = `The firmware should be ready for a new command in about ${remainingSeconds} s.`;

    if (remainingMs <= 0) {
      clearInterval(busyTimer);
      busyTimer = null;
      busyPanelEl.classList.add("hidden");
      sendButton.disabled = false;
      setStatus("Ready", "");
    }
  }

  updateBusyText();
  busyTimer = setInterval(updateBusyText, 100);
}

async function sendShape() {
  commitDurationInput();
  const command = buildCommand();
  previewEl.value = command;
  dataPreviewEl.value = JSON.stringify(buildPatternJson(), null, 2);
  setStatus("Sending...", "");

  try {
    const response = await fetch("/api/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ipAddress: inputs.ipAddress.value,
        port: inputs.port.value,
        command,
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.error || "Failed to send command.");
    }

    setStatus(`Sent ${result.bytesSent} bytes`, "ok");
    playPreview();
    showBusyWarning(currentDurationMs);
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function sendNeutral() {
  setStatus("Sending neutral...", "");

  try {
    const response = await fetch("/api/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ipAddress: inputs.ipAddress.value,
        port: inputs.port.value,
        command: "stop",
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.error || "Failed to send neutral command.");
    }

    updateServoPreview(0);
    setStatus("Neutral sent", "ok");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

function defaultJsonFileName(pattern) {
  return `haptell-05-servo-shape-${pattern.durationMs}ms.json`;
}

function downloadJsonFallback(jsonText, fileName) {
  const blob = new Blob([jsonText], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function saveJson() {
  commitDurationInput();
  const pattern = buildPatternJson();
  const jsonText = JSON.stringify(pattern, null, 2);
  const fileName = defaultJsonFileName(pattern);

  if ("showSaveFilePicker" in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: "Haptell 05 servo shape pattern JSON",
            accept: { "application/json": [".json"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(jsonText);
      await writable.close();
      setStatus("JSON saved", "ok");
      return;
    } catch (error) {
      if (error.name === "AbortError") {
        setStatus("Save cancelled", "");
        return;
      }
    }
  }

  downloadJsonFallback(jsonText, fileName);
  setStatus("JSON download started", "ok");
}

function validateLoadedPattern(pattern) {
  if (!pattern || typeof pattern !== "object") {
    throw new Error("JSON file does not contain a pattern object.");
  }

  const durationMs = clamp(Math.round(Number(pattern.durationMs) || 0), MIN_DURATION_MS, MAX_DURATION_MS);
  if (!Array.isArray(pattern.points) || pattern.points.length < 2 || pattern.points.length > MAX_POINTS) {
    throw new Error("Pattern must contain 2-30 points.");
  }

  const points = pattern.points.map(copyPoint);
  for (const point of points) {
    if (!Number.isFinite(point.timeMs) || point.timeMs < 0 || point.timeMs > durationMs) {
      throw new Error("Point times are outside the allowed range.");
    }
  }

  points.sort((a, b) => a.timeMs - b.timeMs);
  for (let i = 1; i < points.length; i++) {
    if (points[i].timeMs === points[i - 1].timeMs) {
      throw new Error("Point times must be unique.");
    }
  }

  if (points[0].timeMs !== 0) {
    throw new Error("The first point must start at 0 ms.");
  }

  if (points[points.length - 1].timeMs !== durationMs) {
    throw new Error("The last point must be at durationMs.");
  }

  return { durationMs, points, servo: pattern.servo || {} };
}

async function loadJsonFile(file) {
  try {
    const loaded = validateLoadedPattern(JSON.parse(await file.text()));
    setShapeDuration(loaded.durationMs, false);
    shapePoints = loaded.points;
    if (Number.isFinite(Number(loaded.servo.safeMinAngleDeg))) {
      inputs.safeMin.value = clamp(Math.round(Number(loaded.servo.safeMinAngleDeg)), ANGLE_MIN, ANGLE_MAX);
    }
    if (Number.isFinite(Number(loaded.servo.safeMaxAngleDeg))) {
      inputs.safeMax.value = clamp(Math.round(Number(loaded.servo.safeMaxAngleDeg)), ANGLE_MIN, ANGLE_MAX);
    }
    stopPreview();
    renderDesigner();
    setStatus("JSON loaded", "ok");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function openJsonFilePicker() {
  if ("showOpenFilePicker" in window) {
    try {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [
          {
            description: "Haptell 05 servo shape pattern JSON",
            accept: { "application/json": [".json"] },
          },
        ],
      });
      await loadJsonFile(await handle.getFile());
      return;
    } catch (error) {
      if (error.name === "AbortError") {
        setStatus("Load cancelled", "");
        return;
      }
      setStatus(error.message, "error");
      return;
    }
  }

  document.querySelector("#loadJson").click();
}

function loadJsonInputFile(event) {
  const file = event.target.files?.[0];
  if (file) {
    loadJsonFile(file);
  }
  event.target.value = "";
}

document.querySelector("#sendShape").addEventListener("click", sendShape);
document.querySelector("#goNeutral").addEventListener("click", sendNeutral);
document.querySelector("#saveJson").addEventListener("click", saveJson);
document.querySelector("#loadJsonButton").addEventListener("click", openJsonFilePicker);
document.querySelector("#loadJson").addEventListener("change", loadJsonInputFile);
document.querySelector("#addPoint").addEventListener("click", addPoint);
document.querySelector("#playPreview").addEventListener("click", playPreview);
document.querySelector("#stopPreview").addEventListener("click", () => stopPreview());

document.querySelectorAll("button[data-preset]").forEach((button) => {
  button.addEventListener("click", () => applyPreset(button.dataset.preset));
});

addAfterPointEl.addEventListener("change", () => {
  addAfterIndex = Number(addAfterPointEl.value);
});

previewScrubEl.addEventListener("input", () => {
  stopPreview(false);
  updateServoPreview(Number(previewScrubEl.value || 0));
});

pointsListEl.addEventListener("input", (event) => {
  const timeIndex = event.target.dataset.pointTime;
  const angleIndex = event.target.dataset.pointAngle;

  if (timeIndex !== undefined) {
    shapePoints[Number(timeIndex)].timeMs = Number(event.target.value);
  }

  if (angleIndex !== undefined) {
    shapePoints[Number(angleIndex)].angleDeg = Number(event.target.value);
  }

  renderGraph();
  renderWarnings();
  updatePreview();
  updateServoPreview(Number(previewScrubEl.value || 0));
});

pointsListEl.addEventListener("change", (event) => {
  const easingIndex = event.target.dataset.pointEasing;
  if (easingIndex !== undefined) {
    shapePoints[Number(easingIndex)].easing = event.target.value;
  }
  renderDesigner();
});

pointsListEl.addEventListener("click", (event) => {
  const removeIndex = event.target.dataset.removePoint;
  if (removeIndex !== undefined) {
    removePoint(Number(removeIndex));
  }
});

graphEl.addEventListener("pointerdown", (event) => {
  const target = event.target.closest(".shape-point");
  if (!target) {
    return;
  }

  activePoint = {
    index: Number(target.dataset.index),
  };
  graphEl.setPointerCapture(event.pointerId);
});

graphEl.addEventListener("pointermove", (event) => {
  if (activePoint === null) {
    return;
  }

  updatePointFromGraph(activePoint, event);
});

graphEl.addEventListener("pointerup", (event) => {
  activePoint = null;
  graphEl.releasePointerCapture(event.pointerId);
});

Object.values(inputs).forEach((input) => {
  input.addEventListener("input", () => {
    if (input === inputs.shapeDuration || input === inputs.tableShapeDuration) {
      sanitizeDurationInput();
      if (input === inputs.tableShapeDuration) {
        inputs.shapeDuration.value = inputs.tableShapeDuration.value;
      } else {
        inputs.tableShapeDuration.value = inputs.shapeDuration.value;
      }
      return;
    }
    renderDesigner();
  });
  input.addEventListener("change", () => {
    if (input === inputs.shapeDuration || input === inputs.tableShapeDuration) {
      if (input === inputs.tableShapeDuration) {
        inputs.shapeDuration.value = inputs.tableShapeDuration.value;
      }
      commitDurationInput();
      return;
    }
    renderDesigner();
  });
});

inputs.shapeDuration.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    commitDurationInput();
    inputs.shapeDuration.blur();
  }
});

inputs.tableShapeDuration.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    inputs.shapeDuration.value = inputs.tableShapeDuration.value;
    commitDurationInput();
    inputs.tableShapeDuration.blur();
  }
});

[inputs.shapeDuration, inputs.tableShapeDuration].forEach((input) => {
  input.addEventListener("wheel", (event) => {
    event.preventDefault();
  }, { passive: false });
});

setShapeDuration(currentDurationMs, false);
renderDesigner();
