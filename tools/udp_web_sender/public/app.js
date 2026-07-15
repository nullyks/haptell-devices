const MAX_DURATION_MS = 5000;
const MIN_DURATION_MS = 100;
const MAX_POINTS = 24;
const GRAPH = {
  left: 72,
  top: 24,
  width: 600,
  height: 220,
};

const statusEl = document.querySelector("#status");
const previewEl = document.querySelector("#commandPreview");
const dataPreviewEl = document.querySelector("#dataPreview");
const graphEl = document.querySelector("#envelopeGraph");
const gridLayerEl = document.querySelector("#gridLayer");
const pointLayerEl = document.querySelector("#pointLayer");
const envelopeLineEl = document.querySelector("#envelopeLine");
const envelopeFillEl = document.querySelector("#envelopeFill");
const pointsListEl = document.querySelector("#pointsList");

const inputs = {
  ipAddress: document.querySelector("#ipAddress"),
  port: document.querySelector("#port"),
  target: document.querySelector("#target"),
  pulseIntensity: document.querySelector("#pulseIntensity"),
  pulseDuration: document.querySelector("#pulseDuration"),
  doubleIntensity: document.querySelector("#doubleIntensity"),
  doubleGap: document.querySelector("#doubleGap"),
  rampFrom: document.querySelector("#rampFrom"),
  rampTo: document.querySelector("#rampTo"),
  rampDuration: document.querySelector("#rampDuration"),
  shapeDuration: document.querySelector("#shapeDuration"),
};

const presets = {
  tap: {
    durationMs: 180,
    points: [
      { timeMs: 0, intensity: 0 },
      { timeMs: 20, intensity: 220 },
      { timeMs: 80, intensity: 220 },
      { timeMs: 180, intensity: 0 },
    ],
  },
  double: {
    durationMs: 560,
    points: [
      { timeMs: 0, intensity: 0 },
      { timeMs: 20, intensity: 220 },
      { timeMs: 90, intensity: 220 },
      { timeMs: 150, intensity: 0 },
      { timeMs: 250, intensity: 0 },
      { timeMs: 270, intensity: 210 },
      { timeMs: 350, intensity: 210 },
      { timeMs: 560, intensity: 0 },
    ],
  },
  pulse: {
    durationMs: 1000,
    points: [
      { timeMs: 0, intensity: 0 },
      { timeMs: 80, intensity: 180 },
      { timeMs: 720, intensity: 180 },
      { timeMs: 1000, intensity: 0 },
    ],
  },
  ramp: {
    durationMs: 1400,
    points: [
      { timeMs: 0, intensity: 0 },
      { timeMs: 1200, intensity: 230 },
      { timeMs: 1400, intensity: 0 },
    ],
  },
  heartbeat: {
    durationMs: 1200,
    points: [
      { timeMs: 0, intensity: 0 },
      { timeMs: 35, intensity: 230 },
      { timeMs: 120, intensity: 0 },
      { timeMs: 240, intensity: 180 },
      { timeMs: 380, intensity: 0 },
      { timeMs: 1200, intensity: 0 },
    ],
  },
};

let nextPointId = 1;

function createPoint(timeMs, intensity, id) {
  return {
    id: id || `point-${nextPointId++}`,
    timeMs,
    intensity: clamp(Math.round(Number(intensity) || 0), 0, 255),
  };
}

let shapePoints = [
  { timeMs: 0, intensity: 0 },
  { timeMs: 100, intensity: 180 },
  { timeMs: 700, intensity: 180 },
  { timeMs: 1200, intensity: 60 },
  { timeMs: 1600, intensity: 0 },
].map((point) => createPoint(point.timeMs, point.intensity));
let activePoint = null;
let lastPointerCommandButton = null;
let lastPointerCommandAt = 0;

