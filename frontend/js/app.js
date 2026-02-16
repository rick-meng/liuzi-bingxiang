import { api, setAuthToken } from "./api.js";
import { t } from "./i18n.js";
import { createInitialState, buildCatalogMap, computeZoneSummaries, getZoneItems, getVisibleDynamicFields } from "./state.js";
import { FRIDGE_ZONES, getZoneLabel, resolveZoneId } from "./fridgeZones.js";
import { resolveIngredientEmoji } from "./emojiMap.js";
import { renderKitchenHeader } from "./components/KitchenHeader.js";
import { renderFridgeCanvas } from "./components/FridgeCanvas.js";
import { renderIngredientDrawer } from "./components/IngredientDrawer.js";
import { renderSettingSectionCard } from "./components/SettingSectionCard.js";
import { renderDynamicSettingField } from "./components/DynamicSettingField.js";
import { renderLocaleSwitch } from "./components/LocaleSwitch.js";
import { renderTimezonePicker } from "./components/TimezonePicker.js";

const state = createInitialState();
const appRoot = document.getElementById("app");

try {
  state.showOnboarding = window.localStorage.getItem("lzbx_onboarding_seen") !== "1";
} catch {
  state.showOnboarding = false;
}

try {
  const raw = window.localStorage.getItem(RECENT_INGREDIENTS_STORAGE_KEY);
  const parsed = raw ? JSON.parse(raw) : [];
  state.recentIngredientKeys = Array.isArray(parsed)
    ? parsed.filter((item) => typeof item === "string").slice(0, 12)
    : [];
} catch {
  state.recentIngredientKeys = [];
}

try {
  const token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  if (token) {
    state.authToken = token;
    setAuthToken(token);
  }
} catch {
  state.authToken = null;
}

const SECTION_LABEL_KEYS = {
  language_region: "languageRegion",
  cooking_preferences: "cookingPreferences",
  notifications: "notifications",
  more_personalization: "morePersonalization"
};

const CATEGORY_LABEL_KEY = {
  all: "categoryAll",
  protein: "categoryProtein",
  vegetable: "categoryVegetable",
  staple: "categoryStaple",
  sauce: "categorySauce",
  seasoning: "categorySeasoning",
  aromatics: "categoryAromatics"
};

const CATEGORY_ORDER = ["all", "protein", "vegetable", "staple", "sauce", "seasoning", "aromatics"];
const ALL_UNITS = ["piece", "g", "kg", "ml", "l", "pack", "tbsp", "tsp"];
const RECENT_INGREDIENTS_STORAGE_KEY = "lzbx_recent_ingredients";
const AUTH_TOKEN_STORAGE_KEY = "lzbx_auth_token";
const QUICK_INGREDIENT_KEYS = [
  "egg",
  "tomato",
  "rice",
  "noodles",
  "chicken_thigh",
  "ground_beef",
  "tofu_firm",
  "bok_choy",
  "garlic",
  "soy_sauce",
  "oyster_sauce",
  "milk"
];
const DEFAULT_QUANTITY_BY_UNIT = {
  piece: 2,
  g: 300,
  kg: 1,
  ml: 200,
  l: 1,
  pack: 1,
  tbsp: 1,
  tsp: 1
};

function persistAuthToken(token) {
  try {
    if (!token) {
      window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  } catch {
    // Ignore localStorage failures.
  }
}

function clearAuthState() {
  state.authToken = null;
  state.authUser = null;
  state.isAuthenticated = false;
  state.userId = "";
  setAuthToken(null);
  persistAuthToken(null);
}

function getCategoryLabel(category) {
  return t(state.language, CATEGORY_LABEL_KEY[category] ?? "categoryAll");
}

function sortCatalogItems(items) {
  return [...items].sort((left, right) => {
    if (state.language === "en-NZ") {
      return left.nameEn.localeCompare(right.nameEn, "en-NZ");
    }
    return left.nameZh.localeCompare(right.nameZh, "zh-Hans-CN");
  });
}

function getCategoryOptions() {
  const existingCategories = new Set(state.catalogItems.map((item) => item.category));
  return CATEGORY_ORDER.filter((category) => category === "all" || existingCategories.has(category));
}

function getFilteredCatalogItems(category) {
  let list =
    category === "all"
      ? state.catalogItems
      : state.catalogItems.filter((item) => item.category === category);

  const keyword = String(state.addDraft.keyword ?? "").trim().toLowerCase();
  if (keyword) {
    list = list.filter((item) => {
      const target = `${item.nameZh} ${item.nameEn} ${item.aliases.join(" ")}`.toLowerCase();
      return target.includes(keyword);
    });
  }

  return sortCatalogItems(list);
}

function applyIngredientDefaults(ingredientKey) {
  const ingredient = state.catalogMap.get(ingredientKey);
  if (!ingredient) {
    return;
  }

  const defaultUnit = ingredient.typicalUnits?.[0] ?? "piece";
  state.addDraft.ingredientKey = ingredient.ingredientKey;
  state.addDraft.unit = defaultUnit;
  state.addDraft.quantity = DEFAULT_QUANTITY_BY_UNIT[defaultUnit] ?? 1;
  state.addDraft.storageType = ingredient.storageType;
}

function ensureAddDraftReady() {
  if (state.catalogItems.length === 0) {
    return;
  }

  const categories = getCategoryOptions();
  if (!categories.includes(state.addDraft.category)) {
    state.addDraft.category = "all";
  }

  const filtered = getFilteredCatalogItems(state.addDraft.category);
  if (filtered.length === 0) {
    state.addDraft.ingredientKey = "";
    return;
  }

  const selectedExists = filtered.some((item) => item.ingredientKey === state.addDraft.ingredientKey);
  if (!selectedExists) {
    applyIngredientDefaults(filtered[0].ingredientKey);
  }
}

function getRecentCatalogItems(limit = 8) {
  const output = [];
  for (const ingredientKey of state.recentIngredientKeys) {
    const item = state.catalogMap.get(ingredientKey);
    if (!item) {
      continue;
    }
    output.push(item);
    if (output.length >= limit) {
      break;
    }
  }
  return output;
}

function getQuickCatalogItems(limit = 12) {
  const picked = [];
  const seen = new Set();

  for (const ingredientKey of QUICK_INGREDIENT_KEYS) {
    const item = state.catalogMap.get(ingredientKey);
    if (!item || seen.has(item.ingredientKey)) {
      continue;
    }
    picked.push(item);
    seen.add(item.ingredientKey);
    if (picked.length >= limit) {
      return picked;
    }
  }

  const fallback = sortCatalogItems(state.catalogItems);
  for (const item of fallback) {
    if (seen.has(item.ingredientKey)) {
      continue;
    }
    picked.push(item);
    seen.add(item.ingredientKey);
    if (picked.length >= limit) {
      break;
    }
  }

  return picked;
}

function recordRecentIngredient(ingredientKey) {
  if (!ingredientKey) {
    return;
  }

  state.recentIngredientKeys = [
    ingredientKey,
    ...state.recentIngredientKeys.filter((key) => key !== ingredientKey)
  ].slice(0, 12);

  try {
    window.localStorage.setItem(
      RECENT_INGREDIENTS_STORAGE_KEY,
      JSON.stringify(state.recentIngredientKeys)
    );
  } catch {
    // Ignore localStorage errors.
  }
}

function getGroupedZoneItems() {
  const grouped = Object.fromEntries(FRIDGE_ZONES.map((zone) => [zone.id, []]));

  for (const item of state.pantryItems) {
    const zoneId = resolveZoneId(item, state.catalogMap);
    if (!grouped[zoneId]) {
      grouped[zoneId] = [];
    }
    grouped[zoneId].push(item);
  }

  for (const zoneId of Object.keys(grouped)) {
    grouped[zoneId].sort((left, right) => {
      if (!left.expiresAt && !right.expiresAt) {
        return left.nameZh.localeCompare(right.nameZh, "zh-Hans-CN");
      }
      if (!left.expiresAt) {
        return 1;
      }
      if (!right.expiresAt) {
        return -1;
      }
      return new Date(left.expiresAt).getTime() - new Date(right.expiresAt).getTime();
    });
  }

  return grouped;
}

function getMatchLabel(matchType) {
  if (matchType === "full") {
    return t(state.language, "recommendationFull");
  }
  if (matchType === "partial") {
    return t(state.language, "recommendationPartial");
  }
  return t(state.language, "recommendationExpiry");
}

function getTonightMatches(limit = 6) {
  const merged = [
    ...state.recommendations.full,
    ...state.recommendations.partial,
    ...state.recommendations.expiryFirst
  ];
  const seen = new Set();

  return merged
    .sort((left, right) => right.totalScore - left.totalScore)
    .filter((item) => {
      if (seen.has(item.recipeId)) {
        return false;
      }
      seen.add(item.recipeId);
      return true;
    })
    .slice(0, limit);
}

function safeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toISOString().slice(0, 10);
}

