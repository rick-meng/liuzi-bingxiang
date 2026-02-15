import { FRIDGE_ZONES, resolveZoneId } from "./fridgeZones.js";

export function createInitialState() {
  return {
    userId: "demo_user_1",
    activeTab: "home",
    page: "main",
    highlightedZoneId: null,
    selectedZoneId: "fridge_top",
    market: "NZ",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Pacific/Auckland",
    profile: null,
    language: "zh-CN",
    pantryItems: [],
    catalogItems: [],
    catalogMap: new Map(),
    zoneSummaries: {},
    alerts: [],
    priorityItems: [],
    recommendations: {
      full: [],
      partial: [],
      expiryFirst: []
    },
    shoppingItems: [],
    settingsSchema: null,
    settingsValues: {},
    showOnboarding: true,
    addDraft: {
      category: "all",
      keyword: "",
      ingredientKey: "",
      quantity: 1,
      unit: "piece",
      storageType: "fridge",
      expiresAt: "",
      openedAt: ""
    },
    recentIngredientKeys: [],
    loading: false,
    isAddModalOpen: false,
    activeRecipe: null,
    error: null
  };
}

export function buildCatalogMap(catalogItems) {
  return new Map(catalogItems.map((item) => [item.ingredientKey, item]));
}

function findExpiringItemIds(alerts) {
  return new Set(alerts.map((item) => item.itemId));
}

export function computeZoneSummaries(pantryItems, catalogMap, alerts) {
  const expiringIds = findExpiringItemIds(alerts);
  const base = Object.fromEntries(
    FRIDGE_ZONES.map((zone) => [
      zone.id,
      {
        zoneId: zone.id,
        itemCount: 0,
        expiringCount: 0
      }
    ])
  );

  for (const item of pantryItems) {
    const zoneId = resolveZoneId(item, catalogMap);
    if (!base[zoneId]) {
      continue;
    }

    base[zoneId].itemCount += 1;
    if (expiringIds.has(item.id)) {
      base[zoneId].expiringCount += 1;
    }
  }

  return base;
}

export function sortItemsByExpiry(items) {
  return [...items].sort((left, right) => {
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

export function getZoneItems(state, zoneId) {
  const items = state.pantryItems.filter(
    (item) => resolveZoneId(item, state.catalogMap) === zoneId
  );
  return sortItemsByExpiry(items);
}

export function isExpiring(itemId, alerts) {
  return alerts.some((item) => item.itemId === itemId);
}

export function getVisibleDynamicFields(schema, values) {
  if (!schema) {
    return [];
  }

  return schema.fields.filter((field) => {
    if (!field.visibleWhen) {
      return true;
    }
    return values[field.visibleWhen.key] === field.visibleWhen.equals;
  });
}
