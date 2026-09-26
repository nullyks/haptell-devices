const DEVICE_ID = "haptell-06-peltier-shape";
const UDP_PORT = 4445;
const MAX_DURATION_MS = 60000;
const TIME_STEP_MS = 500;

function validateCommand(command) {
  if (typeof command !== "string" || Buffer.byteLength(command) >= 768) return false;
  if (command === `${DEVICE_ID} stop`) return true;
  const match = command.match(/^haptell-06-peltier-shape shape duration=([0-9]{1,5}) points=([0-9:,]+)$/);
  if (!match) return false;
  const duration = Number(match[1]);
  if (duration < TIME_STEP_MS || duration > MAX_DURATION_MS || duration % TIME_STEP_MS !== 0) return false;
  const pairs = match[2].split(",");
  if (pairs.length < 2 || pairs.length > 30) return false;
  let previous = -1;
  for (let i = 0; i < pairs.length; i++) {
    if (!/^[0-9]{1,5}:[0-9]{1,3}$/.test(pairs[i])) return false;
    const [time, pwm] = pairs[i].split(":").map(Number);
    if (time <= previous || time > duration || time % TIME_STEP_MS !== 0 || pwm > 255) return false;
    if (i === 0 && time !== 0) return false;
    if (i === pairs.length - 1 && (time !== duration || pwm !== 0)) return false;
    previous = time;
  }
  return true;
}

module.exports = { DEVICE_ID, UDP_PORT, MAX_DURATION_MS, TIME_STEP_MS, validateCommand };
