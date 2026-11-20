"use strict";

const Haptell07 = (() => {
  const DEVICE = "haptell-07-dual-peltier-shape";
  const SCHEMA = "haptell-dual-peltier-shape-pattern/v1";
  const PORT = 4444;
  const STEP = 500;
  const MAX_DURATION = 90000;
  const MAX_POINTS = 30;
  const STOP = `${DEVICE} stop`;
  const PREFIX = `${DEVICE} shape duration=`;

  function validate(pattern) {
    if (pattern?.schema !== SCHEMA) throw new Error("Expected a Haptell-07 pattern.");
    const { durationMs, points } = pattern;
    if (!Number.isInteger(durationMs) || durationMs < STEP || durationMs > MAX_DURATION || durationMs % STEP) {
      throw new Error("Duration must be 0.5–90 seconds in half-second steps.");
    }
    if (!Array.isArray(points) || points.length < 2 || points.length > MAX_POINTS) {
      throw new Error("A pattern needs 2–30 points.");
    }
    let previousTime = -1;
    for (const point of points) {
      const { timeMs, pwmD3, pwmD5 } = point ?? {};
      if (!Number.isInteger(timeMs) || timeMs <= previousTime || timeMs > durationMs || timeMs % STEP) {
        throw new Error("Point times must increase in half-second steps within the duration.");
      }
      if (![pwmD3, pwmD5].every((value) => Number.isInteger(value) && value >= 0 && value <= 255)) {
        throw new Error("Each PWM value must be an integer from 0 to 255.");
      }
      previousTime = timeMs;
    }
    const last = points.at(-1);
    if (points[0].timeMs !== 0 || last.timeMs !== durationMs || last.pwmD3 !== 0 || last.pwmD5 !== 0) {
      throw new Error("Start at zero seconds and end with both outputs off at the pattern duration.");
    }
    return { schema: SCHEMA, durationMs, points: points.map(({ timeMs, pwmD3, pwmD5 }) => ({ timeMs, pwmD3, pwmD5 })) };
  }

  function commandFor(pattern) {
    const { durationMs, points } = validate(pattern);
    const payload = points.map(({ timeMs, pwmD3, pwmD5 }) => `${timeMs}:${pwmD3}:${pwmD5}`).join(",");
    return `${PREFIX}${durationMs} points=${payload}`;
  }

  function validateCommand(command) {
    if (command === STOP) return true;
    if (typeof command !== "string" || command.length >= 768 || !command.startsWith(PREFIX)) return false;
    const match = /^([0-9]{1,5}) points=([0-9:,]+)$/.exec(command.slice(PREFIX.length));
    if (!match || match[0].length !== command.length - PREFIX.length) return false;
    const entries = match[2].split(",");
    if (!entries.every((entry) => /^[0-9]{1,5}:[0-9]{1,3}:[0-9]{1,3}$/.test(entry))) return false;
    const points = entries.map((entry) => {
      const [timeMs, pwmD3, pwmD5] = entry.split(":").map(Number);
      return { timeMs, pwmD3, pwmD5 };
    });
    try {
      validate({ schema: SCHEMA, durationMs: Number(match[1]), points });
      return true;
    } catch {
      return false;
    }
  }

  return { SCHEMA, PORT, STEP, MAX_DURATION, MAX_POINTS, STOP, validate, commandFor, validateCommand };
})();

if (typeof module !== "undefined") module.exports = Haptell07;