function toIsoDate(dateString) {
  if (!dateString) {
    return null;
  }
  const date = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function recipeCard(match, groupLabel) {
  const recipe = match.recipe;
  if (!recipe) {
    return "";
  }

  const missingList = match.missingIngredients
    .map((item) => `${item.nameZh}/${item.nameEn}`)
    .join(", ");

  const firstZone = recipe.ingredients.find((ingredient) =>
    state.pantryItems.some((item) => item.ingredientKey === ingredient.ingredientKey)
  );

  let zoneHint = "";
  if (firstZone) {
    const pantryMatch = state.pantryItems.find((item) => item.ingredientKey === firstZone.ingredientKey);
    if (pantryMatch) {
      const zoneId = resolveZoneId(pantryMatch, state.catalogMap);
      const zone = FRIDGE_ZONES.find((entry) => entry.id === zoneId);
      if (zone) {
        zoneHint = `<span class="recipe-zone">${t(state.language, "fromZone")} ${getZoneLabel(zone, state.language)}</span>`;
      }
    }
  }

  return `
    <article class="recipe-card">
      <div class="recipe-top">
        <span class="recipe-pill">${groupLabel}</span>
        ${zoneHint}
      </div>
      <h4>${safeHtml(recipe.title)}</h4>
      <p>${t(state.language, "cookMinutes")}: ${recipe.cookMinutes} ${t(state.language, "minutes")} · ${t(state.language, "servings")}: ${recipe.servings}</p>
      ${missingList ? `<p class="missing-line">${t(state.language, "missing")}: ${safeHtml(missingList)}</p>` : ""}
      <div class="recipe-actions">
        <button type="button" data-action="recipe-details" data-recipe-id="${recipe.id}">${t(state.language, "recipeDetails")}</button>
        <button type="button" data-action="generate-shopping" data-recipe-id="${recipe.id}">${t(state.language, "generateShopping")}</button>
      </div>
    </article>
  `;
}

function renderRecipeGroup(titleKey, matches, groupLabel) {
  const cards = matches.map((match) => recipeCard(match, groupLabel)).join("");
  return `
    <section class="content-card">
      <div class="section-head">
        <h3>${t(state.language, titleKey)}</h3>
        <span>${matches.length}</span>
      </div>
      <div class="recipe-grid">${cards || `<p class="empty-tip">${t(state.language, "noRecommendations")}</p>`}</div>
    </section>
  `;
}

function renderHomeTab() {
  const tonightCards = getTonightMatches(6)
    .map((match) => recipeCard(match, getMatchLabel(match.matchType)))
    .join("");

  const priorityItems = state.priorityItems
    .map((item) => {
      const pantryItem = state.pantryItems.find((entry) => entry.id === item.itemId);
      if (!pantryItem) {
        return "";
      }
      const zoneId = resolveZoneId(pantryItem, state.catalogMap);
      const zone = FRIDGE_ZONES.find((entry) => entry.id === zoneId);
      const zoneLabel = zone ? getZoneLabel(zone, state.language) : "";
      return `
        <li>
          <strong>${safeHtml(pantryItem.nameZh)}</strong>
          <span>${formatDate(item.expiresAt)}</span>
          <button type="button" data-action="jump-zone" data-zone-id="${zoneId}">${t(state.language, "jumpToZone")}</button>
          <small>${zoneLabel}</small>
        </li>
      `;
    })
    .join("");

  return `
    <section class="content-card">
      <div class="section-head">
        <h3>${t(state.language, "tonightSection")}</h3>
      </div>
      <p class="section-tip">${t(state.language, "tonightHint")}</p>
      <div class="recipe-grid">${tonightCards || `<p class="empty-tip">${t(state.language, "noRecommendations")}</p>`}</div>
    </section>
    ${renderRecipeGroup("recommendationFull", state.recommendations.full, t(state.language, "recommendationFull"))}
    ${renderRecipeGroup("recommendationPartial", state.recommendations.partial, t(state.language, "recommendationPartial"))}
    <section class="content-card">
      <div class="section-head">
        <h3>${t(state.language, "expiryFirst")}</h3>
      </div>
      <div class="priority-card">
        <h4>${t(state.language, "expiryFirst")}</h4>
        <ul>${priorityItems || `<li>${t(state.language, "noItems")}</li>`}</ul>
      </div>
    </section>
    ${renderRecipeGroup("recommendationExpiry", state.recommendations.expiryFirst, t(state.language, "recommendationExpiry"))}
  `;
}

function renderInventorySummary() {
  const openedCount = state.pantryItems.filter((item) => item.openedAt).length;
  return `
    <section class="summary-card">
      <h3>${t(state.language, "todaySummary")}</h3>
      <div class="summary-grid">
        <div><span>${state.pantryItems.length}</span><small>${t(state.language, "totalItems")}</small></div>
        <div><span>${state.alerts.length}</span><small>${t(state.language, "expiringItems")}</small></div>
        <div><span>${openedCount}</span><small>${t(state.language, "openedItems")}</small></div>
      </div>
    </section>
  `;
}

function renderInventoryTab() {
  const groupedZoneItems = getGroupedZoneItems();
  const currentZone = FRIDGE_ZONES.find((zone) => zone.id === state.selectedZoneId) ?? FRIDGE_ZONES[0];
  const zoneItems = getZoneItems(state, currentZone.id);

  return `
    ${renderInventorySummary()}
    ${renderFridgeCanvas({
      language: state.language,
      zoneSummaries: state.zoneSummaries,
      selectedZoneId: state.selectedZoneId,
      highlightedZoneId: state.highlightedZoneId,
      groupedZoneItems,
      alerts: state.alerts,
      resolveEmoji: resolveIngredientEmoji,
      catalogMap: state.catalogMap
    })}
    <p class="zone-hint">${t(state.language, "drawerZoneHint")}</p>
    ${renderIngredientDrawer({
      language: state.language,
      items: zoneItems,
      alerts: state.alerts,
      catalogMap: state.catalogMap,
      resolveEmoji: resolveIngredientEmoji,
      title: `${t(state.language, "drawerTitle")} · ${getZoneLabel(currentZone, state.language)}`
    })}
    <button type="button" class="fab" id="open-add-modal">${t(state.language, "addIngredient")}</button>
  `;
}

function renderShoppingTab() {
  const purchasedCount = state.shoppingItems.filter((item) => item.checked).length;

  const shoppingRows = state.shoppingItems
    .map(
      (item) => `
        <li class="shopping-row ${item.checked ? "purchased" : ""}">
          <label class="shopping-check">
            <input
              type="checkbox"
              data-action="toggle-purchased"
              data-ingredient-key="${item.ingredientKey}"
              ${item.checked ? "checked" : ""}
            >
            <span>${item.checked ? t(state.language, "purchasedStatus") : t(state.language, "markPurchased")}</span>
          </label>
          <span class="shopping-name">${safeHtml(item.displayName)}</span>
          <span>${item.neededQty} ${item.unit}</span>
          <small>${safeHtml(item.suggestedPackage ?? "")}</small>
        </li>
      `
    )
    .join("");

  return `
    <section class="content-card">
      <div class="section-head">
        <h3>${t(state.language, "shoppingTitle")}</h3>
        <span>${purchasedCount}/${state.shoppingItems.length}</span>
      </div>
      <ul class="shopping-list">
        ${shoppingRows || `<li class="empty-tip">${t(state.language, "shoppingEmpty")}</li>`}
      </ul>
      <p class="shopping-hint">${t(state.language, "syncPurchasedHint")}</p>
      <button
        type="button"
        class="primary-btn shopping-sync-btn"
        data-action="sync-purchased"
        ${purchasedCount === 0 ? "disabled" : ""}
      >
        ${t(state.language, "syncPurchased")}
      </button>
    </section>
  `;
}

function renderAuthPage() {
  const mode = state.authMode;
  const isRegister = mode === "register";
  const actionLabel = isRegister ? t(state.language, "registerAction") : t(state.language, "loginAction");

  return `
    <main class="auth-page">
      <section class="auth-card">
        <h2>${t(state.language, "authTitle")}</h2>
        <p>${t(state.language, "authSubtitle")}</p>

        <div class="auth-tabs">
          <button type="button" data-auth-mode="login" class="${mode === "login" ? "active" : ""}">
            ${t(state.language, "authLoginTab")}
          </button>
          <button type="button" data-auth-mode="register" class="${mode === "register" ? "active" : ""}">
            ${t(state.language, "authRegisterTab")}
          </button>
        </div>

        <form id="auth-form" class="auth-form">
          <label>
            ${t(state.language, "email")}
            <input id="auth-email" type="email" required value="${safeHtml(state.authDraft.email || "")}">
          </label>
          <label>
            ${t(state.language, "password")}
            <input id="auth-password" type="password" minlength="8" required value="${safeHtml(state.authDraft.password || "")}">
          </label>
          ${isRegister
            ? `<label>
                ${t(state.language, "displayName")}
                <input id="auth-display-name" type="text" required value="${safeHtml(state.authDraft.displayName || "")}">
              </label>`
            : ""}
          <small>${t(state.language, "authPasswordHint")}</small>
          <button type="submit" class="primary-btn" ${state.authLoading ? "disabled" : ""}>
            ${state.authLoading ? `${t(state.language, "loading")}` : actionLabel}
          </button>
        </form>
      </section>
    </main>
  `;
}

function renderMainPage() {
  let body = "";
  if (state.loading) {
    body = `<section class="content-card"><p>${t(state.language, "loading")}</p></section>`;
  } else if (state.activeTab === "home") {
    body = renderHomeTab();
  } else if (state.activeTab === "inventory") {
    body = renderInventoryTab();
  } else {
    body = renderShoppingTab();
  }

  return `
    <main class="page-content">${body}</main>
    <nav class="tab-bar">
      <button type="button" data-tab="home" class="${state.activeTab === "home" ? "active" : ""}">${t(state.language, "tabHome")}</button>
      <button type="button" data-tab="inventory" class="${state.activeTab === "inventory" ? "active" : ""}">${t(state.language, "tabInventory")}</button>
      <button type="button" data-tab="list" class="${state.activeTab === "list" ? "active" : ""}">${t(state.language, "tabList")}</button>
    </nav>
  `;
}

function renderFixedSection() {
  return `
    <div class="setting-field">
      <label>${t(state.language, "language")}</label>
      ${renderLocaleSwitch(state.language)}
    </div>
    <div class="setting-field">
      <label>${t(state.language, "market")}</label>
      <select id="profile-market">
        <option value="NZ" ${state.market === "NZ" ? "selected" : ""}>NZ</option>
        <option value="AU" ${state.market === "AU" ? "selected" : ""}>AU</option>
      </select>
    </div>
    <div class="setting-field">
      <label>${t(state.language, "timezone")}</label>
      ${renderTimezonePicker(state.timezone)}
    </div>
    <div class="setting-field">
      <label>${t(state.language, "maxCookMinutes")}</label>
      <input id="profile-max-cook" type="range" min="10" max="60" value="${state.profile?.maxCookMinutes ?? 30}">
      <small id="profile-max-cook-value">${state.profile?.maxCookMinutes ?? 30} ${t(state.language, "minutes")}</small>
    </div>
  `;
}

function renderSettingsPage() {
  const dynamicFields = getVisibleDynamicFields(state.settingsSchema, state.settingsValues);
  const grouped = new Map();

  for (const field of dynamicFields) {
    if (!grouped.has(field.section)) {
      grouped.set(field.section, []);
    }
    grouped.get(field.section).push(renderDynamicSettingField(field, state.settingsValues[field.key], state.language));
  }

  const sectionCards = [];
  sectionCards.push(
    renderSettingSectionCard({
      title: t(state.language, "languageRegion"),
      body: renderFixedSection()
    })
  );

  for (const section of state.settingsSchema?.sections ?? []) {
    if (section.key === "language_region") {
      continue;
    }

    const body = (grouped.get(section.key) ?? []).join("");
    sectionCards.push(
      renderSettingSectionCard({
        title: t(state.language, SECTION_LABEL_KEYS[section.key]),
        body: body || `<p class="empty-tip">-</p>`
      })
    );
  }

  return `
    <main class="page-content settings-page">
      ${sectionCards.join("")}
      <div class="settings-actions">
        <button type="button" class="primary-btn" id="save-settings">${t(state.language, "save")}</button>
        <button type="button" class="ghost-btn" id="logout-btn">${t(state.language, "logout")}</button>
      </div>
    </main>
  `;
}

function renderAddModal() {
  ensureAddDraftReady();
  const categoryOptions = getCategoryOptions();
  const filteredIngredients = getFilteredCatalogItems(state.addDraft.category);
  const selectedIngredient = state.catalogMap.get(state.addDraft.ingredientKey);
  const unitOptions = Array.from(
    new Set([
      state.addDraft.unit,
      ...(selectedIngredient?.typicalUnits ?? []),
      ...ALL_UNITS
    ])
  );

  const categoryButtons = categoryOptions
    .map((category) => {
      const active = state.addDraft.category === category ? "active" : "";
      return `
        <button
          type="button"
          class="category-chip ${active}"
          data-action="set-add-category"
          data-category="${category}"
        >
          ${getCategoryLabel(category)}
        </button>
      `;
    })
    .join("");

  const ingredientOptions = filteredIngredients
    .map((item) => {
      const selected = item.ingredientKey === state.addDraft.ingredientKey ? "selected" : "";
      const emoji = resolveIngredientEmoji(item.ingredientKey, item.category);
      return `
        <option value="${item.ingredientKey}" ${selected}>
          ${emoji} ${item.nameZh} / ${item.nameEn}
        </option>
      `;
    })
    .join("");

  const ingredientDisplay =
    selectedIngredient && state.addDraft.ingredientKey
      ? `${resolveIngredientEmoji(selectedIngredient.ingredientKey, selectedIngredient.category)} ${selectedIngredient.nameZh} / ${selectedIngredient.nameEn}`
      : "-";

  const quantityValue = Number(state.addDraft.quantity) > 0 ? state.addDraft.quantity : 1;
  const recentItems = getRecentCatalogItems();
  const quickItems = getQuickCatalogItems();

  const recentChips =
    recentItems.length === 0
      ? `<p class="quick-empty">${t(state.language, "noRecent")}</p>`
      : recentItems
          .map((item) => {
            const emoji = resolveIngredientEmoji(item.ingredientKey, item.category);
            const active = state.addDraft.ingredientKey === item.ingredientKey ? "active" : "";
            return `
              <button
                type="button"
                class="fast-chip ${active}"
                data-action="pick-ingredient-fast"
                data-ingredient-key="${item.ingredientKey}"
                data-ingredient-category="${item.category}"
              >
                ${emoji} ${state.language === "en-NZ" ? item.nameEn : item.nameZh}
              </button>
            `;
          })
          .join("");

  const quickChips = quickItems
    .map((item) => {
      const emoji = resolveIngredientEmoji(item.ingredientKey, item.category);
      const active = state.addDraft.ingredientKey === item.ingredientKey ? "active" : "";
      return `
        <button
          type="button"
          class="fast-chip ${active}"
          data-action="pick-ingredient-fast"
          data-ingredient-key="${item.ingredientKey}"
          data-ingredient-category="${item.category}"
        >
          ${emoji} ${state.language === "en-NZ" ? item.nameEn : item.nameZh}
        </button>
      `;
    })
    .join("");

  return `
    <div class="modal ${state.isAddModalOpen ? "open" : ""}" id="add-modal">
      <div class="modal-panel">
        <div class="modal-head">
          <h3>${t(state.language, "addModalTitle")}</h3>
          <button type="button" data-action="close-add-modal">${t(state.language, "close")}</button>
        </div>
        <form id="add-ingredient-form" class="modal-form">
          <section class="fast-picks">
            <h4>${t(state.language, "recentAdded")}</h4>
            <div class="fast-chip-row">${recentChips}</div>
          </section>

          <section class="fast-picks">
            <h4>${t(state.language, "quickPick")}</h4>
            <div class="fast-chip-row">${quickChips}</div>
          </section>

          <label>${t(state.language, "ingredientCategory")}</label>
          <div class="category-row">${categoryButtons}</div>

          <label>${t(state.language, "ingredientSearch")}
            <input
              id="add-ingredient-search"
              type="text"
              placeholder="${t(state.language, "ingredientSearch")}"
              value="${safeHtml(state.addDraft.keyword || "")}"
            >
          </label>

          <label>${t(state.language, "chooseIngredient")}
            <select id="add-ingredient-select" ${filteredIngredients.length === 0 ? "disabled" : ""}>
              ${ingredientOptions || "<option value=''>-</option>"}
            </select>
          </label>

          <p class="add-ingredient-preview">${ingredientDisplay}</p>
          <p class="add-hint">${t(state.language, "autoFillHint")}</p>

          <div class="qty-row">
            <label>${t(state.language, "quantity")}
              <div class="qty-stepper">
                <button type="button" data-action="decrease-add-qty">-</button>
                <input id="add-qty-input" type="number" min="0.1" step="0.1" value="${quantityValue}" required>
                <button type="button" data-action="increase-add-qty">+</button>
              </div>
            </label>
            <label>${t(state.language, "unit")}
              <select id="add-unit-select">
                ${unitOptions
                  .map((unit) => `<option value="${unit}" ${state.addDraft.unit === unit ? "selected" : ""}>${unit}</option>`)
                  .join("")}
              </select>
            </label>
          </div>

          <label>${t(state.language, "storageType")}
            <select id="add-storage-select">
              <option value="fridge" ${state.addDraft.storageType === "fridge" ? "selected" : ""}>fridge</option>
              <option value="freezer" ${state.addDraft.storageType === "freezer" ? "selected" : ""}>freezer</option>
              <option value="pantry" ${state.addDraft.storageType === "pantry" ? "selected" : ""}>pantry</option>
            </select>
          </label>
          <label>${t(state.language, "expiryDate")}<input id="add-expiry-input" type="date" value="${state.addDraft.expiresAt || ""}"></label>
          <label>${t(state.language, "openedAt")}<input id="add-opened-input" type="date" value="${state.addDraft.openedAt || ""}"></label>
          <button type="submit" class="primary-btn">${t(state.language, "save")}</button>
        </form>
      </div>
    </div>
  `;
}

function renderRecipeModal() {
  if (!state.activeRecipe) {
    return "";
  }

  const steps = state.activeRecipe.recipe.steps
    .map((step, index) => `<li>${index + 1}. ${safeHtml(step)}</li>`)
    .join("");
  const hints = (state.activeRecipe.aiAssist?.substitutionHints ?? [])
    .map((hint) => `<li>${safeHtml(hint)}</li>`)
    .join("");

  return `
    <div class="modal open" id="recipe-modal">
      <div class="modal-panel recipe-panel">
        <div class="modal-head">
          <h3>${safeHtml(state.activeRecipe.recipe.title)}</h3>
          <button type="button" data-action="close-recipe-modal">${t(state.language, "close")}</button>
        </div>
        <p>${t(state.language, "cookMinutes")}: ${state.activeRecipe.recipe.cookMinutes} ${t(state.language, "minutes")}</p>
        <ol class="steps-list">${steps}</ol>
        <h4>AI substitution</h4>
        <ul>${hints || "<li>-</li>"}</ul>
      </div>
    </div>
  `;
}

function renderOnboarding() {
  if (!state.showOnboarding) {
    return "";
  }

  return `
    <div class="modal open" id="onboarding-modal">
      <div class="modal-panel recipe-panel">
        <div class="modal-head">
          <h3>${t(state.language, "onboardingTitle")}</h3>
        </div>
        <ul class="onboarding-list">
          <li>${t(state.language, "onboardingLine1")}</li>
          <li>${t(state.language, "onboardingLine2")}</li>
          <li>${t(state.language, "onboardingLine3")}</li>
        </ul>
        <button type="button" class="primary-btn" data-action="start-onboarding">${t(state.language, "onboardingStart")}</button>
      </div>
    </div>
  `;
}

function render() {
  if (!appRoot) {
    return;
  }

  const errorLine = state.error ? `<div class="error-banner">${safeHtml(state.error)}</div>` : "";

  if (!state.isAuthenticated) {
    appRoot.innerHTML = `
      <div class="app-shell auth-shell">
        ${errorLine}
        ${renderAuthPage()}
      </div>
    `;
    bindEvents();
    return;
  }

  const pageBody = state.page === "settings" ? renderSettingsPage() : renderMainPage();

  appRoot.innerHTML = `
    <div class="app-shell">
      ${renderKitchenHeader(state.language, state.page, state.authUser)}
      ${errorLine}
      ${pageBody}
      ${renderAddModal()}
      ${renderRecipeModal()}
      ${renderOnboarding()}
    </div>
  `;

  bindEvents();
}

function bindEvents() {
  const authModeButtons = appRoot.querySelectorAll("[data-auth-mode]");
  for (const button of authModeButtons) {
    button.addEventListener("click", () => {
      const nextMode = button.dataset.authMode;
      if (!nextMode) {
        return;
      }
      state.authMode = nextMode;
      state.error = null;
      render();
    });
  }

  const authForm = appRoot.querySelector("#auth-form");
  if (authForm) {
    authForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      await handleAuthSubmit();
      render();
    });
  }

  const tabButtons = appRoot.querySelectorAll("[data-tab]");
  for (const button of tabButtons) {
    button.addEventListener("click", () => {
      state.activeTab = button.dataset.tab;
      state.highlightedZoneId = null;
      render();
    });
  }

  const openSettings = appRoot.querySelector("#open-settings");
  if (openSettings) {
    openSettings.addEventListener("click", () => {
      state.page = "settings";
      render();
    });
  }

  const backMain = appRoot.querySelector("#back-main");
  if (backMain) {
    backMain.addEventListener("click", () => {
      state.page = "main";
      render();
    });
  }

  const zoneButtons = appRoot.querySelectorAll("[data-zone-id]");
  for (const button of zoneButtons) {
    button.addEventListener("click", () => {
      const zoneId = button.dataset.zoneId;
      if (!zoneId) {
        return;
      }
      state.selectedZoneId = zoneId;
      state.activeTab = "inventory";
      state.page = "main";
      state.highlightedZoneId = zoneId;
      render();
    });
  }

  const jumpButtons = appRoot.querySelectorAll('[data-action="jump-zone"]');
  for (const button of jumpButtons) {
    button.addEventListener("click", () => {
      const zoneId = button.dataset.zoneId;
      if (!zoneId) {
        return;
      }
      state.activeTab = "inventory";
      state.page = "main";
      state.selectedZoneId = zoneId;
      state.highlightedZoneId = zoneId;
      render();
    });
  }

  const openAddModal = appRoot.querySelector("#open-add-modal");
  if (openAddModal) {
    openAddModal.addEventListener("click", () => {
      ensureAddDraftReady();
      state.isAddModalOpen = true;
      render();
    });
  }

  const closeAddModal = appRoot.querySelector('[data-action="close-add-modal"]');
  if (closeAddModal) {
    closeAddModal.addEventListener("click", () => {
      state.isAddModalOpen = false;
      render();
    });
  }

  const addForm = appRoot.querySelector("#add-ingredient-form");
  if (addForm) {
    addForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const selectedIngredient = state.catalogMap.get(state.addDraft.ingredientKey);
      if (!selectedIngredient) {
        state.error = t(state.language, "ingredientRequired");
        render();
        return;
      }
      try {
        state.error = null;
        await api.addPantryItem(state.market, {
          userId: state.userId,
          name: selectedIngredient.nameZh,
          quantity: Number(state.addDraft.quantity),
          unit: state.addDraft.unit,
          storageType: state.addDraft.storageType,
          expiresAt: toIsoDate(state.addDraft.expiresAt) ?? undefined,
          openedAt: toIsoDate(state.addDraft.openedAt) ?? undefined
        });
        recordRecentIngredient(selectedIngredient.ingredientKey);
        state.isAddModalOpen = false;
        await syncAfterPantryMutation();
      } catch (error) {
        state.error = error instanceof Error ? error.message : "Failed to add";
      }
      render();
    });
  }

  const addCategoryButtons = appRoot.querySelectorAll('[data-action="set-add-category"]');
  for (const button of addCategoryButtons) {
    button.addEventListener("click", () => {
      const category = button.dataset.category;
      if (!category) {
        return;
      }

      state.addDraft.category = category;
      const filtered = getFilteredCatalogItems(category);
      if (filtered.length > 0) {
        applyIngredientDefaults(filtered[0].ingredientKey);
      }
      render();
    });
  }

  const ingredientSelect = appRoot.querySelector("#add-ingredient-select");
  if (ingredientSelect) {
    ingredientSelect.addEventListener("change", () => {
      if (!ingredientSelect.value) {
        return;
      }
      applyIngredientDefaults(ingredientSelect.value);
      render();
    });
  }

  const ingredientSearch = appRoot.querySelector("#add-ingredient-search");
  if (ingredientSearch) {
    ingredientSearch.addEventListener("input", () => {
      const cursor = ingredientSearch.selectionStart ?? ingredientSearch.value.length;
      state.addDraft.keyword = ingredientSearch.value;
      const filtered = getFilteredCatalogItems(state.addDraft.category);
      if (filtered.length > 0) {
        applyIngredientDefaults(filtered[0].ingredientKey);
      } else {
        state.addDraft.ingredientKey = "";
      }
      render();

      const nextSearch = appRoot.querySelector("#add-ingredient-search");
      if (nextSearch) {
        nextSearch.focus();
        nextSearch.setSelectionRange(cursor, cursor);
      }
    });
  }

  const addQtyInput = appRoot.querySelector("#add-qty-input");
  if (addQtyInput) {
    addQtyInput.addEventListener("input", () => {
      const value = Number(addQtyInput.value);
      state.addDraft.quantity = Number.isFinite(value) && value > 0 ? value : 0.1;
    });
  }

  const addUnitSelect = appRoot.querySelector("#add-unit-select");
  if (addUnitSelect) {
    addUnitSelect.addEventListener("change", () => {
      state.addDraft.unit = addUnitSelect.value;
    });
  }

  const addStorageSelect = appRoot.querySelector("#add-storage-select");
  if (addStorageSelect) {
    addStorageSelect.addEventListener("change", () => {
      state.addDraft.storageType = addStorageSelect.value;
    });
  }

  const addExpiryInput = appRoot.querySelector("#add-expiry-input");
  if (addExpiryInput) {
    addExpiryInput.addEventListener("change", () => {
      state.addDraft.expiresAt = addExpiryInput.value;
    });
  }

  const addOpenedInput = appRoot.querySelector("#add-opened-input");
  if (addOpenedInput) {
    addOpenedInput.addEventListener("change", () => {
      state.addDraft.openedAt = addOpenedInput.value;
    });
  }

  const drawerActions = appRoot.querySelectorAll("[data-action]");
  for (const actionButton of drawerActions) {
    const action = actionButton.dataset.action;
    const itemId = actionButton.dataset.itemId;

    if (action === "pick-ingredient-fast") {
      actionButton.addEventListener("click", () => {
        const ingredientKey = actionButton.dataset.ingredientKey;
        const category = actionButton.dataset.ingredientCategory;
        if (!ingredientKey) {
          return;
        }

        state.addDraft.keyword = "";
        if (category) {
          state.addDraft.category = category;
        }
        applyIngredientDefaults(ingredientKey);
        render();
      });
    }

    if (action === "toggle-purchased") {
      actionButton.addEventListener("change", () => {
        const ingredientKey = actionButton.dataset.ingredientKey;
        if (!ingredientKey) {
          return;
        }

        const target = state.shoppingItems.find((item) => item.ingredientKey === ingredientKey);
        if (!target) {
          return;
        }

        target.checked = Boolean(actionButton.checked);
        render();
      });
    }

    if (action === "sync-purchased") {
      actionButton.addEventListener("click", async () => {
        await syncPurchasedToPantry();
        render();
      });
    }

    if (action === "decrease-add-qty") {
      actionButton.addEventListener("click", () => {
        state.addDraft.quantity = Math.max(0.1, Number(state.addDraft.quantity || 1) - 0.5);
        render();
      });
    }

    if (action === "increase-add-qty") {
      actionButton.addEventListener("click", () => {
        state.addDraft.quantity = Number(state.addDraft.quantity || 1) + 0.5;
        render();
      });
    }

    if (action === "update-item" && itemId) {
      actionButton.addEventListener("click", async () => {
        const itemNode = appRoot.querySelector(`[data-item-id="${itemId}"]`);
        const qtyInput = itemNode?.querySelector(".drawer-qty");
        const expiryInput = itemNode?.querySelector(".drawer-expiry");

        if (!qtyInput || !expiryInput) {
          return;
        }

        try {
          state.error = null;
          await api.patchPantryItem(state.userId, itemId, {
            quantity: Number(qtyInput.value),
            expiresAt: toIsoDate(expiryInput.value)
          });
          await syncAfterPantryMutation();
        } catch (error) {
          state.error = error instanceof Error ? error.message : "Failed to update";
        }

        render();
      });
    }

    if (action === "mark-used" && itemId) {
      actionButton.addEventListener("click", async () => {
        try {
          state.error = null;
          await api.deletePantryItem(state.userId, itemId);
          await syncAfterPantryMutation();
        } catch (error) {
          state.error = error instanceof Error ? error.message : "Failed to update";
        }
        render();
      });
    }

    if (action === "add-list" && itemId) {
      actionButton.addEventListener("click", () => {
        const item = state.pantryItems.find((entry) => entry.id === itemId);
        if (!item) {
          return;
        }

        const existing = state.shoppingItems.find((entry) => entry.ingredientKey === item.ingredientKey);
        if (existing) {
          existing.neededQty += 1;
        } else {
          state.shoppingItems.push({
            ingredientKey: item.ingredientKey,
            displayName: `${item.nameZh}/${item.nameEn}`,
            neededQty: 1,
            unit: item.unit,
            sourceRecipeIds: [],
            storeType: "local",
            suggestedPackage: "",
            checked: false
          });
        }

        state.activeTab = "list";
        render();
      });
    }

    if (action === "generate-shopping") {
      const recipeId = actionButton.dataset.recipeId;
      if (!recipeId) {
        continue;
      }
      actionButton.addEventListener("click", async () => {
        try {
          state.error = null;
          const result = await api.buildShoppingList({
            userId: state.userId,
            market: state.market,
            recipeIds: [recipeId]
          });

          mergeShoppingItems(result.items);
          state.activeTab = "list";
        } catch (error) {
          state.error = error instanceof Error ? error.message : "Failed to generate list";
        }

        render();
      });
    }

    if (action === "recipe-details") {
      const recipeId = actionButton.dataset.recipeId;
      if (!recipeId) {
        continue;
      }
      actionButton.addEventListener("click", async () => {
        try {
          state.error = null;
          state.activeRecipe = await api.getRecipeDetails(recipeId, state.market);
        } catch (error) {
          state.error = error instanceof Error ? error.message : "Failed to load recipe";
        }
        render();
      });
    }

    if (action === "close-recipe-modal") {
      actionButton.addEventListener("click", () => {
        state.activeRecipe = null;
        render();
      });
    }

    if (action === "start-onboarding") {
      actionButton.addEventListener("click", () => {
        state.showOnboarding = false;
        try {
          window.localStorage.setItem("lzbx_onboarding_seen", "1");
        } catch {
          // Ignore localStorage errors in private mode.
        }
        render();
      });
    }
  }

  const saveSettings = appRoot.querySelector("#save-settings");
  if (saveSettings) {
    saveSettings.addEventListener("click", async () => {
      await handleSaveSettings();
      render();
    });
  }

  const logoutButton = appRoot.querySelector("#logout-btn");
  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      await handleLogout();
      render();
    });
  }

  const localeButtons = appRoot.querySelectorAll("[data-language]");
  for (const button of localeButtons) {
    button.addEventListener("click", () => {
      const language = button.dataset.language;
      if (!language) {
        return;
      }
      state.language = language;
      render();
    });
  }

  const maxCookInput = appRoot.querySelector("#profile-max-cook");
  const maxCookText = appRoot.querySelector("#profile-max-cook-value");
  if (maxCookInput && maxCookText) {
    maxCookInput.addEventListener("input", () => {
      maxCookText.textContent = `${maxCookInput.value} ${t(state.language, "minutes")}`;
    });
  }

  const dynamicInputs = appRoot.querySelectorAll("[data-field-key]");
  for (const input of dynamicInputs) {
    input.addEventListener("change", () => {
      const fieldKey = input.dataset.fieldKey;
      if (!fieldKey) {
        return;
      }

      if (input.dataset.multiOption) {
        const selected = appRoot.querySelectorAll(
          `[data-field-key=\"${fieldKey}\"][data-multi-option]`
        );
        state.settingsValues[fieldKey] = Array.from(selected)
          .filter((entry) => entry.checked)
          .map((entry) => entry.dataset.multiOption);
      } else if (input.type === "checkbox") {
        state.settingsValues[fieldKey] = Boolean(input.checked);
      } else if (input.type === "number") {
        state.settingsValues[fieldKey] = Number(input.value);
      } else {
        state.settingsValues[fieldKey] = input.value;
      }

      if (state.page === "settings") {
        render();
      }
    });
  }
}