function getTarget() {
  return inputs.target.value.trim() || "haptell-02";
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getDuration() {
  return clamp(Number(inputs.shapeDuration.value) || 1600, MIN_DURATION_MS, MAX_DURATION_MS);
}

function normalizeShapePoints() {
  const durationMs = getDuration();
  inputs.shapeDuration.value = durationMs;

  shapePoints = shapePoints
    .map((point) => createPoint(
      clamp(Math.round(Number(point.timeMs) || 0), 0, durationMs),
      point.intensity,
      point.id,
    ))
    .sort((a, b) => a.timeMs - b.timeMs);

  shapePoints = shapePoints.filter((point, index, points) => {
    return index === 0 || point.timeMs !== points[index - 1].timeMs;
  });

  if (shapePoints.length === 0 || shapePoints[0].timeMs !== 0) {
    shapePoints.unshift(createPoint(0, 0));
  }

  if (shapePoints[shapePoints.length - 1].timeMs !== durationMs) {
    shapePoints.push(createPoint(durationMs, 0));
  }

  shapePoints[0] = createPoint(0, 0, shapePoints[0].id);
  shapePoints[shapePoints.length - 1] = createPoint(durationMs, 0, shapePoints[shapePoints.length - 1].id);

  if (shapePoints.length > MAX_POINTS) {
    const first = shapePoints[0];
    const last = shapePoints[shapePoints.length - 1];
    shapePoints = [first, ...shapePoints.slice(1, MAX_POINTS - 1), last];
  }
}

function buildCommand(action) {
  const target = getTarget();

  if (action === "pulse") {
    return `${target} pulse intensity=${inputs.pulseIntensity.value} duration=${inputs.pulseDuration.value}`;
  }

  if (action === "double") {
    return `${target} double intensity=${inputs.doubleIntensity.value} gap=${inputs.doubleGap.value}`;
  }

  if (action === "ramp") {
    return `${target} ramp from=${inputs.rampFrom.value} to=${inputs.rampTo.value} duration=${inputs.rampDuration.value}`;
  }

  if (action === "shape") {
    const durationMs = getDuration();
    const pointText = shapePoints.map((point) => `${point.timeMs}:${point.intensity}`).join(",");
    return `${target} shape duration=${durationMs} points=${pointText}`;
  }

  return `${target} stop`;
}

function buildDataArray(action = "shape") {
  if (action !== "shape") {
    return [
      ["target", getTarget()],
      ["command", action],
    ];
  }

  return [
    ["target", getTarget()],
    ["command", "shape"],
    ["durationMs", getDuration()],
    ["mode", "amplitude-envelope"],
    [
      "points",
      [
        ["timeMs", "intensity"],
        ...shapePoints.map((point) => [point.timeMs, point.intensity]),
      ],
    ],
  ];
}

function setStatus(message, kind) {
  statusEl.textContent = message;
  statusEl.className = `status ${kind || ""}`.trim();
}

function updatePreview(action = "shape") {
  previewEl.value = buildCommand(action);
  dataPreviewEl.value = JSON.stringify(buildDataArray(action), null, 2);
}

async function sendCommand(action) {
  const command = buildCommand(action);
  previewEl.value = command;
  dataPreviewEl.value = JSON.stringify(buildDataArray(action), null, 2);
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

    setStatus(`Sent: ${action}`, "ok");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

function graphPoint(point) {
  const durationMs = getDuration();
  const x = GRAPH.left + (point.timeMs / durationMs) * GRAPH.width;
  const y = GRAPH.top + GRAPH.height - (point.intensity / 255) * GRAPH.height;
  return { x, y };
}

function drawGrid() {
  const lines = [];
  const durationMs = getDuration();

  for (let i = 0; i <= 4; i++) {
    const x = GRAPH.left + (GRAPH.width * i) / 4;
    const time = Math.round((durationMs * i) / 4);
    lines.push(`<line class="grid-line" x1="${x}" y1="${GRAPH.top}" x2="${x}" y2="${GRAPH.top + GRAPH.height}"></line>`);
    const anchor = i === 0 ? "start" : i === 4 ? "end" : "middle";
    lines.push(`<text class="grid-text" x="${x}" y="${GRAPH.top + GRAPH.height + 24}" text-anchor="${anchor}">${time} ms</text>`);
  }

  for (let i = 0; i <= 4; i++) {
    const y = GRAPH.top + (GRAPH.height * i) / 4;
    const value = Math.round(255 - (255 * i) / 4);
    lines.push(`<line class="grid-line" x1="${GRAPH.left}" y1="${y}" x2="${GRAPH.left + GRAPH.width}" y2="${y}"></line>`);
    lines.push(`<text class="grid-text" x="${GRAPH.left - 18}" y="${y + 5}" text-anchor="end">${value}</text>`);
  }

  gridLayerEl.innerHTML = lines.join("");
}

function renderGraph() {
  drawGrid();

  const graphPoints = shapePoints.map(graphPoint);
  const linePoints = graphPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const baseY = GRAPH.top + GRAPH.height;
  const fillPoints = [
    `${GRAPH.left},${baseY}`,
    ...graphPoints.map((point) => `${point.x},${point.y}`),
    `${GRAPH.left + GRAPH.width},${baseY}`,
  ].join(" ");

  envelopeLineEl.setAttribute("points", linePoints);
  envelopeFillEl.setAttribute("d", `M ${fillPoints.replaceAll(" ", " L ")} Z`);

  const valueMarkup = graphPoints
    .map((point, index) => {
      const fixedClass = index === 0 || index === graphPoints.length - 1 ? " fixed" : "";
      return `<circle class="shape-point${fixedClass}" data-point-id="${shapePoints[index].id}" cx="${point.x}" cy="${point.y}" r="8"><title>Drag vertically to change intensity</title></circle>`;
    })
    .join("");
  const bottom = GRAPH.top + GRAPH.height;
  const timeMarkup = graphPoints
    .map((point, index) => ({ point, index }))
    .filter(({ index }) => index > 0 && index < shapePoints.length - 1)
    .map(({ point, index }) => `
      <line class="time-guide" x1="${point.x}" y1="${GRAPH.top}" x2="${point.x}" y2="${bottom}"></line>
      <rect class="time-handle" data-point-id="${shapePoints[index].id}" x="${point.x - 9}" y="${bottom - 12}" width="18" height="12" rx="3"><title>Drag horizontally to change this point time</title></rect>
      <text class="time-point-label" x="${point.x}" y="${bottom - 3}" text-anchor="middle">${index + 1}</text>
    `)
    .join("");
  pointLayerEl.innerHTML = valueMarkup + timeMarkup;
}

function renderPointRows() {
  pointsListEl.innerHTML = shapePoints
    .map((point, index) => {
      const isEndpoint = index === 0 || index === shapePoints.length - 1;
      const timeBounds = getPointTimeBounds(index);
      const removeButton = isEndpoint
        ? `<button type="button" disabled>Keep</button>`
        : `<button type="button" data-remove-point="${point.id}">Remove</button>`;

      return `
        <div class="point-row" data-point-id="${point.id}">
          <label>
            time
            <input type="number" min="${timeBounds.min}" max="${timeBounds.max}" step="10" value="${point.timeMs}" data-point-id="${point.id}" data-point-time ${isEndpoint ? "readonly" : ""}>
          </label>
          <label>
            intensity
            <input type="number" min="0" max="255" value="${point.intensity}" data-point-id="${point.id}" data-point-intensity ${isEndpoint ? "readonly" : ""}>
          </label>
          ${removeButton}
        </div>
      `;
    })
    .join("");
}

function renderDesigner() {
  renderGraph();
  renderPointRows();
  updatePreview("shape");
}

function getPointIndex(pointId) {
  return shapePoints.findIndex((point) => point.id === pointId);
}

function getPointTimeBounds(index) {
  if (index === 0) return { min: 0, max: 0 };
  if (index === shapePoints.length - 1) {
    const durationMs = getDuration();
    return { min: durationMs, max: durationMs };
  }
  return {
    min: shapePoints[index - 1].timeMs + 1,
    max: shapePoints[index + 1].timeMs - 1,
  };
}

function addPoint() {
  normalizeShapePoints();

  if (shapePoints.length >= MAX_POINTS) {
    setStatus("Max 24 points", "error");
    return;
  }

  const durationMs = getDuration();
  let timeMs = Math.round(durationMs / 2);
  while (shapePoints.some((point) => point.timeMs === timeMs) && timeMs < durationMs - 20) {
    timeMs += 20;
  }

  shapePoints.push(createPoint(timeMs, 128));
  normalizeShapePoints();
  renderDesigner();
}

function removePoint(pointId) {
  const index = getPointIndex(pointId);
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

  inputs.shapeDuration.value = preset.durationMs;
  shapePoints = preset.points.map((point) => createPoint(point.timeMs, point.intensity));
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

function updateIntensityFromGraph(pointId, event) {
  const index = getPointIndex(pointId);
  if (index <= 0 || index >= shapePoints.length - 1) {
    return;
  }

  const coords = graphCoordinatesFromEvent(event);
  const intensity = Math.round(((GRAPH.top + GRAPH.height - coords.y) / GRAPH.height) * 255);

  shapePoints[index] = {
    ...shapePoints[index],
    intensity: clamp(intensity, 0, 255),
  };

  renderGraph();
  renderPointRows();
  updatePreview("shape");
}

function updateTimeFromGraph(pointId, event) {
  const index = getPointIndex(pointId);
  if (index <= 0 || index >= shapePoints.length - 1) return;
  const coords = graphCoordinatesFromEvent(event);
  const timeMs = Math.round(((coords.x - GRAPH.left) / GRAPH.width) * getDuration());
  const bounds = getPointTimeBounds(index);
  shapePoints[index] = { ...shapePoints[index], timeMs: clamp(timeMs, bounds.min, bounds.max) };
  renderDesigner();
}

function updateIntensityFromTable(pointId, value) {
  const index = getPointIndex(pointId);
  if (index <= 0 || index >= shapePoints.length - 1) return;
  shapePoints[index].intensity = clamp(Math.round(Number(value) || 0), 0, 255);
  renderGraph();
  updatePreview("shape");
}

function commitTimeFromTable(pointId, value) {
  const index = getPointIndex(pointId);
  if (index <= 0 || index >= shapePoints.length - 1) return;
  const timeText = String(value).trim();
  if (!/^\d+$/.test(timeText)) {
    setStatus("Point time must be a number", "error");
    renderPointRows();
    return;
  }
  const bounds = getPointTimeBounds(index);
  shapePoints[index].timeMs = clamp(Math.round(Number(timeText)), bounds.min, bounds.max);
  renderDesigner();
}

function commandButtonFromEvent(event) {
  if (!(event.target instanceof Element)) {
    return null;
  }

  const button = event.target.closest("button[data-command]");
  if (!button || button.disabled) {
    return null;
  }

  return button;
}

function sendCommandFromButton(button) {
  updatePreview(button.dataset.command);
  sendCommand(button.dataset.command);
}

document.addEventListener("mouseover", (event) => {
  const button = commandButtonFromEvent(event);
  if (!button) {
    return;
  }

  updatePreview(button.dataset.command);
});

document.addEventListener("focusin", (event) => {
  const button = commandButtonFromEvent(event);
  if (!button) {
    return;
  }

  updatePreview(button.dataset.command);
});

document.addEventListener("pointerup", (event) => {
  const button = commandButtonFromEvent(event);
  if (!button) {
    return;
  }

  event.preventDefault();
  lastPointerCommandButton = button;
  lastPointerCommandAt = Date.now();
  sendCommandFromButton(button);
});

document.addEventListener("click", (event) => {
  const button = commandButtonFromEvent(event);
  if (!button) {
    return;
  }

  event.preventDefault();
  if (button === lastPointerCommandButton && Date.now() - lastPointerCommandAt < 800) {
    return;
  }

  sendCommandFromButton(button);
});

document.querySelectorAll("button[data-preset]").forEach((button) => {
  button.addEventListener("click", () => applyPreset(button.dataset.preset));
});

document.querySelector("#addPoint").addEventListener("click", addPoint);

pointsListEl.addEventListener("input", (event) => {
  const pointId = event.target.dataset.pointId;
  if (pointId && event.target.dataset.pointTime === undefined && event.target.dataset.pointIntensity !== undefined) {
    updateIntensityFromTable(pointId, event.target.value);
  }
});

pointsListEl.addEventListener("change", (event) => {
  const pointId = event.target.dataset.pointId;
  if (!pointId) return;
  if (event.target.dataset.pointTime !== undefined) {
    commitTimeFromTable(pointId, event.target.value);
  } else if (event.target.dataset.pointIntensity !== undefined) {
    renderDesigner();
  }
});

pointsListEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target.dataset.pointTime !== undefined) event.target.blur();
});

pointsListEl.addEventListener("click", (event) => {
  const pointId = event.target.dataset.removePoint;
  if (pointId !== undefined) {
    removePoint(pointId);
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
    ? { kind: "intensity", pointId: target.dataset.pointId }
    : { kind: "time", pointId: target.dataset.pointId };
  graphEl.setPointerCapture(event.pointerId);
});

graphEl.addEventListener("pointermove", (event) => {
  if (activePoint === null) {
    return;
  }

  if (activePoint.kind === "time") {
    updateTimeFromGraph(activePoint.pointId, event);
  } else {
    updateIntensityFromGraph(activePoint.pointId, event);
  }
});

graphEl.addEventListener("pointerup", (event) => {
  activePoint = null;
  graphEl.releasePointerCapture(event.pointerId);
});

graphEl.addEventListener("pointercancel", () => {
  activePoint = null;
});

Object.values(inputs).forEach((input) => {
  input.addEventListener("input", () => {
    if (input === inputs.shapeDuration) {
      return;
    }

    updatePreview("shape");
  });
  input.addEventListener("change", () => {
    if (input === inputs.shapeDuration) {
      normalizeShapePoints();
      renderDesigner();
      return;
    }

    updatePreview("shape");
  });
});

renderDesigner();
