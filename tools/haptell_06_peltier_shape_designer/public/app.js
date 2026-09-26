const MAX_DURATION_MS = 60000;
const MIN_DURATION_MS = 500;
const TIME_STEP_MS = 500;
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
const addAfterPointEl = document.querySelector("#addAfterPoint");
const addPointButtonEl = document.querySelector("#addPoint");

const inputs = {
  ipAddress: document.querySelector("#ipAddress"),
  port: document.querySelector("#port"),
  target: document.querySelector("#target"),
  shapeDuration: document.querySelector("#shapeDuration"),
};

const presets = {
  softStart: { durationMs: 50000, points: [
    { timeMs: 0, intensity: 0 }, { timeMs: 10000, intensity: 96 },
    { timeMs: 20000, intensity: 96 }, { timeMs: 30000, intensity: 192 },
    { timeMs: 45000, intensity: 192 }, { timeMs: 50000, intensity: 0 },
  ] },
  longPulse: { durationMs: 45000, points: [
    { timeMs: 0, intensity: 0 }, { timeMs: 5000, intensity: 192 },
    { timeMs: 40000, intensity: 192 }, { timeMs: 45000, intensity: 0 },
  ] },
  steps: { durationMs: 60000, points: [
    { timeMs: 0, intensity: 0 }, { timeMs: 5000, intensity: 64 },
    { timeMs: 15000, intensity: 64 }, { timeMs: 20000, intensity: 144 },
    { timeMs: 35000, intensity: 144 }, { timeMs: 40000, intensity: 224 },
    { timeMs: 55000, intensity: 224 }, { timeMs: 60000, intensity: 0 },
  ] },
  off: { durationMs: 10000, points: [
    { timeMs: 0, intensity: 0 }, { timeMs: 10000, intensity: 0 },
  ] },
};

// Open with zero output; presets and edits never send automatically.
let shapePoints = presets.off.points.map((point) => ({ ...point }));

let activePointIndex = null;
let busyTimer = null;
let graphZoomLevel = 1;
let graphViewStartRatio = 0;
let currentDurationMs = 10000;
let addAfterIndex = 0;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function snapTimeMs(value) {
  return Math.round(value / TIME_STEP_MS) * TIME_STEP_MS;
}

function formatSeconds(timeMs) {
  return String(timeMs / 1000);
}

function getTarget() {
  return inputs.target.value.trim() || "haptell-06-peltier-shape";
}

function getDuration() {
  return currentDurationMs;
}

function sanitizeDurationInput() {
  const cleaned = inputs.shapeDuration.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
  if (inputs.shapeDuration.value !== cleaned) {
    inputs.shapeDuration.value = cleaned;
  }
}

function getDurationInputValue() {
  sanitizeDurationInput();
  const rawSeconds = Number(inputs.shapeDuration.value);
  if (!Number.isFinite(rawSeconds) || rawSeconds <= 0) {
    return currentDurationMs;
  }

  return clamp(snapTimeMs(rawSeconds * 1000), MIN_DURATION_MS, MAX_DURATION_MS);
}

function setShapeDuration(nextDurationMs, scalePoints) {
  nextDurationMs = clamp(snapTimeMs(Number(nextDurationMs) || currentDurationMs), MIN_DURATION_MS, MAX_DURATION_MS);
  const previousDurationMs = currentDurationMs;

  if (scalePoints && previousDurationMs > 0 && nextDurationMs !== previousDurationMs) {
    const ratio = nextDurationMs / previousDurationMs;
    shapePoints = shapePoints.map((point, index) => {
      const isFirst = index === 0;
      const isLast = index === shapePoints.length - 1;
      return {
        timeMs: isFirst ? 0 : isLast ? nextDurationMs : clamp(snapTimeMs(point.timeMs * ratio), 0, nextDurationMs),
        intensity: point.intensity,
      };
    });
  }

  currentDurationMs = nextDurationMs;
  inputs.shapeDuration.value = formatSeconds(currentDurationMs);
}