function mergeShoppingItems(items) {
  for (const incoming of items) {
    const existing = state.shoppingItems.find((item) => item.ingredientKey === incoming.ingredientKey);
    if (existing) {
      existing.neededQty += incoming.neededQty;
      existing.sourceRecipeIds = Array.from(new Set([...existing.sourceRecipeIds, ...incoming.sourceRecipeIds]));
      existing.suggestedPackage = incoming.suggestedPackage;
    } else {
      state.shoppingItems.push(incoming);
    }
  }
}

async function initializeAfterAuth() {
  await Promise.all([refreshPantryContext(), refreshSettingsContext()]);
  ensureAddDraftReady();
  await refreshRecommendations();
}

async function handleAuthSubmit() {
  const emailInput = appRoot.querySelector("#auth-email");
  const passwordInput = appRoot.querySelector("#auth-password");
  const displayNameInput = appRoot.querySelector("#auth-display-name");

  const email = String(emailInput?.value ?? "").trim().toLowerCase();
  const password = String(passwordInput?.value ?? "");
  const displayName = String(displayNameInput?.value ?? "").trim();

  state.authDraft.email = email;
  state.authDraft.password = password;
  state.authDraft.displayName = displayName;

  if (!email || !password) {
    state.error = `${t(state.language, "email")} / ${t(state.language, "password")} ${t(state.language, "fieldRequired")}`;
    return;
  }

  if (state.authMode === "register" && !displayName) {
    state.error = `${t(state.language, "displayName")} ${t(state.language, "fieldRequired")}`;
    return;
  }

  state.authLoading = true;
  state.error = null;

  try {
    const payload =
      state.authMode === "register"
        ? await api.register({
            email,
            password,
            displayName,
            market: state.market,
            timezone: state.timezone
          })
        : await api.login(
            {
              email,
              password
            },
            state.market,
            state.timezone
          );

    state.authToken = payload.token;
    setAuthToken(payload.token);
    persistAuthToken(payload.token);
    state.isAuthenticated = true;
    state.authUser = payload.user;
    state.userId = payload.user.id;
    state.profile = payload.profile;
    state.market = payload.profile.primaryMarket;
    state.timezone = payload.profile.timezone;
    state.language = payload.profile.language;
    state.page = "main";
    state.activeTab = "home";
    state.authDraft.password = "";

    await initializeAfterAuth();
  } catch (error) {
    state.error = error instanceof Error ? error.message : "Failed to authenticate";
  } finally {
    state.authLoading = false;
  }
}

