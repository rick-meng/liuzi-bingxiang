export function renderZoneBadge(summary) {
  const expiringDot = summary.expiringCount > 0 ? '<span class="zone-expiring-dot"></span>' : "";
  return `
    <div class="zone-badge">
      <span class="zone-count">${summary.itemCount}</span>
      <span class="zone-label">items</span>
      ${expiringDot}
    </div>
  `;
}
