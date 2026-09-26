#pragma once
#include <stdint.h>
#include <string.h>

namespace Peltier {
const char DEVICE_ID[] = "haptell-06-peltier-shape";
const uint32_t MAX_DURATION_MS = 60000;
const uint32_t TIME_STEP_MS = 500;
const uint8_t MAX_POINTS = 30;

struct Point {
  uint32_t timeMs;
  uint8_t pwm;
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
  while (*text >= '0' && *text <= '9') {
    const uint8_t digit = *text++ - '0';
    if (value > limit / 10 || (value == limit / 10 && digit > limit % 10)) return false;
    value = value * 10 + digit;
  }
  return true;
}

// Only assigns the candidate on success; malformed commands cannot alter playback.
inline bool parseShape(const char *text, Shape &result) {
  const char prefix[] = "haptell-06-peltier-shape shape duration=";
  if (strncmp(text, prefix, sizeof(prefix) - 1) != 0) return false;
  text += sizeof(prefix) - 1;
  Shape candidate = {};
  if (!number(text, MAX_DURATION_MS, candidate.durationMs) ||
      candidate.durationMs < TIME_STEP_MS || candidate.durationMs % TIME_STEP_MS != 0) return false;
  const char pointsPrefix[] = " points=";
  if (strncmp(text, pointsPrefix, sizeof(pointsPrefix) - 1) != 0) return false;
  text += sizeof(pointsPrefix) - 1;
  while (*text) {
    if (candidate.count >= MAX_POINTS) return false;
    uint32_t timeMs, pwm;
    if (!number(text, candidate.durationMs, timeMs) || *text++ != ':') return false;
    if (!number(text, 255, pwm)) return false;
    if (timeMs % TIME_STEP_MS != 0) return false;
    if (candidate.count == 0 && timeMs != 0) return false;
    if (candidate.count > 0 && timeMs <= candidate.points[candidate.count - 1].timeMs) return false;
    candidate.points[candidate.count++] = {timeMs, static_cast<uint8_t>(pwm)};
    if (*text == '\0') break;
    if (*text++ != ',' || *text == '\0') return false;
  }
  if (candidate.count < 2) return false;
  const Point &last = candidate.points[candidate.count - 1];
  if (last.timeMs != candidate.durationMs || last.pwm != 0) return false;
  result = candidate;
  return true;
}

inline uint8_t valueAt(const Shape &shape, uint32_t elapsed) {
  if (shape.count < 2 || elapsed >= shape.durationMs) return 0;
  for (uint8_t i = 1; i < shape.count; ++i) {
    const Point &from = shape.points[i - 1];
    const Point &to = shape.points[i];
    if (elapsed <= to.timeMs) {
      // Signed arithmetic is required for falling ramps.
      const int32_t delta = static_cast<int32_t>(to.pwm) - from.pwm;
      return from.pwm + delta * static_cast<int32_t>(elapsed - from.timeMs) /
                            static_cast<int32_t>(to.timeMs - from.timeMs);
    }
  }
  return 0;
}
} // namespace Peltier
