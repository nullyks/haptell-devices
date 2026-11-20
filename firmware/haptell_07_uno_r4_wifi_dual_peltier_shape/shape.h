#pragma once
#include <stdint.h>
#include <string.h>

namespace DualPeltier {
const char SHAPE_PREFIX[] = "haptell-07-dual-peltier-shape shape duration=";
const char STOP_COMMAND[] = "haptell-07-dual-peltier-shape stop";
const uint8_t CHANNELS = 2;
const uint32_t MAX_DURATION_MS = 90000;
const uint32_t TIME_STEP_MS = 500;
const uint8_t MAX_POINTS = 30;

struct Point {
  uint32_t timeMs;
  uint8_t pwm[CHANNELS];
};

struct Shape {
  uint32_t durationMs;
  uint8_t count;
  Point points[MAX_POINTS];
};

// Bounded decimal parsing rejects signs, overflow and partial numbers.
inline bool number(const char *&text, uint32_t limit, uint32_t &value) {
  if (*text < '0' || *text > '9') return false;
  value = 0;
  uint8_t digits = 0;
  const uint8_t maxDigits = limit > 255 ? 5 : 3;
  while (*text >= '0' && *text <= '9') {
    if (++digits > maxDigits) return false;
    const uint8_t digit = *text++ - '0';
    if (value > limit / 10 || (value == limit / 10 && digit > limit % 10)) return false;
    value = value * 10 + digit;
  }
  return true;
}

// Only assigns the candidate on success; malformed commands cannot alter playback.
inline bool parseShape(const char *text, Shape &result) {
  if (strncmp(text, SHAPE_PREFIX, sizeof(SHAPE_PREFIX) - 1) != 0) return false;
  text += sizeof(SHAPE_PREFIX) - 1;
  Shape candidate = {};
  if (!number(text, MAX_DURATION_MS, candidate.durationMs) ||
      candidate.durationMs < TIME_STEP_MS || candidate.durationMs % TIME_STEP_MS != 0) return false;
  const char pointsPrefix[] = " points=";
  if (strncmp(text, pointsPrefix, sizeof(pointsPrefix) - 1) != 0) return false;
  text += sizeof(pointsPrefix) - 1;
  while (*text) {
    if (candidate.count >= MAX_POINTS) return false;
    uint32_t timeMs;
    if (!number(text, MAX_DURATION_MS, timeMs) || timeMs > candidate.durationMs) return false;
    if (timeMs % TIME_STEP_MS != 0) return false;
    if (candidate.count == 0 && timeMs != 0) return false;
    if (candidate.count > 0 && timeMs <= candidate.points[candidate.count - 1].timeMs) return false;
    Point &point = candidate.points[candidate.count++];
    point.timeMs = timeMs;
    for (uint8_t channel = 0; channel < CHANNELS; channel++) {
      uint32_t pwm;
      if (*text++ != ':' || !number(text, 255, pwm)) return false;
      point.pwm[channel] = static_cast<uint8_t>(pwm);
    }
    if (*text == '\0') break;
    if (*text++ != ',' || *text == '\0') return false;
  }
  if (candidate.count < 2) return false;
  const Point &last = candidate.points[candidate.count - 1];
  if (last.timeMs != candidate.durationMs || last.pwm[0] != 0 || last.pwm[1] != 0) return false;
  result = candidate;
  return true;
}

inline Point valueAt(const Shape &shape, uint32_t elapsed) {
  Point output = {elapsed, {0, 0}};
  if (shape.count < 2 || elapsed >= shape.durationMs) return output;
  for (uint8_t i = 1; i < shape.count; ++i) {
    const Point &from = shape.points[i - 1];
    const Point &to = shape.points[i];
    if (elapsed <= to.timeMs) {
      // Signed arithmetic is required for falling ramps.
      for (uint8_t channel = 0; channel < CHANNELS; channel++) {
        const int32_t delta = static_cast<int32_t>(to.pwm[channel]) - from.pwm[channel];
        output.pwm[channel] = from.pwm[channel] + delta * static_cast<int32_t>(elapsed - from.timeMs) /
                                                 static_cast<int32_t>(to.timeMs - from.timeMs);
      }
      break;
    }
  }
  return output;
}
} // namespace DualPeltier
