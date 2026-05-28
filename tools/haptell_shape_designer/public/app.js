const MAX_DURATION_MS = 15000;
const MIN_DURATION_MS = 100;
const MAX_POINTS = 30;
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
const envelopeLineEl = document.querySelector("#envelopeLine");
const envelopeFillEl = document.querySelector("#envelopeFill");
const pointsListEl = document.querySelector("#pointsList");
const zoomDisplayEl = document.querySelector("#zoomDisplay");
const zoomRangeEl = document.querySelector("#zoomRange");
const zoomPanEl = document.querySelector("#zoomPan");

const inputs = {
  ipAddress: document.querySelector("#ipAddress"),
  port: document.querySelector("#port"),
  target: document.querySelector("#target"),
  shapeDuration: document.querySelector("#shapeDuration"),
};

const presets = {
  softStart: {
    durationMs: 3000,
    points: [
      { timeMs: 0, intensity: 30 },
      { timeMs: 600, intensity: 170 },
      { timeMs: 2200, intensity: 120 },
      { timeMs: 3000, intensity: 0 },
    ],
  },
  longPulse: {
    durationMs: 9000,
    points: [
      { timeMs: 0, intensity: 0 },
      { timeMs: 700, intensity: 180 },
      { timeMs: 6500, intensity: 180 },
      { timeMs: 8000, intensity: 90 },
      { timeMs: 9000, intensity: 0 },
    ],
  },
  steps: {
    durationMs: 6000,
    points: [
      { timeMs: 0, intensity: 60 },
      { timeMs: 900, intensity: 60 },
      { timeMs: 1200, intensity: 130 },
      { timeMs: 2400, intensity: 130 },
      { timeMs: 2800, intensity: 210 },
      { timeMs: 4800, intensity: 210 },
      { timeMs: 6000, intensity: 0 },
    ],
  },
  heartbeat: {
    durationMs: 1800,
    points: [
      { timeMs: 0, intensity: 0 },
      { timeMs: 45, intensity: 230 },
      { timeMs: 150, intensity: 20 },
      { timeMs: 300, intensity: 180 },
      { timeMs: 460, intensity: 0 },
      { timeMs: 1800, intensity: 0 },
    ],
  },
};

let shapePoints = [
  { timeMs: 0, intensity: 60 },
  { timeMs: 400, intensity: 180 },
  { timeMs: 2200, intensity: 120 },
  { timeMs: 3000, intensity: 0 },
];

let activePointIndex = null;
let busyTimer = null;
let graphZoomLevel = 1;
let graphViewStartRatio = 0;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getTarget() {
  return inputs.target.value.trim() || "haptell-01-dc-shape";
}

function getDuration() {
  return clamp(Number(inputs.shapeDuration.value) || 3000, MIN_DURATION_MS, MAX_DURATION_MS);
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
    const firstIntensity = shapePoints[0]?.intensity ?? 0;
    shapePoints.unshift({ timeMs: 0, intensity: firstIntensity });
  }

  if (shapePoints[shapePoints.length - 1].timeMs !== durationMs) {
    shapePoints.push({ timeMs: durationMs, intensity: 0 });
  }

  shapePoints[0] = { ...shapePoints[0], timeMs: 0 };
  shapePoints[shapePoints.length - 1] = { timeMs: durationMs, intensity: 0 };

  if (shapePoints.length > MAX_POINTS) {
    const first = shapePoints[0];
    const last = shapePoints[shapePoints.length - 1];
    shapePoints = [first, ...shapePoints.slice(1, MAX_POINTS - 1), last];
  }
}

function buildCommand() {
  normalizeShapePoints();
  const durationMs = getDuration();
  const pointText = shapePoints.map((point) => `${point.timeMs}:${point.intensity}`).join(",");
  return `${getTarget()} shape duration=${durationMs} points=${pointText}`;
}

function buildPatternJson() {
  normalizeShapePoints();
  return {
    schema: "haptell-shape-pattern/v1",
    durationMs: getDuration(),
    points: shapePoints.map((point) => ({
      timeMs: point.timeMs,
      intensity: point.intensity,
    })),
  };
}

