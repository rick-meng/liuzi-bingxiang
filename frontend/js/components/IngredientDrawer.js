import { renderIngredientChip } from "./IngredientChip.js";
import { t } from "../i18n.js";

export function renderIngredientDrawer({
  language,
  items,
  alerts,
  catalogMap,
  resolveEmoji,
  title
}) {
  if (items.length === 0) {
    return `
      <section class="ingredient-drawer">
        <div class="drawer-head">
          <h3>${title}</h3>
          <span>${t(language, "sortHint")}</span>
        </div>
        <p class="drawer-empty">${t(language, "noItems")}</p>
      </section>
    `;
  }

  const list = items
    .map((item) => {
      const expiring = alerts.some((alert) => alert.itemId === item.id);
      const category = catalogMap.get(item.ingredientKey)?.category;
      const emoji = resolveEmoji(item.ingredientKey, category);
      const expiryValue = item.expiresAt ? item.expiresAt.slice(0, 10) : "";

      return `
        <li class="drawer-item" data-item-id="${item.id}">
          ${renderIngredientChip({ item, emoji, language, expiring })}
          <div class="drawer-item-tools">
            <label>
              ${t(language, "quantity")}
              <input type="number" min="0" step="0.1" class="drawer-input drawer-qty" value="${item.quantity}">
            </label>
            <label>
              ${t(language, "expiryDate")}
              <input type="date" class="drawer-input drawer-expiry" value="${expiryValue}">
            </label>
          </div>
          <div class="drawer-actions">
            <button type="button" data-action="update-item" data-item-id="${item.id}">${t(language, "update")}</button>
            <button type="button" data-action="mark-used" data-item-id="${item.id}">${t(language, "markUsed")}</button>
            <button type="button" data-action="add-list" data-item-id="${item.id}">${t(language, "quickAddList")}</button>
          </div>
        </li>
      `;
    })
    .join("");

  return `
    <section class="ingredient-drawer">
      <div class="drawer-head">
        <h3>${title}</h3>
        <span>${t(language, "sortHint")}</span>
      </div>
      <ul class="drawer-list">${list}</ul>
    </section>
  `;
}
