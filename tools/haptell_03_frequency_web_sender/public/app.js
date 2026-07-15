const MAX_DURATION_MS = 5000;
const MIN_DURATION_MS = 100;
const MAX_POINTS = 32;
const MIN_FREQUENCY_HZ = 40;
const MAX_FREQUENCY_HZ = 1500;
const GRAPH = {
  left: 70,
  top: 30,
  width: 640,
  height: 248,
};

const statusEl = document.querySelector("#status");
const previewEl = document.querySelector("#commandPreview");
const dataPreviewEl = document.querySelector("#dataPreview");
const graphEl = document.querySelector("#patternGraph");
const gridLayerEl = document.querySelector("#gridLayer");
const pointLayerEl = document.querySelector("#pointLayer");
const amplitudeLineEl = document.querySelector("#amplitudeLine");
const amplitudeFillEl = document.querySelector("#amplitudeFill");
const frequencyLineEl = document.querySelector("#frequencyLine");
const pointsListEl = document.querySelector("#pointsList");

const inputs = {
  ipAddress: document.querySelector("#ipAddress"),
  port: document.querySelector("#port"),
  target: document.querySelector("#target"),
  toneAmplitude: document.querySelector("#toneAmplitude"),
  toneFrequency: document.querySelector("#toneFrequency"),
  toneDuration: document.querySelector("#toneDuration"),
  sweepAmplitude: document.querySelector("#sweepAmplitude"),
  sweepFrom: document.querySelector("#sweepFrom"),
  sweepTo: document.querySelector("#sweepTo"),
  sweepDuration: document.querySelector("#sweepDuration"),
  patternDuration: document.querySelector("#patternDuration"),
};

const presets = {
  resonance: {
    durationMs: 900,
    points: [
      { timeMs: 0, amplitude: 0, frequencyHz: 560 },
      { timeMs: 60, amplitude: 140, frequencyHz: 560 },
      { timeMs: 780, amplitude: 140, frequencyHz: 560 },
      { timeMs: 900, amplitude: 0, frequencyHz: 560 },
    ],
  },
  rising: {
    durationMs: 1200,
    points: [
      { timeMs: 0, amplitude: 0, frequencyHz: 180 },
      { timeMs: 80, amplitude: 130, frequencyHz: 180 },
      { timeMs: 1050, amplitude: 180, frequencyHz: 900 },
      { timeMs: 1200, amplitude: 0, frequencyHz: 900 },
    ],
  },
  chirpTap: {
    durationMs: 240,
    points: [
      { timeMs: 0, amplitude: 0, frequencyHz: 560 },
      { timeMs: 25, amplitude: 205, frequencyHz: 560 },
      { timeMs: 100, amplitude: 130, frequencyHz: 900 },
      { timeMs: 240, amplitude: 0, frequencyHz: 900 },
    ],
  },
  texture: {
    durationMs: 1600,
    points: [
      { timeMs: 0, amplitude: 0, frequencyHz: 420 },
      { timeMs: 100, amplitude: 120, frequencyHz: 420 },
      { timeMs: 320, amplitude: 165, frequencyHz: 760 },
      { timeMs: 560, amplitude: 110, frequencyHz: 520 },
      { timeMs: 880, amplitude: 180, frequencyHz: 980 },
      { timeMs: 1260, amplitude: 120, frequencyHz: 640 },
      { timeMs: 1600, amplitude: 0, frequencyHz: 560 },
    ],
  },
  pulse: {
    durationMs: 1400,
    points: [
      { timeMs: 0, amplitude: 0, frequencyHz: 480 },
      { timeMs: 250, amplitude: 130, frequencyHz: 560 },
      { timeMs: 850, amplitude: 150, frequencyHz: 620 },
      { timeMs: 1400, amplitude: 0, frequencyHz: 560 },
    ],
  },
};

let nextPointId = 1;

function createPoint(timeMs, amplitude, frequencyHz, id) {
  return {
    id: id || `point-${nextPointId++}`,
    timeMs,
    amplitude: clamp(Math.round(Number(amplitude) || 0), 0, 255),
    frequencyHz: clamp(Math.round(Number(frequencyHz) || 560), MIN_FREQUENCY_HZ, MAX_FREQUENCY_HZ),
  };
}

let patternPoints = [
  { timeMs: 0, amplitude: 0, frequencyHz: 560 },
  { timeMs: 80, amplitude: 150, frequencyHz: 560 },
  { timeMs: 900, amplitude: 150, frequencyHz: 760 },
  { timeMs: 1200, amplitude: 0, frequencyHz: 560 },
].map((point) => createPoint(point.timeMs, point.amplitude, point.frequencyHz));
let activeDrag = null;

