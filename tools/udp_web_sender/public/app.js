const statusEl = document.querySelector("#status");
const previewEl = document.querySelector("#commandPreview");

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
};

function getTarget() {
  return inputs.target.value.trim() || "haptell-02";
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

  if (action === "custom") {
    return `${target} custom`;
  }

  return `${target} stop`;
}

function setStatus(message, kind) {
  statusEl.textContent = message;
  statusEl.className = `status ${kind || ""}`.trim();
}

function updatePreview(action = "pulse") {
  previewEl.value = buildCommand(action);
}

async function sendCommand(action) {
  const command = buildCommand(action);
  previewEl.value = command;
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

document.querySelectorAll("button[data-command]").forEach((button) => {
  button.addEventListener("mouseenter", () => updatePreview(button.dataset.command));
  button.addEventListener("focus", () => updatePreview(button.dataset.command));
  button.addEventListener("click", () => sendCommand(button.dataset.command));
});

Object.values(inputs).forEach((input) => {
  input.addEventListener("input", () => updatePreview());
  input.addEventListener("change", () => updatePreview());
});

updatePreview();