async function handleLogout() {
  try {
    state.error = null;
    if (state.authToken) {
      await api.logout();
    }
  } catch {
    // Ignore logout failures and clear local session anyway.
  } finally {
    clearAuthState();
    state.page = "main";
    state.activeTab = "home";
    state.pantryItems = [];
    state.alerts = [];
    state.priorityItems = [];
    state.shoppingItems = [];
    state.recommendations = {
      full: [],
      partial: [],
      expiryFirst: []
    };
  }
}

async function syncPurchasedToPantry() {
  const purchasedItems = state.shoppingItems.filter((item) => item.checked);
  if (purchasedItems.length === 0) {
    return;
  }

  try {
    state.error = null;

    for (const item of purchasedItems) {
      const catalog = state.catalogMap.get(item.ingredientKey);
      const fallbackName = String(item.displayName).split("/")[0].trim();
      const name = catalog?.nameZh ?? fallbackName ?? item.ingredientKey;
      const quantity = Number(item.neededQty) > 0 ? Number(item.neededQty) : 1;
      const storageType = catalog?.storageType ?? "pantry";

      await api.addPantryItem(state.market, {
        userId: state.userId,
        name,
        quantity,
        unit: item.unit,
        storageType
      });
      recordRecentIngredient(item.ingredientKey);
    }

    state.shoppingItems = state.shoppingItems.filter((item) => !item.checked);
    await syncAfterPantryMutation();
  } catch (error) {
    state.error = error instanceof Error ? error.message : "Failed to sync purchased items";
  }
}

