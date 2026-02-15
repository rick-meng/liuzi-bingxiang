import { FRIDGE_ZONES, getZoneLabel } from "../fridgeZones.js";

function renderZoneShelf({
  zone,
  language,
  items,
  summary,
  selectedZoneId,
  highlightedZoneId,
  alerts,
  resolveEmoji,
  catalogMap
}) {
  const isSelected = selectedZoneId === zone.id;
  const isHighlighted = highlightedZoneId === zone.id;
  const alertSet = new Set(alerts.map((item) => item.itemId));

  const itemCloud =
    items.length === 0
      ? `<p class="fridge-shelf-empty">-</p>`
      : items
          .map((item) => {
            const category = catalogMap.get(item.ingredientKey)?.category;
            const emoji = resolveEmoji(item.ingredientKey, category);
            const displayName = language === "en-NZ" ? item.nameEn : item.nameZh;
            const expiringClass = alertSet.has(item.id) ? "expiring" : "";

            return `
              <button type="button" class="fridge-item-pill ${expiringClass}" data-zone-id="${zone.id}">
                <span>${emoji}</span>
                <span>${displayName}</span>
              </button>
            `;
          })
          .join("");

  return `
    <section class="fridge-zone-block ${isSelected ? "active" : ""} ${isHighlighted ? "highlight" : ""}">
      <button type="button" class="fridge-zone-head" data-zone-id="${zone.id}">
        <span class="fridge-zone-title">${zone.icon} ${getZoneLabel(zone, language)}</span>
        <span class="fridge-zone-count">${summary.itemCount}</span>
      </button>
      <div class="fridge-zone-cloud">${itemCloud}</div>
    </section>
  `;
}

export function renderFridgeCanvas({
  language,
  zoneSummaries,
  selectedZoneId,
  highlightedZoneId,
  groupedZoneItems,
  alerts,
  resolveEmoji,
  catalogMap
}) {
  const doorZone = FRIDGE_ZONES.find((zone) => zone.id === "door_condiments");
  const topZone = FRIDGE_ZONES.find((zone) => zone.id === "fridge_top");
  const middleZone = FRIDGE_ZONES.find((zone) => zone.id === "fridge_middle");
  const freezerZone = FRIDGE_ZONES.find((zone) => zone.id === "freezer_drawer");
  const pantryZone = FRIDGE_ZONES.find((zone) => zone.id === "pantry_cabinet");

  return `
    <section class="fridge-wrap">
      <div class="fridge-shell open-layout">
        <div class="fridge-brand">留子冰箱</div>
        <div class="fridge-open-body">
          <aside class="fridge-door-panel">
            ${doorZone ? renderZoneShelf({
              zone: doorZone,
              language,
              items: groupedZoneItems[doorZone.id] ?? [],
              summary: zoneSummaries[doorZone.id] ?? { itemCount: 0, expiringCount: 0 },
              selectedZoneId,
              highlightedZoneId,
              alerts,
              resolveEmoji,
              catalogMap
            }) : ""}
          </aside>
          <div class="fridge-main-panel">
            ${topZone ? renderZoneShelf({
              zone: topZone,
              language,
              items: groupedZoneItems[topZone.id] ?? [],
              summary: zoneSummaries[topZone.id] ?? { itemCount: 0, expiringCount: 0 },
              selectedZoneId,
              highlightedZoneId,
              alerts,
              resolveEmoji,
              catalogMap
            }) : ""}
            ${middleZone ? renderZoneShelf({
              zone: middleZone,
              language,
              items: groupedZoneItems[middleZone.id] ?? [],
              summary: zoneSummaries[middleZone.id] ?? { itemCount: 0, expiringCount: 0 },
              selectedZoneId,
              highlightedZoneId,
              alerts,
              resolveEmoji,
              catalogMap
            }) : ""}
            ${freezerZone ? renderZoneShelf({
              zone: freezerZone,
              language,
              items: groupedZoneItems[freezerZone.id] ?? [],
              summary: zoneSummaries[freezerZone.id] ?? { itemCount: 0, expiringCount: 0 },
              selectedZoneId,
              highlightedZoneId,
              alerts,
              resolveEmoji,
              catalogMap
            }) : ""}
          </div>
        </div>
        <div class="fridge-pantry-row">
          ${pantryZone ? renderZoneShelf({
            zone: pantryZone,
            language,
            items: groupedZoneItems[pantryZone.id] ?? [],
            summary: zoneSummaries[pantryZone.id] ?? { itemCount: 0, expiringCount: 0 },
            selectedZoneId,
            highlightedZoneId,
            alerts,
            resolveEmoji,
            catalogMap
          }) : ""}
        </div>
      </div>
    </section>
  `;
}