function getTarget() {
  return inputs.target.value.trim() || "haptell-03";
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getDuration() {
  return clamp(Number(inputs.patternDuration.value) || 1200, MIN_DURATION_MS, MAX_DURATION_MS);
}

function normalizePatternPoints() {
  const durationMs = getDuration();
  inputs.patternDuration.value = durationMs;

  patternPoints = patternPoints
    .map((point) => createPoint(
      clamp(Math.round(Number(point.timeMs) || 0), 0, durationMs),
      point.amplitude,
      point.frequencyHz,
      point.id,
    ))
    .sort((a, b) => a.timeMs - b.timeMs);

  patternPoints = patternPoints.filter((point, index, points) => {
    return index === 0 || point.timeMs !== points[index - 1].timeMs;
  });

  if (patternPoints.length === 0 || patternPoints[0].timeMs !== 0) {
    const frequencyHz = patternPoints[0]?.frequencyHz || 560;
    patternPoints.unshift(createPoint(0, 0, frequencyHz));
  }

  if (patternPoints[patternPoints.length - 1].timeMs !== durationMs) {
    const frequencyHz = patternPoints[patternPoints.length - 1]?.frequencyHz || 560;
    patternPoints.push(createPoint(durationMs, 0, frequencyHz));
  }

  patternPoints[0] = createPoint(0, 0, patternPoints[0].frequencyHz, patternPoints[0].id);
  patternPoints[patternPoints.length - 1] = createPoint(
    durationMs,
    0,
    patternPoints[patternPoints.length - 1].frequencyHz,
    patternPoints[patternPoints.length - 1].id,
  );

  if (patternPoints.length > MAX_POINTS) {
    const first = patternPoints[0];
    const last = patternPoints[patternPoints.length - 1];
    patternPoints = [first, ...patternPoints.slice(1, MAX_POINTS - 1), last];
  }
}

function numberValue(input, fallback, min, max) {
  const value = Number(input.value);
  return clamp(Number.isFinite(value) ? Math.round(value) : fallback, min, max);
}

function buildCommand(action) {
  const target = getTarget();

  if (action === "tone") {
    const amplitude = numberValue(inputs.toneAmplitude, 120, 0, 255);
    const frequency = numberValue(inputs.toneFrequency, 560, MIN_FREQUENCY_HZ, MAX_FREQUENCY_HZ);
    const duration = numberValue(inputs.toneDuration, 500, 1, MAX_DURATION_MS);
    return `${target} tone amplitude=${amplitude} frequency=${frequency} duration=${duration}`;
  }

  if (action === "sweep") {
    const amplitude = numberValue(inputs.sweepAmplitude, 140, 0, 255);
    const from = numberValue(inputs.sweepFrom, 180, MIN_FREQUENCY_HZ, MAX_FREQUENCY_HZ);
    const to = numberValue(inputs.sweepTo, 900, MIN_FREQUENCY_HZ, MAX_FREQUENCY_HZ);
    const duration = numberValue(inputs.sweepDuration, 1200, 1, MAX_DURATION_MS);
    return `${target} sweep amplitude=${amplitude} from=${from} to=${to} duration=${duration}`;
  }

  if (action === "pattern") {
    const durationMs = getDuration();
    const pointText = patternPoints
      .map((point) => `${point.timeMs}:${point.amplitude}:${point.frequencyHz}`)
      .join(",");
    return `${target} pattern duration=${durationMs} points=${pointText}`;
  }

  return `${target} stop`;
}

function buildDataArray(action = "pattern") {
  if (action === "tone") {
    return [
      ["target", getTarget()],
      ["command", "tone"],
      ["amplitude", numberValue(inputs.toneAmplitude, 120, 0, 255)],
      ["frequencyHz", numberValue(inputs.toneFrequency, 560, MIN_FREQUENCY_HZ, MAX_FREQUENCY_HZ)],
      ["durationMs", numberValue(inputs.toneDuration, 500, 1, MAX_DURATION_MS)],
    ];
  }

  if (action === "sweep") {
    return [
      ["target", getTarget()],
      ["command", "sweep"],
      ["amplitude", numberValue(inputs.sweepAmplitude, 140, 0, 255)],
      ["fromFrequencyHz", numberValue(inputs.sweepFrom, 180, MIN_FREQUENCY_HZ, MAX_FREQUENCY_HZ)],
      ["toFrequencyHz", numberValue(inputs.sweepTo, 900, MIN_FREQUENCY_HZ, MAX_FREQUENCY_HZ)],
      ["durationMs", numberValue(inputs.sweepDuration, 1200, 1, MAX_DURATION_MS)],
    ];
  }

  if (action !== "pattern") {
    return [
      ["target", getTarget()],
      ["command", action],
    ];
  }

  return [
    ["target", getTarget()],
    ["command", "pattern"],
    ["durationMs", getDuration()],
    ["mode", "amplitude-frequency-pattern"],
    [
      "limits",
      [
        ["amplitude", "0..255"],
        ["frequencyHz", `${MIN_FREQUENCY_HZ}..${MAX_FREQUENCY_HZ}`],
      ],
    ],
    [
      "points",
      [
        ["timeMs", "amplitude", "frequencyHz"],
        ...patternPoints.map((point) => [point.timeMs, point.amplitude, point.frequencyHz]),
      ],
    ],
  ];
}

function setStatus(message, kind) {
  statusEl.textContent = message;
  statusEl.className = `status ${kind || ""}`.trim();
}

function updatePreview(action = "pattern") {
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

function graphPointForAmplitude(point) {
  const durationMs = getDuration();
  const x = GRAPH.left + (point.timeMs / durationMs) * GRAPH.width;
  const y = GRAPH.top + GRAPH.height - (point.amplitude / 255) * GRAPH.height;
  return { x, y };
}

function graphPointForFrequency(point) {
  const durationMs = getDuration();
  const x = GRAPH.left + (point.timeMs / durationMs) * GRAPH.width;
  const normalized = (point.frequencyHz - MIN_FREQUENCY_HZ) / (MAX_FREQUENCY_HZ - MIN_FREQUENCY_HZ);
  const y = GRAPH.top + GRAPH.height - normalized * GRAPH.height;
  return { x, y };
}

function drawGrid() {
  const lines = [];
  const durationMs = getDuration();
  const right = GRAPH.left + GRAPH.width;
  const bottom = GRAPH.top + GRAPH.height;

  lines.push(`<text class="axis-label" x="${GRAPH.left}" y="18" text-anchor="start">amplitude</text>`);
  lines.push(`<text class="axis-label" x="${right}" y="18" text-anchor="end">frequency Hz</text>`);

  for (let i = 0; i <= 4; i++) {
    const x = GRAPH.left + (GRAPH.width * i) / 4;
    const time = Math.round((durationMs * i) / 4);
    const anchor = i === 0 ? "start" : i === 4 ? "end" : "middle";
    lines.push(`<line class="grid-line" x1="${x}" y1="${GRAPH.top}" x2="${x}" y2="${bottom}"></line>`);
    lines.push(`<text class="grid-text" x="${x}" y="${bottom + 24}" text-anchor="${anchor}">${time} ms</text>`);
  }

  for (let i = 0; i <= 4; i++) {
    const y = GRAPH.top + (GRAPH.height * i) / 4;
    const amplitude = Math.round(255 - (255 * i) / 4);
    const frequency = Math.round(MAX_FREQUENCY_HZ - ((MAX_FREQUENCY_HZ - MIN_FREQUENCY_HZ) * i) / 4);
    lines.push(`<line class="grid-line" x1="${GRAPH.left}" y1="${y}" x2="${right}" y2="${y}"></line>`);
    lines.push(`<text class="grid-text" x="${GRAPH.left - 14}" y="${y + 5}" text-anchor="end">${amplitude}</text>`);
    lines.push(`<text class="grid-text" x="${right + 14}" y="${y + 5}" text-anchor="start">${frequency}</text>`);
  }

  gridLayerEl.innerHTML = lines.join("");
}

function renderGraph() {
  drawGrid();

  const amplitudePoints = patternPoints.map(graphPointForAmplitude);
  const frequencyPoints = patternPoints.map(graphPointForFrequency);
  const amplitudeLine = amplitudePoints.map((point) => `${point.x},${point.y}`).join(" ");
  const frequencyLine = frequencyPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const baseY = GRAPH.top + GRAPH.height;
  const fillPoints = [
    `${GRAPH.left},${baseY}`,
    ...amplitudePoints.map((point) => `${point.x},${point.y}`),
    `${GRAPH.left + GRAPH.width},${baseY}`,
  ].join(" ");

  amplitudeLineEl.setAttribute("points", amplitudeLine);
  frequencyLineEl.setAttribute("points", frequencyLine);
  amplitudeFillEl.setAttribute("d", `M ${fillPoints.replaceAll(" ", " L ")} Z`);

  const amplitudeMarkers = amplitudePoints
    .map((point, index) => {
      const fixedClass = index === 0 || index === amplitudePoints.length - 1 ? " fixed" : "";
      return `<circle class="amp-point${fixedClass}" data-mode="amplitude" data-point-id="${patternPoints[index].id}" cx="${point.x}" cy="${point.y}" r="8"><title>Drag vertically to change amplitude</title></circle>`;
    })
    .join("");

  const frequencyMarkers = frequencyPoints
    .map((point, index) => {
      return `<rect class="freq-point" data-mode="frequency" data-point-id="${patternPoints[index].id}" x="${point.x - 7}" y="${point.y - 7}" width="14" height="14" rx="3"><title>Drag vertically to change frequency</title></rect>`;
    })
    .join("");

  const bottom = GRAPH.top + GRAPH.height;
  const timeMarkers = amplitudePoints
    .map((point, index) => ({ point, index }))
    .filter(({ index }) => index > 0 && index < patternPoints.length - 1)
    .map(({ point, index }) => `
      <line class="time-guide" x1="${point.x}" y1="${GRAPH.top}" x2="${point.x}" y2="${bottom}"></line>
      <rect class="time-handle" data-mode="time" data-point-id="${patternPoints[index].id}" x="${point.x - 9}" y="${bottom - 12}" width="18" height="12" rx="3"><title>Drag horizontally to change this point time</title></rect>
      <text class="time-point-label" x="${point.x}" y="${bottom - 3}" text-anchor="middle">${index + 1}</text>
    `)
    .join("");
  pointLayerEl.innerHTML = amplitudeMarkers + frequencyMarkers + timeMarkers;
}

function renderPointRows() {
  pointsListEl.innerHTML = patternPoints
    .map((point, index) => {
      const isEndpoint = index === 0 || index === patternPoints.length - 1;
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
            amplitude
            <input type="number" min="0" max="255" value="${point.amplitude}" data-point-id="${point.id}" data-point-amplitude ${isEndpoint ? "readonly" : ""}>
          </label>
          <label>
            frequency
            <input type="number" min="${MIN_FREQUENCY_HZ}" max="${MAX_FREQUENCY_HZ}" value="${point.frequencyHz}" data-point-id="${point.id}" data-point-frequency>
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
  updatePreview("pattern");
}

function getPointIndex(pointId) {
  return patternPoints.findIndex((point) => point.id === pointId);
}

function getPointTimeBounds(index) {
  if (index === 0) return { min: 0, max: 0 };
  if (index === patternPoints.length - 1) {
    const durationMs = getDuration();
    return { min: durationMs, max: durationMs };
  }
  return {
    min: patternPoints[index - 1].timeMs + 1,
    max: patternPoints[index + 1].timeMs - 1,
  };
}

function addPoint() {
  normalizePatternPoints();

  if (patternPoints.length >= MAX_POINTS) {
    setStatus("Max 32 points", "error");
    return;
  }

  const durationMs = getDuration();
  let timeMs = Math.round(durationMs / 2);
  while (patternPoints.some((point) => point.timeMs === timeMs) && timeMs < durationMs - 20) {
    timeMs += 20;
  }

  patternPoints.push(createPoint(timeMs, 128, 560));
  normalizePatternPoints();
  renderDesigner();
}

function removePoint(pointId) {
  const index = getPointIndex(pointId);
  if (index <= 0 || index >= patternPoints.length - 1) {
    return;
  }

  patternPoints.splice(index, 1);
  renderDesigner();
}

function applyPreset(name) {
  const preset = presets[name];
  if (!preset) {
    return;
  }

  inputs.patternDuration.value = preset.durationMs;
  patternPoints = preset.points.map((point) => createPoint(point.timeMs, point.amplitude, point.frequencyHz));
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

function updateValueFromGraph(pointId, mode, event) {
  const index = getPointIndex(pointId);
  if (index < 0) return;
  const coords = graphCoordinatesFromEvent(event);
  const isEndpoint = index === 0 || index === patternPoints.length - 1;
  const amplitude = Math.round(((GRAPH.top + GRAPH.height - coords.y) / GRAPH.height) * 255);
  const frequencyHz = Math.round(
    MIN_FREQUENCY_HZ +
      ((GRAPH.top + GRAPH.height - coords.y) / GRAPH.height) * (MAX_FREQUENCY_HZ - MIN_FREQUENCY_HZ)
  );

  const nextPoint = { ...patternPoints[index] };

  if (mode === "amplitude" && !isEndpoint) {
    nextPoint.amplitude = clamp(amplitude, 0, 255);
  }

  if (mode === "frequency") {
    nextPoint.frequencyHz = clamp(frequencyHz, MIN_FREQUENCY_HZ, MAX_FREQUENCY_HZ);
  }

  patternPoints[index] = nextPoint;
  renderGraph();
  renderPointRows();
  updatePreview("pattern");
}

function updateTimeFromGraph(pointId, event) {
  const index = getPointIndex(pointId);
  if (index <= 0 || index >= patternPoints.length - 1) return;
  const coords = graphCoordinatesFromEvent(event);
  const requestedTime = Math.round(((coords.x - GRAPH.left) / GRAPH.width) * getDuration());
  const bounds = getPointTimeBounds(index);
  patternPoints[index] = { ...patternPoints[index], timeMs: clamp(requestedTime, bounds.min, bounds.max) };
  renderDesigner();
}

function updateValueFromTable(pointId, field, value) {
  const index = getPointIndex(pointId);
  if (index < 0) return;
  if (field === "amplitude" && (index === 0 || index === patternPoints.length - 1)) return;
  const limits = field === "amplitude" ? [0, 255] : [MIN_FREQUENCY_HZ, MAX_FREQUENCY_HZ];
  patternPoints[index][field] = clamp(Math.round(Number(value) || limits[0]), limits[0], limits[1]);
  renderGraph();
  updatePreview("pattern");
}

function commitTimeFromTable(pointId, value) {
  const index = getPointIndex(pointId);
  if (index <= 0 || index >= patternPoints.length - 1) return;
  const timeText = String(value).trim();
  if (!/^\d+$/.test(timeText)) {
    setStatus("Point time must be a number", "error");
    renderPointRows();
    return;
  }
  const bounds = getPointTimeBounds(index);
  patternPoints[index].timeMs = clamp(Math.round(Number(timeText)), bounds.min, bounds.max);
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

document.addEventListener("click", (event) => {
  const button = commandButtonFromEvent(event);
  if (!button) {
    return;
  }

  sendCommand(button.dataset.command);
});

document.querySelectorAll("button[data-preset]").forEach((button) => {
  button.addEventListener("click", () => applyPreset(button.dataset.preset));
});

document.querySelector("#addPoint").addEventListener("click", addPoint);

pointsListEl.addEventListener("input", (event) => {
  const pointId = event.target.dataset.pointId;
  if (!pointId || event.target.dataset.pointTime !== undefined) return;
  if (event.target.dataset.pointAmplitude !== undefined) {
    updateValueFromTable(pointId, "amplitude", event.target.value);
  } else if (event.target.dataset.pointFrequency !== undefined) {
    updateValueFromTable(pointId, "frequencyHz", event.target.value);
  }
});

pointsListEl.addEventListener("change", (event) => {
  const pointId = event.target.dataset.pointId;
  if (!pointId) return;
  if (event.target.dataset.pointTime !== undefined) {
    commitTimeFromTable(pointId, event.target.value);
  } else if (event.target.dataset.pointAmplitude !== undefined || event.target.dataset.pointFrequency !== undefined) {
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
  const target = event.target.closest("[data-point-id][data-mode]");
  if (!target) {
    return;
  }

  activeDrag = {
    mode: target.dataset.mode,
    pointId: target.dataset.pointId,
  };
  graphEl.setPointerCapture(event.pointerId);
});

graphEl.addEventListener("pointermove", (event) => {
  if (activeDrag === null) {
    return;
  }

  if (activeDrag.mode === "time") {
    updateTimeFromGraph(activeDrag.pointId, event);
  } else {
    updateValueFromGraph(activeDrag.pointId, activeDrag.mode, event);
  }
});

graphEl.addEventListener("pointercancel", () => {
  activeDrag = null;
});

graphEl.addEventListener("pointerup", (event) => {
  activeDrag = null;
  graphEl.releasePointerCapture(event.pointerId);
});

Object.values(inputs).forEach((input) => {
  input.addEventListener("input", () => {
    if (input === inputs.patternDuration) {
      return;
    }

    updatePreview("pattern");
  });
  input.addEventListener("change", () => {
    if (input === inputs.patternDuration) {
      normalizePatternPoints();
      renderDesigner();
      return;
    }

    updatePreview("pattern");
  });
});

renderDesigner();
