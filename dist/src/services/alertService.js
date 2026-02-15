import { DateTime } from "luxon";
function computeDaysToExpiry(expiresAt, timezone, now) {
    const expiry = DateTime.fromISO(expiresAt, { zone: timezone });
    if (!expiry.isValid) {
        return null;
    }
    return Math.floor(expiry.startOf("day").diff(now.startOf("day"), "days").days);
}
export function buildExpiryAlerts(pantry, timezone, now = DateTime.now().setZone(timezone)) {
    const alerts = [];
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