function buildDataArray() {
  normalizeShapePoints();
  return [
    ["command", "shape"],
    ["target", getTarget()],
    ["durationMs", getDuration()],
    ["limits", [["durationMs", "100..15000"], ["points", "2..30"], ["intensity", "0..255"]]],
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

function getIntensityAtTime(timeMs) {
  if (timeMs <= shapePoints[0].timeMs) {
    return shapePoints[0].intensity;
  }

  for (let i = 1; i < shapePoints.length; i++) {
    const previous = shapePoints[i - 1];
    const next = shapePoints[i];

    if (timeMs <= next.timeMs) {
      const durationMs = next.timeMs - previous.timeMs;
      if (durationMs === 0) {
        return next.intensity;
      }

      const elapsedMs = timeMs - previous.timeMs;
      return previous.intensity + ((next.intensity - previous.intensity) * elapsedMs) / durationMs;
    }
  }

  return shapePoints[shapePoints.length - 1].intensity;
}

function graphPoint(point) {
  const range = getVisibleTimeRange();
  const x = GRAPH.left + ((point.timeMs - range.startMs) / range.windowDurationMs) * GRAPH.width;
  const y = GRAPH.top + GRAPH.height - (point.intensity / 255) * GRAPH.height;
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
  normalizeShapePoints();
  clampZoomView();
  updateZoomControls();
  drawGrid();

  const range = getVisibleTimeRange();
  const visibleEnvelopePoints = [
    { timeMs: range.startMs, intensity: getIntensityAtTime(range.startMs) },
    ...shapePoints.filter((point) => point.timeMs > range.startMs && point.timeMs < range.endMs),
    { timeMs: range.endMs, intensity: getIntensityAtTime(range.endMs) },
  ];
  const graphPoints = visibleEnvelopePoints.map(graphPoint);
  const linePoints = graphPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const baseY = GRAPH.top + GRAPH.height;
  const fillPath = [
    `M ${GRAPH.left},${baseY}`,
    ...graphPoints.map((point) => `L ${point.x},${point.y}`),
    `L ${GRAPH.left + GRAPH.width},${baseY}`,
    "Z",
  ].join(" ");

  envelopeLineEl.setAttribute("points", linePoints);
  envelopeFillEl.setAttribute("d", fillPath);

  pointLayerEl.innerHTML = shapePoints
    .map((shapePoint, index) => ({ shapePoint, index }))
    .filter(({ shapePoint }) => shapePoint.timeMs >= range.startMs && shapePoint.timeMs <= range.endMs)
    .map(({ shapePoint, index }) => {
      const point = graphPoint(shapePoint);
      const endClass = index === shapePoints.length - 1 ? " end" : "";
      const labelX = clamp(point.x, GRAPH.left + 16, GRAPH.left + GRAPH.width - 16);
      const labelY = point.y < GRAPH.top + 34 ? point.y + 26 : point.y - 14;
      return `
        <circle class="shape-point${endClass}" data-index="${index}" cx="${point.x}" cy="${point.y}" r="9"></circle>
        <text class="shape-point-label" x="${labelX}" y="${labelY}" text-anchor="middle">${index + 1}</text>
      `;
    })
    .join("");
}

function renderPointRows() {
  normalizeShapePoints();

  const rows = shapePoints
    .map((point, index) => {
      const isFirst = index === 0;
      const isLast = index === shapePoints.length - 1;
      const removeButton = isFirst || isLast
        ? `<button type="button" disabled>Keep</button>`
        : `<button type="button" data-remove-point="${index}">Remove</button>`;

      return `
        <div class="point-row">
          <div class="point-number">${index + 1}</div>
          <input aria-label="Point ${index + 1} time" type="number" min="0" max="${getDuration()}" step="10" value="${point.timeMs}" data-point-time="${index}" ${isFirst || isLast ? "readonly" : ""}>
          <input aria-label="Point ${index + 1} intensity" type="number" min="0" max="255" value="${point.intensity}" data-point-intensity="${index}" ${isLast ? "readonly" : ""}>
          ${removeButton}
        </div>
      `;
    })
    .join("");

  pointsListEl.innerHTML = `
    <div class="point-row point-row-head">
      <div>#</div>
      <div>time</div>
      <div>intensity</div>
      <div></div>
    </div>
    ${rows}
  `;
}

function renderDesigner() {
  renderGraph();
  renderPointRows();
  updatePreview();
}

function addPoint() {
  normalizeShapePoints();

  if (shapePoints.length >= MAX_POINTS) {
    setStatus("Max 30 points", "error");
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
  const isFirst = index === 0;
  const isLast = index === shapePoints.length - 1;
  if (isLast) {
    return;
  }

  const coords = graphCoordinatesFromEvent(event);
  const range = getVisibleTimeRange();
  const minTime = isFirst ? 0 : shapePoints[index - 1].timeMs + 10;
  const maxTime = isFirst ? 0 : shapePoints[index + 1].timeMs - 10;
  const timeMs = Math.round(range.startMs + ((coords.x - GRAPH.left) / GRAPH.width) * range.windowDurationMs);
  const intensity = Math.round(((GRAPH.top + GRAPH.height - coords.y) / GRAPH.height) * 255);

  shapePoints[index] = {
    timeMs: clamp(timeMs, minTime, maxTime),
    intensity: clamp(intensity, 0, 255),
  };

  renderDesigner();
}

function defaultJsonFileName(pattern) {
  return `haptell-shape-${pattern.durationMs}ms.json`;
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
  const pattern = buildPatternJson();
  const jsonText = JSON.stringify(pattern, null, 2);
  const fileName = defaultJsonFileName(pattern);

  if ("showSaveFilePicker" in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: "Haptell shape pattern JSON",
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

  const points = pattern.points.map((point) => ({
    timeMs: Math.round(Number(point.timeMs)),
    intensity: Math.round(Number(point.intensity)),
  }));

  for (const point of points) {
    if (!Number.isFinite(point.timeMs) || !Number.isFinite(point.intensity)) {
      throw new Error("Every point must have numeric timeMs and intensity.");
    }
    if (point.timeMs < 0 || point.timeMs > durationMs || point.intensity < 0 || point.intensity > 255) {
      throw new Error("Point values are outside the allowed range.");
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
  if (last.timeMs !== durationMs || last.intensity !== 0) {
    throw new Error("The last point must be at durationMs and have intensity 0.");
  }

  return { durationMs, points };
}

async function loadJsonFile(file) {
  try {
    const loaded = validateLoadedPattern(JSON.parse(await file.text()));
    inputs.shapeDuration.value = loaded.durationMs;
    shapePoints = loaded.points;
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
            description: "Haptell shape pattern JSON",
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

document.querySelector("#addPoint").addEventListener("click", addPoint);
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
  const timeIndex = event.target.dataset.pointTime;
  const intensityIndex = event.target.dataset.pointIntensity;

  if (timeIndex !== undefined) {
    shapePoints[Number(timeIndex)].timeMs = Number(event.target.value);
  }

  if (intensityIndex !== undefined) {
    shapePoints[Number(intensityIndex)].intensity = Number(event.target.value);
  }

  renderGraph();
  updatePreview();
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
      renderDesigner();
      return;
    }
    updatePreview();
  });
  input.addEventListener("change", () => {
    if (input === inputs.shapeDuration) {
      renderDesigner();
      return;
    }
    updatePreview();
  });
});

renderDesigner();