function collectDynamicSettingsValues() {
  const values = {};
  const visibleFields = getVisibleDynamicFields(state.settingsSchema, state.settingsValues);

  for (const field of visibleFields) {
    if (field.type === "multi_select") {
      const options = appRoot.querySelectorAll(
        `[data-field-key="${field.key}"][data-multi-option]`
      );
      values[field.key] = Array.from(options)
        .filter((input) => input.checked)
        .map((input) => input.dataset.multiOption);
      continue;
    }

    const input = appRoot.querySelector(`[data-field-key="${field.key}"]`);
    if (!input) {
      continue;
    }

    if (field.type === "boolean") {
      values[field.key] = Boolean(input.checked);
    } else if (field.type === "number") {
      values[field.key] = Number(input.value || field.default || 0);
    } else {
      values[field.key] = input.value;
    }
  }

  return values;
}

async function handleSaveSettings() {
  try {
    state.error = null;

    const marketSelect = appRoot.querySelector("#profile-market");
    const timezoneSelect = appRoot.querySelector("#profile-timezone");
    const maxCookInput = appRoot.querySelector("#profile-max-cook");

    const nextMarket = marketSelect?.value ?? state.market;
    const nextTimezone = timezoneSelect?.value ?? state.timezone;
    const nextMaxCook = Number(maxCookInput?.value ?? state.profile?.maxCookMinutes ?? 30);

    const updatedProfile = await api.updateProfile(
      {
        userId: state.userId,
        primaryMarket: nextMarket,
        timezone: nextTimezone,
        language: state.language,
        maxCookMinutes: nextMaxCook
      },
      nextMarket
    );

    const dynamicValues = collectDynamicSettingsValues();
    const updatedSettings = await api.updateUserSettings({
      userId: state.userId,
      values: dynamicValues
    });

    state.profile = updatedProfile;
    state.market = updatedProfile.primaryMarket;
    state.timezone = updatedProfile.timezone;
    state.language = updatedProfile.language;
    state.settingsValues = updatedSettings.values;

    await refreshPantryContext();
    await refreshRecommendations();
    state.page = "main";
  } catch (error) {
    state.error = error instanceof Error ? error.message : "Failed to save settings";
  }
}

