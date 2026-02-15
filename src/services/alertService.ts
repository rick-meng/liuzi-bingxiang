import { DateTime } from "luxon";

import type { PantryItem } from "../types/domain.js";

export interface ExpiryAlertItem {
  itemId: string;
  ingredientKey: string;
  nameZh: string;
  expiresAt: string;
  daysToExpiry: number;
  stage: "three_day" | "today";
}

function computeDaysToExpiry(expiresAt: string, timezone: string, now: DateTime): number | null {
  const expiry = DateTime.fromISO(expiresAt, { zone: timezone });
  if (!expiry.isValid) {
    return null;
  }

  return Math.floor(expiry.startOf("day").diff(now.startOf("day"), "days").days);
}

export function buildExpiryAlerts(
  pantry: PantryItem[],
  timezone: string,
  now = DateTime.now().setZone(timezone)
): {
  alerts: ExpiryAlertItem[];
  priorityItems: ExpiryAlertItem[];
} {
  const alerts: ExpiryAlertItem[] = [];

  for (const item of pantry) {
    if (!item.expiresAt) {
      continue;
    }

    const daysToExpiry = computeDaysToExpiry(item.expiresAt, timezone, now);
    if (daysToExpiry === null || daysToExpiry < 0 || daysToExpiry > 3) {
      continue;
    }

    alerts.push({
      itemId: item.id,
      ingredientKey: item.ingredientKey,
      nameZh: item.nameZh,
      expiresAt: item.expiresAt,
      daysToExpiry,
      stage: daysToExpiry === 0 ? "today" : "three_day"
    });
  }

  const sorted = alerts.sort((left, right) => left.daysToExpiry - right.daysToExpiry);

  return {
    alerts: sorted,
    priorityItems: sorted.slice(0, 3)
  };
}
