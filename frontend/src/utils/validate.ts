import { datetimeLocalToUnixSeconds, nowUnixSeconds } from "./datetime";
import type { FormState } from "./types";

export const validate = (state: FormState): string | null => {
  if (!state.flightId.trim()) return "Flight ID is required.";
  if (!state.departLocal) return "Departure date/time is required.";
  if (!state.closeLocal) return "Close date/time is required.";
  const threshold = Number(state.thresholdMin);
  if (!Number.isFinite(threshold) || threshold <= 0)
    return "Threshold minutes must be > 0.";

  const departTs = datetimeLocalToUnixSeconds(state.departLocal);
  const closeTs = datetimeLocalToUnixSeconds(state.closeLocal);
  const now = nowUnixSeconds();

  if (departTs <= now) return "Departure must be in the future.";
  if (closeTs <= now) return "Close time must be in the future.";
  if (closeTs >= departTs) return "Close time must be before departure.";

  return null;
};

export const isValidAmount = (value: string): boolean => {
  if (!value.trim()) return false;
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
};