async function refreshPantryContext() {
  const [pantryItems, catalogResp, alertResp] = await Promise.all([
    api.getPantryItems(state.userId),
    api.getIngredientCatalog(state.market),
    api.getExpiryAlerts({
      userId: state.userId,
      market: state.market,
      timezone: state.timezone
    })
  ]);

  state.pantryItems = pantryItems;
  state.catalogItems = catalogResp.items;
  state.catalogMap = buildCatalogMap(state.catalogItems);
  state.alerts = alertResp.alerts;
  state.priorityItems = alertResp.priorityItems;
  state.zoneSummaries = computeZoneSummaries(state.pantryItems, state.catalogMap, state.alerts);

  if (!state.selectedZoneId) {
    state.selectedZoneId = FRIDGE_ZONES[0].id;
  }

  const currentZoneItems = getZoneItems(state, state.selectedZoneId);
  if (currentZoneItems.length === 0) {
    const firstAvailableZone = FRIDGE_ZONES.find((zone) => getZoneItems(state, zone.id).length > 0);
    if (firstAvailableZone) {
      state.selectedZoneId = firstAvailableZone.id;
    }
  }

  ensureAddDraftReady();
}

async function refreshRecommendations(forceServerProfile = false) {
  const payload = {
    userId: state.userId,
    market: state.market,
    timezone: state.timezone
  };

  if (!forceServerProfile && state.profile) {
    payload.userProfile = state.profile;
  }

  const result = await api.getDinnerRecommendations(payload);

  state.recommendations = {
    full: result.full,
    partial: result.partial,
    expiryFirst: result.expiryFirst
  };
  state.profile = result.profile;
}

async function syncAfterPantryMutation() {
  await refreshPantryContext();
  await refreshRecommendations(true);
}

async function refreshSettingsContext() {
  const [settingsSchema, settingsValuesResp] = await Promise.all([
    api.getSettingsSchema(),
    api.getUserSettings(state.userId)
  ]);

  state.settingsSchema = settingsSchema;
  state.settingsValues = settingsValuesResp.values;
}

async function bootstrap() {
  state.loading = Boolean(state.authToken);
  render();

  try {
    state.error = null;
    if (!state.authToken) {
      clearAuthState();
      return;
    }

    const me = await api.getAuthMe({
      market: state.market,
      timezone: state.timezone
    });
    state.isAuthenticated = true;
    state.authUser = me.user;
    state.userId = me.user.id;
    state.profile = me.profile;
    state.language = me.profile.language;
    state.market = me.profile.primaryMarket;
    state.timezone = me.profile.timezone;

    await initializeAfterAuth();
  } catch (error) {
    clearAuthState();
    state.error = error instanceof Error ? error.message : "Failed to load app";
  } finally {
    state.loading = false;
    render();
  }
}

void bootstrap();