function commitDurationInput() {
  setShapeDuration(getDurationInputValue(), true);
  renderDesigner();
}

function normalizeShapePoints() {
  const durationMs = getDuration();
  inputs.shapeDuration.value = formatSeconds(durationMs);

  shapePoints = shapePoints
    .map((point) => ({
      timeMs: clamp(snapTimeMs(Number(point.timeMs) || 0), 0, durationMs),
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
    schema: "haptell-peltier-shape-pattern/v1",
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
    ["limits", [["durationMs", "500..60000, step 500"], ["points", "2..30"], ["intensity", "0..255"]]],
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

let requestPending = false;
let lastDestination = null;
let commandQueue = Promise.resolve();
let operationId = 0;

function unlockDestination() {
  Object.values(inputs).forEach((input) => input.disabled = false);
}

function clearPlaybackEstimate() {
  clearInterval(busyTimer);
  busyTimer = null;
  busyPanelEl.classList.add("hidden");
}

function showPlaybackEstimate(durationMs) {
  clearPlaybackEstimate();
  const endsAt = Date.now() + durationMs;
  busyPanelEl.classList.remove("hidden");
  function update() {
    const seconds = Math.max(0, (endsAt - Date.now()) / 1000).toFixed(1);
    busyTextEl.textContent = seconds + " s remaining if received. UDP delivery is unconfirmed; Stop can interrupt playback.";
    if (Date.now() >= endsAt) {
      clearPlaybackEstimate();
      unlockDestination();
    }
  }
  update();
  busyTimer = setInterval(update, 100);
}

function sendCommand(command, destination) {
  // Preserve HTTP dispatch order when Stop is clicked during a pending send.
  const queued = commandQueue.then(() => postCommand(command, destination));
  commandQueue = queued.catch(() => {});
  return queued;
}

async function postCommand(command, destination) {
  const response = await fetch("/api/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...destination, command }),
    signal: AbortSignal.timeout(5000),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || "Failed to send command.");
  return result;
}

function currentDestination() {
  return { ipAddress: inputs.ipAddress.value.trim(), port: inputs.port.value };
}

async function sendShape() {
  if (requestPending) return;
  commitDurationInput();
  const command = buildCommand();
  const durationMs = getDuration();
  const destination = currentDestination();
  const operation = ++operationId;
  requestPending = true;
  document.querySelector("#sendShape").disabled = true;
  // Keep destination controls stable until Stop or the estimate completes.
  Object.values(inputs).filter((input) => input !== inputs.shapeDuration).forEach((input) => input.disabled = true);
  lastDestination = destination;
  setStatus("Sending...", "");
  try {
    await sendCommand(command, destination);
    if (operation === operationId) {
      setStatus("Shape sent · unconfirmed", "ok");
      showPlaybackEstimate(durationMs);
    }
  } catch (error) {
    if (operation === operationId) {
      setStatus(error.message, "error");
      unlockDestination();
    }
  } finally {
    if (operation === operationId) {
      requestPending = false;
      document.querySelector("#sendShape").disabled = false;
    }
  }
}

async function stopShape() {
  // Stop remains available during playback and sends to the last attempted device.
  const operation = ++operationId;
  requestPending = true;
  document.querySelector("#sendShape").disabled = true;
  document.querySelector("#stopShape").disabled = true;
  setStatus("Sending Stop...", "");
  try {
    await sendCommand(getTarget() + " stop", lastDestination || currentDestination());
    clearPlaybackEstimate();
    unlockDestination();
    lastDestination = null;
    setStatus("Stop sent · unconfirmed", "ok");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    if (operation === operationId) {
      requestPending = false;
      document.querySelector("#sendShape").disabled = false;
      document.querySelector("#stopShape").disabled = false;
    }
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
  zoomRangeEl.textContent = `${(range.startMs / 1000).toFixed(1)}–${(range.endMs / 1000).toFixed(1)} s`;
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

  lines.push(`<text class="axis-label" x="${GRAPH.left}" y="22" text-anchor="start">PWM level (0–255)</text>`);

  for (let i = 0; i <= 6; i++) {
    const x = GRAPH.left + (GRAPH.width * i) / 6;
    const time = range.startMs + (range.windowDurationMs * i) / 6;
    const anchor = i === 0 ? "start" : i === 6 ? "end" : "middle";
    lines.push(`<line class="grid-line" x1="${x}" y1="${GRAPH.top}" x2="${x}" y2="${bottom}"></line>`);
    lines.push(`<text class="grid-text" x="${x}" y="${bottom + 28}" text-anchor="${anchor}">${(time / 1000).toFixed(1)} s</text>`);
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
  renderAddAfterOptions();

  const rows = shapePoints
    .map((point, index) => {
      const isFirst = index === 0;
      const isLast = index === shapePoints.length - 1;
      const actionCell = isFirst || isLast
        ? `<div class="point-action" aria-hidden="true"></div>`
        : `<button type="button" data-remove-point="${index}">Remove</button>`;

      return `
        <div class="point-row">
          <div class="point-number">${index + 1}</div>
          <input aria-label="Point ${index + 1} time in seconds" type="number" min="0" max="${getDuration() / 1000}" step="0.5" value="${formatSeconds(point.timeMs)}" data-point-time="${index}" ${isFirst || isLast ? "readonly" : ""}>
          <input aria-label="Point ${index + 1} PWM level" type="number" min="0" max="255" value="${point.intensity}" data-point-intensity="${index}" ${isLast ? "readonly" : ""}>
          ${actionCell}
        </div>
      `;
    })
    .join("");

  pointsListEl.innerHTML = `
    <div class="point-row point-row-head">
      <div>#</div>
      <div>time (s)</div>
      <div>PWM</div>
      <div></div>
    </div>
    ${rows}
  `;
}

function getMaxAddAfterIndex() {
  return Math.max(0, shapePoints.length - 2);
}

function getAddAfterIndex() {
  const selectedIndex = Number(addAfterPointEl.value);
  if (Number.isFinite(selectedIndex)) {
    addAfterIndex = selectedIndex;
  }

  addAfterIndex = clamp(Math.round(addAfterIndex), 0, getMaxAddAfterIndex());
  return addAfterIndex;
}

function renderAddAfterOptions() {
  const maxAddAfterIndex = getMaxAddAfterIndex();
  addAfterIndex = clamp(Math.round(addAfterIndex), 0, maxAddAfterIndex);

  addAfterPointEl.innerHTML = shapePoints
    .slice(0, -1)
    .map((point, index) => {
      return `<option value="${index}">#${index + 1} (${formatSeconds(point.timeMs)} s)</option>`;
    })
    .join("");

  addAfterPointEl.value = String(addAfterIndex);
  addAfterPointEl.disabled = shapePoints.length >= MAX_POINTS;
  addPointButtonEl.disabled = shapePoints.length >= MAX_POINTS;
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

  const afterIndex = getAddAfterIndex();
  const previousPoint = shapePoints[afterIndex];
  const nextPoint = shapePoints[afterIndex + 1];

  if (!nextPoint || nextPoint.timeMs - previousPoint.timeMs < TIME_STEP_MS * 2) {
    setStatus(`No time gap after point ${afterIndex + 1}`, "error");
    return;
  }

  const timeMs = clamp(
    snapTimeMs(previousPoint.timeMs + (nextPoint.timeMs - previousPoint.timeMs) / 2),
    previousPoint.timeMs + TIME_STEP_MS,
    nextPoint.timeMs - TIME_STEP_MS,
  );
  const intensity = Math.round((previousPoint.intensity + nextPoint.intensity) / 2);
  shapePoints.splice(afterIndex + 1, 0, { timeMs, intensity });
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
  shapePoints = preset.points.map((point) => ({ ...point }));
  renderDesigner();
}

function graphCoordinatesFromEvent(event) {
  const position = new DOMPoint(event.clientX, event.clientY).matrixTransform(graphEl.getScreenCTM().inverse());
  const { x, y } = position;
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
  const minTime = isFirst ? 0 : shapePoints[index - 1].timeMs + TIME_STEP_MS;
  const maxTime = isFirst ? 0 : shapePoints[index + 1].timeMs - TIME_STEP_MS;
  const timeMs = snapTimeMs(range.startMs + ((coords.x - GRAPH.left) / GRAPH.width) * range.windowDurationMs);
  const intensity = Math.round(((GRAPH.top + GRAPH.height - coords.y) / GRAPH.height) * 255);

  shapePoints[index] = {
    timeMs: clamp(timeMs, minTime, maxTime),
    intensity: clamp(intensity, 0, 255),
  };

  renderDesigner();
}

function defaultJsonFileName(pattern) {
  return `haptell-peltier-shape-${pattern.durationMs}ms.json`;
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

  if (pattern.schema !== "haptell-peltier-shape-pattern/v1") {
    throw new Error("Expected a Peltier shape pattern (v1).");
  }
  const durationMs = pattern.durationMs;
  if (!Number.isInteger(durationMs) || durationMs < MIN_DURATION_MS || durationMs > MAX_DURATION_MS || durationMs % TIME_STEP_MS !== 0) {
    throw new Error("Duration must be 500-60000 ms in 500 ms steps.");
  }
  if (!Array.isArray(pattern.points) || pattern.points.length < 2 || pattern.points.length > MAX_POINTS) {
    throw new Error("Pattern must contain 2-30 points.");
  }

  const points = pattern.points.map((point) => ({
    timeMs: point?.timeMs,
    intensity: point?.intensity,
  }));

  for (const point of points) {
    if (!Number.isInteger(point.timeMs) || !Number.isInteger(point.intensity)) {
      throw new Error("Every point must have numeric timeMs and intensity.");
    }
    if (point.timeMs < 0 || point.timeMs > durationMs || point.timeMs % TIME_STEP_MS !== 0 || point.intensity < 0 || point.intensity > 255) {
      throw new Error("Point values are outside the allowed range.");
    }
  }

  for (let i = 1; i < points.length; i++) {
    if (points[i].timeMs <= points[i - 1].timeMs) {
      throw new Error("Point times must be strictly increasing.");
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
    setShapeDuration(loaded.durationMs, false);
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

document.querySelector("#stopShape").addEventListener("click", stopShape);

document.querySelector("#sendShape").addEventListener("click", sendShape);
document.querySelector("#saveJson").addEventListener("click", saveJson);
document.querySelector("#loadJsonButton").addEventListener("click", openJsonFilePicker);
document.querySelector("#loadJson").addEventListener("change", loadJsonInputFile);

document.querySelectorAll("button[data-preset]").forEach((button) => {
  button.addEventListener("click", () => applyPreset(button.dataset.preset));
});

addAfterPointEl.addEventListener("change", () => {
  addAfterIndex = Number(addAfterPointEl.value);
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

pointsListEl.addEventListener("change", (event) => {
  const timeIndex = event.target.dataset.pointTime;
  const intensityIndex = event.target.dataset.pointIntensity;
  if (timeIndex !== undefined) {
    const index = Number(timeIndex);
    if (index > 0 && index < shapePoints.length - 1) {
      shapePoints[index].timeMs = clamp(snapTimeMs((Number(event.target.value) || 0) * 1000),
        shapePoints[index - 1].timeMs + TIME_STEP_MS, shapePoints[index + 1].timeMs - TIME_STEP_MS);
    }
  }
  if (intensityIndex !== undefined) {
    shapePoints[Number(intensityIndex)].intensity = Number(event.target.value);
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
