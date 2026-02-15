import { t } from "../i18n.js";

export function renderKitchenHeader(language, page) {
  const title = page === "settings" ? t(language, "settingsTitle") : t(language, "appName");
  const subtitle = page === "settings" ? "" : t(language, "appSubtitle");

  return `
    <header class="kitchen-header">
      <div class="header-title-wrap">
        <h1>${title}</h1>
        ${subtitle ? `<p>${subtitle}</p>` : ""}
      </div>
      <div class="header-actions">
        ${
          page === "settings"
            ? `<button type="button" class="ghost-btn" id="back-main">${t(language, "back")}</button>`
            : `<button type="button" class="ghost-btn" id="open-settings">${t(language, "openSettings")}</button>`
        }
      </div>
    </header>
  `;
}
