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

let shapePoints = [
  { timeMs: 0, intensity: 0 },
  { timeMs: 100, intensity: 180 },
  { timeMs: 700, intensity: 180 },
  { timeMs: 1200, intensity: 60 },
  { timeMs: 1600, intensity: 0 },
];
let activePointIndex = null;

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
    .map((point) => ({
      timeMs: clamp(Math.round(Number(point.timeMs) || 0), 0, durationMs),
      intensity: clamp(Math.round(Number(point.intensity) || 0), 0, 255),
    }))
    .sort((a, b) => a.timeMs - b.timeMs);

  shapePoints = shapePoints.filter((point, index, points) => {
    return index === 0 || point.timeMs !== points[index - 1].timeMs;
  });

  if (shapePoints.length === 0 || shapePoints[0].timeMs !== 0) {
    shapePoints.unshift({ timeMs: 0, intensity: 0 });
  }

  if (shapePoints[shapePoints.length - 1].timeMs !== durationMs) {
    shapePoints.push({ timeMs: durationMs, intensity: 0 });
  }

  shapePoints[0] = { timeMs: 0, intensity: 0 };
  shapePoints[shapePoints.length - 1] = { timeMs: durationMs, intensity: 0 };

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
    normalizeShapePoints();
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

  normalizeShapePoints();

  return [
    ["target", getTarget()],
    ["command", "shape"],
    ["durationMs", getDuration()],
    ["mode", "rtp-envelope"],
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
  normalizeShapePoints();
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

  pointLayerEl.innerHTML = graphPoints
    .map((point, index) => {
      const fixedClass = index === 0 || index === graphPoints.length - 1 ? " fixed" : "";
      return `<circle class="shape-point${fixedClass}" data-index="${index}" cx="${point.x}" cy="${point.y}" r="8"></circle>`;
    })
    .join("");
}

function renderPointRows() {
  normalizeShapePoints();

  pointsListEl.innerHTML = shapePoints
    .map((point, index) => {
      const isEndpoint = index === 0 || index === shapePoints.length - 1;
      const removeButton = isEndpoint
        ? `<button type="button" disabled>Keep</button>`
        : `<button type="button" data-remove-point="${index}">Remove</button>`;

      return `
        <div class="point-row">
          <label>
            time
            <input type="number" min="0" max="${getDuration()}" step="10" value="${point.timeMs}" data-point-time="${index}" ${isEndpoint ? "readonly" : ""}>
          </label>
          <label>
            intensity
            <input type="number" min="0" max="255" value="${point.intensity}" data-point-intensity="${index}" ${isEndpoint ? "readonly" : ""}>
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

  shapePoints.push({ timeMs, intensity: 128 });
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

  inputs.shapeDuration.value = preset.durationMs;
  shapePoints = preset.points.map((point) => ({ ...point }));
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

function updatePointFromGraph(index, event) {
  if (index <= 0 || index >= shapePoints.length - 1) {
    return;
  }

  const coords = graphCoordinatesFromEvent(event);
  const durationMs = getDuration();
  const minTime = shapePoints[index - 1].timeMs + 10;
  const maxTime = shapePoints[index + 1].timeMs - 10;
  const timeMs = Math.round(((coords.x - GRAPH.left) / GRAPH.width) * durationMs);
  const intensity = Math.round(((GRAPH.top + GRAPH.height - coords.y) / GRAPH.height) * 255);

  shapePoints[index] = {
    timeMs: clamp(timeMs, minTime, maxTime),
    intensity: clamp(intensity, 0, 255),
  };

  renderDesigner();
}

document.querySelectorAll("button[data-command]").forEach((button) => {
  button.addEventListener("mouseenter", () => updatePreview(button.dataset.command));
  button.addEventListener("focus", () => updatePreview(button.dataset.command));
  button.addEventListener("click", () => sendCommand(button.dataset.command));
});

document.querySelectorAll("button[data-preset]").forEach((button) => {
  button.addEventListener("click", () => applyPreset(button.dataset.preset));
});

document.querySelector("#sendShape").addEventListener("click", () => sendCommand("shape"));
document.querySelector("#addPoint").addEventListener("click", addPoint);

pointsListEl.addEventListener("input", (event) => {
  const timeIndex = event.target.dataset.pointTime;
  const intensityIndex = event.target.dataset.pointIntensity;

  if (timeIndex !== undefined) {
    shapePoints[Number(timeIndex)].timeMs = Number(event.target.value);
  }

  if (intensityIndex !== undefined) {
    shapePoints[Number(intensityIndex)].intensity = Number(event.target.value);
  }

  renderGraph();
  updatePreview("shape");
});

pointsListEl.addEventListener("change", () => {
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

  activePointIndex = Number(target.dataset.index);
  graphEl.setPointerCapture(event.pointerId);
});

graphEl.addEventListener("pointermove", (event) => {
  if (activePointIndex === null) {
    return;
  }

  updatePointFromGraph(activePointIndex, event);
});

graphEl.addEventListener("pointerup", (event) => {
  activePointIndex = null;
  graphEl.releasePointerCapture(event.pointerId);
});

Object.values(inputs).forEach((input) => {
  input.addEventListener("input", () => {
    if (input === inputs.shapeDuration) {
      renderDesigner();
      return;
    }

    updatePreview("shape");
  });
  input.addEventListener("change", () => {
    if (input === inputs.shapeDuration) {
      renderDesigner();
      return;
    }

    updatePreview("shape");
  });
});

renderDesigner();
