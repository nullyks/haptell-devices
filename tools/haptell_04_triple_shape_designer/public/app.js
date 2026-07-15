const MAX_DURATION_MS = 15000;
const MIN_DURATION_MS = 100;
const MAX_POINTS = 30;
const MOTOR_COUNT = 3;
const MIN_ZOOM_LEVEL = 1;
const MAX_ZOOM_LEVEL = 8;
const ZOOM_STEP = 0.5;
const GRAPH = {
  left: 86,
  top: 34,
  width: 804,
  height: 374,
};

const statusEl = document.querySelector("#status");
const busyPanelEl = document.querySelector("#busyPanel");
const busyTextEl = document.querySelector("#busyText");
const previewEl = document.querySelector("#commandPreview");
const dataPreviewEl = document.querySelector("#dataPreview");
const graphEl = document.querySelector("#envelopeGraph");
const gridLayerEl = document.querySelector("#gridLayer");
const pointLayerEl = document.querySelector("#pointLayer");
const motorLineEls = [
  document.querySelector("#motorLine0"),
  document.querySelector("#motorLine1"),
  document.querySelector("#motorLine2"),
];
const pointsListEl = document.querySelector("#pointsList");
const zoomDisplayEl = document.querySelector("#zoomDisplay");
const zoomRangeEl = document.querySelector("#zoomRange");
const zoomPanEl = document.querySelector("#zoomPan");
const addAfterPointEl = document.querySelector("#addAfterPoint");
const addPointButtonEl = document.querySelector("#addPoint");

const inputs = {
  ipAddress: document.querySelector("#ipAddress"),
  port: document.querySelector("#port"),
  target: document.querySelector("#target"),
  shapeDuration: document.querySelector("#shapeDuration"),
};

const presets = {
  wave: {
    durationMs: 3000,
    points: [
      { timeMs: 0, motors: [0, 0, 0] },
      { timeMs: 500, motors: [180, 40, 0] },
      { timeMs: 1000, motors: [90, 180, 40] },
      { timeMs: 1500, motors: [20, 90, 180] },
      { timeMs: 2400, motors: [0, 40, 120] },
      { timeMs: 3000, motors: [0, 0, 0] },
    ],
  },
  chase: {
    durationMs: 4200,
    points: [
      { timeMs: 0, motors: [0, 0, 0] },
      { timeMs: 250, motors: [220, 0, 0] },
      { timeMs: 900, motors: [0, 220, 0] },
      { timeMs: 1550, motors: [0, 0, 220] },
      { timeMs: 2300, motors: [180, 180, 0] },
      { timeMs: 3200, motors: [0, 180, 180] },
      { timeMs: 4200, motors: [0, 0, 0] },
    ],
  },
  allPulse: {
    durationMs: 2600,
    points: [
      { timeMs: 0, motors: [0, 0, 0] },
      { timeMs: 250, motors: [180, 180, 180] },
      { timeMs: 1900, motors: [180, 180, 180] },
      { timeMs: 2600, motors: [0, 0, 0] },
    ],
  },
  alternating: {
    durationMs: 6000,
    points: [
      { timeMs: 0, motors: [80, 0, 80] },
      { timeMs: 900, motors: [80, 0, 80] },
      { timeMs: 1200, motors: [0, 180, 0] },
      { timeMs: 2400, motors: [0, 180, 0] },
      { timeMs: 2800, motors: [200, 60, 200] },
      { timeMs: 4800, motors: [200, 60, 200] },
      { timeMs: 6000, motors: [0, 0, 0] },
    ],
  },
};

let nextPointId = 1;

function createPoint(timeMs, motors, id) {
  return {
    id: id || `point-${nextPointId++}`,
    timeMs,
    motors: normalizedMotors(motors),
  };
}

let shapePoints = [
  { timeMs: 0, motors: [0, 0, 0] },
  { timeMs: 500, motors: [180, 60, 0] },
  { timeMs: 2200, motors: [80, 180, 140] },
  { timeMs: 3000, motors: [0, 0, 0] },
].map((point) => createPoint(point.timeMs, point.motors));

let activePoint = null;
let busyTimer = null;
let graphZoomLevel = 1;
let graphViewStartRatio = 0;
let currentDurationMs = 3000;
let addAfterPointId = shapePoints[0].id;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getTarget() {
  return inputs.target.value.trim() || "haptell-04-triple-dc-shape";
}

