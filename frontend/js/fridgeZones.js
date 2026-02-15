export const FRIDGE_ZONES = [
  {
    id: "fridge_top",
    icon: "🥚",
    labels: {
      zh: "冷藏上层",
      en: "Fridge Top"
    },
    order: 1
  },
  {
    id: "fridge_middle",
    icon: "🥬",
    labels: {
      zh: "冷藏中层",
      en: "Fridge Middle"
    },
    order: 2
  },
  {
    id: "freezer_drawer",
    icon: "🧊",
    labels: {
      zh: "冷冻抽屉",
      en: "Freezer Drawer"
    },
    order: 3
  },
  {
    id: "door_condiments",
    icon: "🫙",
    labels: {
      zh: "门边调味区",
      en: "Door Condiments"
    },
    order: 4
  },
  {
    id: "pantry_cabinet",
    icon: "🥫",
    labels: {
      zh: "常温柜",
      en: "Pantry Cabinet"
    },
    order: 5
  }
];

const TOP_HINT_KEYS = new Set([
  "egg",
  "milk",
  "yogurt",
  "cheese",
  "butter",
  "tofu_firm",
  "kimchi"
]);

export function resolveZoneId(item, catalogMap) {
  if (item.storageType === "freezer") {
    return "freezer_drawer";
  }

  if (item.storageType === "pantry") {
    return "pantry_cabinet";
  }

  const catalog = catalogMap.get(item.ingredientKey);
  const category = catalog?.category;

  if (category === "sauce" || category === "seasoning") {
    return "door_condiments";
  }

  if (TOP_HINT_KEYS.has(item.ingredientKey)) {
    return "fridge_top";
  }

  return "fridge_middle";
}

export function getZoneLabel(zone, language) {
  return language === "en-NZ" ? zone.labels.en : zone.labels.zh;
}