function getDuration() {
  return currentDurationMs;
}

function sanitizeDurationInput() {
  const cleaned = inputs.shapeDuration.value.replace(/\D/g, "");
  if (inputs.shapeDuration.value !== cleaned) {
    inputs.shapeDuration.value = cleaned;
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

function normalizedMotors(values) {
  const motors = Array.isArray(values) ? values : [];
  return Array.from({ length: MOTOR_COUNT }, (_, index) => {
    return clamp(Math.round(Number(motors[index]) || 0), 0, 255);
  });
}

function setShapeDuration(nextDurationMs, scalePoints) {
  nextDurationMs = clamp(Math.round(Number(nextDurationMs) || currentDurationMs), MIN_DURATION_MS, MAX_DURATION_MS);
  const previousDurationMs = currentDurationMs;

  if (scalePoints && previousDurationMs > 0 && nextDurationMs !== previousDurationMs) {
    const ratio = nextDurationMs / previousDurationMs;
    shapePoints = shapePoints.map((point, index) => {
      const isFirst = index === 0;
      const isLast = index === shapePoints.length - 1;
      return createPoint(
        isFirst ? 0 : isLast ? nextDurationMs : clamp(Math.round(point.timeMs * ratio), 0, nextDurationMs),
        point.motors,
        point.id,
      );
    });
    keepPointTimesOrdered(nextDurationMs);
  }

  currentDurationMs = nextDurationMs;
  inputs.shapeDuration.value = currentDurationMs;
}

function commitDurationInput() {
  setShapeDuration(getDurationInputValue(), true);
  renderDesigner();
}

function keepPointTimesOrdered(durationMs = getDuration()) {
  const lastIndex = shapePoints.length - 1;

  shapePoints = shapePoints.map((point) => createPoint(
    clamp(Math.round(Number(point.timeMs) || 0), 0, durationMs),
    point.motors,
    point.id,
  ));

  shapePoints[0].timeMs = 0;
  shapePoints[lastIndex].timeMs = durationMs;
  shapePoints[lastIndex].motors = [0, 0, 0];

  for (let index = 1; index < lastIndex; index++) {
    const minimum = shapePoints[index - 1].timeMs + 1;
    const remainingPoints = lastIndex - index;
    const maximum = durationMs - remainingPoints;
    shapePoints[index].timeMs = clamp(shapePoints[index].timeMs, minimum, maximum);
  }
}

function pointToText(point) {
  return `${point.timeMs}:${point.motors[0]}:${point.motors[1]}:${point.motors[2]}`;
}

function buildCommand() {
  const durationMs = getDuration();
  const pointText = shapePoints.map(pointToText).join(",");
  return `${getTarget()} shape duration=${durationMs} points=${pointText}`;
}

function buildPatternJson() {
  return {
    schema: "haptell-triple-dc-shape-pattern/v1",
    durationMs: getDuration(),
    points: shapePoints.map((point) => ({
      timeMs: point.timeMs,
      motor1: point.motors[0],
      motor2: point.motors[1],
      motor3: point.motors[2],
    })),
  };
}

function buildDataArray() {
  return [
    ["command", "shape"],
    ["target", getTarget()],
    ["durationMs", getDuration()],
    ["limits", [["durationMs", "100..15000"], ["points", "2..30"], ["intensity", "0..255 per motor"]]],
    [
      "points",
      [
        ["timeMs", "motor1", "motor2", "motor3"],
        ...shapePoints.map((point) => [point.timeMs, point.motors[0], point.motors[1], point.motors[2]]),
      ],
    ],
  ];
}

function setStatus(message, kind) {
  statusEl.textContent = message;
  statusEl.className = `status ${kind || ""}`.trim();
}

function updatePreview() {
  previewEl.value = buildCommand();
  dataPreviewEl.value = JSON.stringify(buildDataArray(), null, 2);
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
    busyTextEl.textContent = `The firmware is blocking during playback. It should be able to receive a new shape in about ${remainingSeconds} s.`;

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
  const durationMs = getDuration();
  previewEl.value = command;
  dataPreviewEl.value = JSON.stringify(buildDataArray(), null, 2);
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
    showBusyWarning(durationMs);
  } catch (error) {
    setStatus(error.message, "error");
  }
}

function roundZoomLevel(value) {
  return Math.round(value / ZOOM_STEP) * ZOOM_STEP;
}

function getVisibleTimeRange() {
  const durationMs = getDuration();
  const windowDurationMs = durationMs / graphZoomLevel;
  const maxStartMs = Math.max(0, durationMs - windowDurationMs);
  const startMs = maxStartMs * graphViewStartRatio;
  return {
    startMs,
    endMs: startMs + windowDurationMs,
    windowDurationMs,
    maxStartMs,
  };
}

function clampZoomView() {
  graphZoomLevel = clamp(roundZoomLevel(graphZoomLevel), MIN_ZOOM_LEVEL, MAX_ZOOM_LEVEL);
  if (graphZoomLevel <= MIN_ZOOM_LEVEL) {
    graphZoomLevel = MIN_ZOOM_LEVEL;
    graphViewStartRatio = 0;
    return;
  }

  graphViewStartRatio = clamp(graphViewStartRatio, 0, 1);
}

function setGraphZoom(nextZoomLevel, anchorRatio = 0.5) {
  const oldRange = getVisibleTimeRange();
  const anchorTimeMs = oldRange.startMs + oldRange.windowDurationMs * anchorRatio;

  graphZoomLevel = clamp(roundZoomLevel(nextZoomLevel), MIN_ZOOM_LEVEL, MAX_ZOOM_LEVEL);

  const durationMs = getDuration();
  const nextWindowDurationMs = durationMs / graphZoomLevel;
  const nextMaxStartMs = Math.max(0, durationMs - nextWindowDurationMs);
  const nextStartMs = clamp(anchorTimeMs - nextWindowDurationMs * anchorRatio, 0, nextMaxStartMs);
  graphViewStartRatio = nextMaxStartMs === 0 ? 0 : nextStartMs / nextMaxStartMs;

  renderGraph();
}

function updateZoomControls() {
  const range = getVisibleTimeRange();
  const zoomPercent = Math.round(graphZoomLevel * 100);

  zoomDisplayEl.textContent = `${zoomPercent}%`;
  zoomRangeEl.textContent = `${Math.round(range.startMs)}-${Math.round(range.endMs)} ms`;
  zoomPanEl.disabled = graphZoomLevel <= MIN_ZOOM_LEVEL;
  zoomPanEl.value = Math.round(graphViewStartRatio * 1000);

  document.querySelector("#zoomOut").disabled = graphZoomLevel <= MIN_ZOOM_LEVEL;
  document.querySelector("#zoomIn").disabled = graphZoomLevel >= MAX_ZOOM_LEVEL;
  document.querySelector("#zoomFit").disabled = graphZoomLevel <= MIN_ZOOM_LEVEL;
}

function getMotorIntensityAtTime(timeMs, motorIndex) {
  if (timeMs <= shapePoints[0].timeMs) {
    return shapePoints[0].motors[motorIndex];
  }

  for (let i = 1; i < shapePoints.length; i++) {
    const previous = shapePoints[i - 1];
    const next = shapePoints[i];

    if (timeMs <= next.timeMs) {
      const durationMs = next.timeMs - previous.timeMs;
      if (durationMs === 0) {
        return next.motors[motorIndex];
      }

      const elapsedMs = timeMs - previous.timeMs;
      return previous.motors[motorIndex] + ((next.motors[motorIndex] - previous.motors[motorIndex]) * elapsedMs) / durationMs;
    }
  }

  return shapePoints[shapePoints.length - 1].motors[motorIndex];
}

function graphPoint(timeMs, intensity) {
  const range = getVisibleTimeRange();
  const x = GRAPH.left + ((timeMs - range.startMs) / range.windowDurationMs) * GRAPH.width;
  const y = GRAPH.top + GRAPH.height - (intensity / 255) * GRAPH.height;
  return { x, y };
}

function drawGrid() {
  const lines = [];
  const range = getVisibleTimeRange();
  const bottom = GRAPH.top + GRAPH.height;
  const right = GRAPH.left + GRAPH.width;

  lines.push(`<text class="axis-label" x="${GRAPH.left}" y="22" text-anchor="start">intensity</text>`);

  for (let i = 0; i <= 6; i++) {
    const x = GRAPH.left + (GRAPH.width * i) / 6;
    const time = Math.round(range.startMs + (range.windowDurationMs * i) / 6);
    const anchor = i === 0 ? "start" : i === 6 ? "end" : "middle";
    lines.push(`<line class="grid-line" x1="${x}" y1="${GRAPH.top}" x2="${x}" y2="${bottom}"></line>`);
    lines.push(`<text class="grid-text" x="${x}" y="${bottom + 28}" text-anchor="${anchor}">${time} ms</text>`);
  }

  for (let i = 0; i <= 5; i++) {
    const y = GRAPH.top + (GRAPH.height * i) / 5;
    const value = Math.round(255 - (255 * i) / 5);
    lines.push(`<line class="grid-line" x1="${GRAPH.left}" y1="${y}" x2="${right}" y2="${y}"></line>`);
    lines.push(`<text class="grid-text" x="${GRAPH.left - 18}" y="${y + 5}" text-anchor="end">${value}</text>`);
  }

  gridLayerEl.innerHTML = lines.join("");
}

function renderGraph() {
  clampZoomView();
  updateZoomControls();
  drawGrid();

  const range = getVisibleTimeRange();
  for (let motor = 0; motor < MOTOR_COUNT; motor++) {
    const visibleEnvelopePoints = [
      { timeMs: range.startMs, intensity: getMotorIntensityAtTime(range.startMs, motor) },
      ...shapePoints
        .filter((point) => point.timeMs > range.startMs && point.timeMs < range.endMs)
        .map((point) => ({ timeMs: point.timeMs, intensity: point.motors[motor] })),
      { timeMs: range.endMs, intensity: getMotorIntensityAtTime(range.endMs, motor) },
    ];

    const linePoints = visibleEnvelopePoints
      .map((point) => graphPoint(point.timeMs, point.intensity))
      .map((point) => `${point.x},${point.y}`)
      .join(" ");
    motorLineEls[motor].setAttribute("points", linePoints);
  }

  const labels = [];
  const bottom = GRAPH.top + GRAPH.height;
  for (let index = 0; index < shapePoints.length; index++) {
    const shapePoint = shapePoints[index];
    if (shapePoint.timeMs < range.startMs || shapePoint.timeMs > range.endMs) {
      continue;
    }

    for (let motor = 0; motor < MOTOR_COUNT; motor++) {
      const point = graphPoint(shapePoint.timeMs, shapePoint.motors[motor]);
      const endClass = index === shapePoints.length - 1 ? " end" : "";
      const labelX = clamp(point.x + (motor - 1) * 14, GRAPH.left + 16, GRAPH.left + GRAPH.width - 16);
      const labelY = point.y < GRAPH.top + 34 ? point.y + 26 : point.y - 14 - motor * 2;
      labels.push(`
        <circle class="shape-point motor-${motor + 1}${endClass}" data-point-id="${shapePoint.id}" data-motor="${motor}" cx="${point.x}" cy="${point.y}" r="7">
          <title>Drag vertically to change motor ${motor + 1} intensity</title>
        </circle>
        <text class="shape-point-label motor-label motor-${motor + 1}" x="${labelX}" y="${labelY}" text-anchor="middle">${motor + 1}</text>
      `);
    }

    if (index > 0 && index < shapePoints.length - 1) {
      const point = graphPoint(shapePoint.timeMs, 0);
      labels.push(`
        <line class="time-guide" x1="${point.x}" y1="${GRAPH.top}" x2="${point.x}" y2="${bottom}"></line>
        <rect class="time-handle" data-point-id="${shapePoint.id}" x="${point.x - 10}" y="${bottom - 12}" width="20" height="12" rx="3">
          <title>Drag horizontally to change this shared point time</title>
        </rect>
        <text class="time-point-label" x="${point.x}" y="${bottom - 3}" text-anchor="middle">${index + 1}</text>
      `);
    }
  }
  pointLayerEl.innerHTML = labels.join("");
}

function renderPointRows() {
  renderAddAfterOptions();

  const rows = shapePoints
    .map((point, index) => {
      const isFirst = index === 0;
      const isLast = index === shapePoints.length - 1;
      const timeBounds = getPointTimeBounds(index);
      const actionCell = isFirst || isLast
        ? `<div class="point-action" aria-hidden="true"></div>`
        : `<button class="point-action" type="button" data-remove-point="${point.id}">Remove</button>`;

      return `
        <div class="point-row" data-point-id="${point.id}">
          <div class="point-number">${index + 1}</div>
          <input aria-label="Point ${index + 1} time" type="number" min="${timeBounds.min}" max="${timeBounds.max}" step="10" value="${point.timeMs}" data-point-id="${point.id}" data-point-time ${isFirst || isLast ? "readonly" : ""}>
          <input aria-label="Point ${index + 1} motor 1" type="number" min="0" max="255" value="${point.motors[0]}" data-point-id="${point.id}" data-point-motor="0" ${isLast ? "readonly" : ""}>
          <input aria-label="Point ${index + 1} motor 2" type="number" min="0" max="255" value="${point.motors[1]}" data-point-id="${point.id}" data-point-motor="1" ${isLast ? "readonly" : ""}>
          <input aria-label="Point ${index + 1} motor 3" type="number" min="0" max="255" value="${point.motors[2]}" data-point-id="${point.id}" data-point-motor="2" ${isLast ? "readonly" : ""}>
          ${actionCell}
        </div>
      `;
    })
    .join("");

  pointsListEl.innerHTML = `
    <div class="point-row point-row-head">
      <div>#</div>
      <div>time</div>
      <div>M1</div>
      <div>M2</div>
      <div>M3</div>
      <div></div>
    </div>
    ${rows}
  `;
}

function getPointIndex(pointId) {
  return shapePoints.findIndex((point) => point.id === pointId);
}

function getPointTimeBounds(index) {
  const isFirst = index === 0;
  const isLast = index === shapePoints.length - 1;
  if (isFirst) {
    return { min: 0, max: 0 };
  }
  if (isLast) {
    const durationMs = getDuration();
    return { min: durationMs, max: durationMs };
  }

  return {
    min: shapePoints[index - 1].timeMs + 1,
    max: shapePoints[index + 1].timeMs - 1,
  };
}

function getAddAfterPointId() {
  const selectedIndex = getPointIndex(addAfterPointId);
  if (selectedIndex < 0 || selectedIndex >= shapePoints.length - 1) {
    addAfterPointId = shapePoints[0].id;
  }
  return addAfterPointId;
}

function renderAddAfterOptions() {
  addAfterPointEl.innerHTML = shapePoints
    .slice(0, -1)
    .map((point, index) => {
      return `<option value="${point.id}">#${index + 1} (${point.timeMs} ms)</option>`;
    })
    .join("");

  addAfterPointEl.value = getAddAfterPointId();
  addAfterPointEl.disabled = shapePoints.length >= MAX_POINTS;
  addPointButtonEl.disabled = shapePoints.length >= MAX_POINTS;
}

function renderDesigner() {
  renderGraph();
  renderPointRows();
  updatePreview();
}

function addPoint() {
  if (shapePoints.length >= MAX_POINTS) {
    setStatus("Max 30 points", "error");
    return;
  }

  const afterIndex = getPointIndex(getAddAfterPointId());
  const previousPoint = shapePoints[afterIndex];
  const nextPoint = shapePoints[afterIndex + 1];

  if (!nextPoint || nextPoint.timeMs - previousPoint.timeMs <= 1) {
    setStatus(`No time gap after point ${afterIndex + 1}`, "error");
    return;
  }

  const timeMs = previousPoint.timeMs + Math.round((nextPoint.timeMs - previousPoint.timeMs) / 2);
  const motors = Array.from({ length: MOTOR_COUNT }, (_, motor) => {
    return Math.round((previousPoint.motors[motor] + nextPoint.motors[motor]) / 2);
  });

  const point = createPoint(timeMs, motors);
  shapePoints.splice(afterIndex + 1, 0, point);
  addAfterPointId = point.id;
  renderDesigner();
}

function removePoint(pointId) {
  const index = getPointIndex(pointId);
  if (index <= 0 || index >= shapePoints.length - 1) {
    return;
  }

  shapePoints.splice(index, 1);
  addAfterPointId = shapePoints[Math.max(0, index - 1)].id;
  renderDesigner();
}

function applyPreset(name) {
  const preset = presets[name];
  if (!preset) {
    return;
  }

  setShapeDuration(preset.durationMs, false);
  shapePoints = preset.points.map((point) => createPoint(point.timeMs, point.motors));
  addAfterPointId = shapePoints[0].id;
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

function updateMotorIntensityFromGraph(active, event) {
  const index = getPointIndex(active.pointId);
  if (index < 0) {
    return;
  }

  const motor = active.motor;
  const isLast = index === shapePoints.length - 1;
  if (isLast) {
    return;
  }

  const coords = graphCoordinatesFromEvent(event);
  const intensity = Math.round(((GRAPH.top + GRAPH.height - coords.y) / GRAPH.height) * 255);

  shapePoints[index] = {
    ...shapePoints[index],
    motors: shapePoints[index].motors.map((value, motorIndex) => {
      return motorIndex === motor ? clamp(intensity, 0, 255) : value;
    }),
  };

  renderGraph();
  renderPointRows();
  updatePreview();
}

function updatePointTimeFromGraph(active, event) {
  const index = getPointIndex(active.pointId);
  if (index <= 0 || index >= shapePoints.length - 1) {
    return;
  }

  const coords = graphCoordinatesFromEvent(event);
  const range = getVisibleTimeRange();
  const requestedTime = Math.round(range.startMs + ((coords.x - GRAPH.left) / GRAPH.width) * range.windowDurationMs);
  const bounds = getPointTimeBounds(index);
  shapePoints[index] = {
    ...shapePoints[index],
    timeMs: clamp(requestedTime, bounds.min, bounds.max),
  };

  renderDesigner();
}

function updateMotorIntensityFromTable(pointId, motor, value) {
  const index = getPointIndex(pointId);
  if (index < 0 || index === shapePoints.length - 1) {
    return;
  }

  shapePoints[index].motors[motor] = clamp(Math.round(Number(value) || 0), 0, 255);
  renderGraph();
  updatePreview();
}

function commitPointTimeFromTable(pointId, value) {
  const index = getPointIndex(pointId);
  if (index <= 0 || index >= shapePoints.length - 1) {
    return;
  }

  const timeText = String(value).trim();
  if (!/^\d+$/.test(timeText)) {
    setStatus("Point time must be a number", "error");
    renderPointRows();
    return;
  }

  const requestedTime = Number(timeText);
  const bounds = getPointTimeBounds(index);
  shapePoints[index].timeMs = clamp(Math.round(requestedTime), bounds.min, bounds.max);
  renderDesigner();
}

function defaultJsonFileName(pattern) {
  return `haptell-04-triple-shape-${pattern.durationMs}ms.json`;
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
            description: "Haptell 04 triple shape pattern JSON",
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

function pointMotorsFromLoadedPoint(point) {
  if (Array.isArray(point.motors)) {
    return normalizedMotors(point.motors);
  }

  return normalizedMotors([point.motor1, point.motor2, point.motor3]);
}

function validateLoadedPattern(pattern) {
  if (!pattern || typeof pattern !== "object") {
    throw new Error("JSON file does not contain a pattern object.");
  }

  const durationMs = clamp(Math.round(Number(pattern.durationMs) || 0), MIN_DURATION_MS, MAX_DURATION_MS);
  if (!Array.isArray(pattern.points) || pattern.points.length < 2 || pattern.points.length > MAX_POINTS) {
    throw new Error("Pattern must contain 2-30 points.");
  }

  const points = pattern.points.map((point) => ({
    timeMs: Math.round(Number(point.timeMs)),
    motors: pointMotorsFromLoadedPoint(point),
  }));

  for (const point of points) {
    if (!Number.isFinite(point.timeMs)) {
      throw new Error("Every point must have numeric timeMs.");
    }
    if (point.timeMs < 0 || point.timeMs > durationMs) {
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

  const last = points[points.length - 1];
  if (last.timeMs !== durationMs || last.motors.some((value) => value !== 0)) {
    throw new Error("The last point must be at durationMs and all motor values must be 0.");
  }

  return { durationMs, points };
}

async function loadJsonFile(file) {
  try {
    const loaded = validateLoadedPattern(JSON.parse(await file.text()));
    setShapeDuration(loaded.durationMs, false);
    shapePoints = loaded.points.map((point) => createPoint(point.timeMs, point.motors));
    addAfterPointId = shapePoints[0].id;
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
            description: "Haptell 04 triple shape pattern JSON",
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
document.querySelector("#saveJson").addEventListener("click", saveJson);
document.querySelector("#loadJsonButton").addEventListener("click", openJsonFilePicker);
document.querySelector("#loadJson").addEventListener("change", loadJsonInputFile);

document.querySelectorAll("button[data-preset]").forEach((button) => {
  button.addEventListener("click", () => applyPreset(button.dataset.preset));
});

addAfterPointEl.addEventListener("change", () => {
  addAfterPointId = addAfterPointEl.value;
});
addPointButtonEl.addEventListener("click", addPoint);
document.querySelector("#zoomOut").addEventListener("click", () => setGraphZoom(graphZoomLevel - ZOOM_STEP));
document.querySelector("#zoomIn").addEventListener("click", () => setGraphZoom(graphZoomLevel + ZOOM_STEP));
document.querySelector("#zoomFit").addEventListener("click", () => {
  graphZoomLevel = MIN_ZOOM_LEVEL;
  graphViewStartRatio = 0;
  renderGraph();
});
zoomPanEl.addEventListener("input", () => {
  graphViewStartRatio = Number(zoomPanEl.value) / 1000;
  renderGraph();
});

pointsListEl.addEventListener("input", (event) => {
  const pointId = event.target.dataset.pointId;
  const isTimeInput = event.target.dataset.pointTime !== undefined;
  const motorIndex = event.target.dataset.pointMotor;

  if (pointId && !isTimeInput && motorIndex !== undefined) {
    updateMotorIntensityFromTable(pointId, Number(motorIndex), event.target.value);
  }
});

pointsListEl.addEventListener("change", (event) => {
  const pointId = event.target.dataset.pointId;
  if (!pointId) {
    return;
  }

  if (event.target.dataset.pointTime !== undefined) {
    commitPointTimeFromTable(pointId, event.target.value);
    return;
  }

  if (event.target.dataset.pointMotor !== undefined) {
    renderDesigner();
  }
});

pointsListEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target.dataset.pointTime !== undefined) {
    event.target.blur();
  }
});

pointsListEl.addEventListener("click", (event) => {
  const removePointId = event.target.dataset.removePoint;
  if (removePointId !== undefined) {
    removePoint(removePointId);
  }
});

graphEl.addEventListener("pointerdown", (event) => {
  const intensityHandle = event.target.closest(".shape-point");
  const timeHandle = event.target.closest(".time-handle");
  const target = intensityHandle || timeHandle;
  if (!target) {
    return;
  }

  activePoint = intensityHandle
    ? { kind: "intensity", pointId: target.dataset.pointId, motor: Number(target.dataset.motor) }
    : { kind: "time", pointId: target.dataset.pointId };
  graphEl.setPointerCapture(event.pointerId);
});

graphEl.addEventListener("pointermove", (event) => {
  if (activePoint === null) {
    return;
  }

  if (activePoint.kind === "time") {
    updatePointTimeFromGraph(activePoint, event);
  } else {
    updateMotorIntensityFromGraph(activePoint, event);
  }
});

graphEl.addEventListener("pointerup", (event) => {
  activePoint = null;
  graphEl.releasePointerCapture(event.pointerId);
});

graphEl.addEventListener("pointercancel", () => {
  activePoint = null;
});

graphEl.addEventListener("wheel", (event) => {
  event.preventDefault();
  const coords = graphCoordinatesFromEvent(event);
  const anchorRatio = (coords.x - GRAPH.left) / GRAPH.width;
  const direction = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
  setGraphZoom(graphZoomLevel + direction, anchorRatio);
});

Object.values(inputs).forEach((input) => {
  input.addEventListener("input", () => {
    if (input === inputs.shapeDuration) {
      sanitizeDurationInput();
      return;
    }
    updatePreview();
  });
  input.addEventListener("change", () => {
    if (input === inputs.shapeDuration) {
      commitDurationInput();
      return;
    }
    updatePreview();
  });
});

inputs.shapeDuration.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    commitDurationInput();
    inputs.shapeDuration.blur();
  }
});

inputs.shapeDuration.addEventListener("wheel", (event) => {
  event.preventDefault();
}, { passive: false });

renderDesigner();
