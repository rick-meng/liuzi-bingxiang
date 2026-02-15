const EMOJI_BY_KEY = {
  egg: "🥚",
  tomato: "🍅",
  tofu_firm: "⬜",
  soy_sauce: "🫙",
  oyster_sauce: "🫙",
  doubanjiang: "🌶️",
  rice: "🍚",
  noodles: "🍜",
  beef_slice: "🥩",
  ground_beef: "🥩",
  chicken_thigh: "🍗",
  bok_choy: "🥬",
  cabbage: "🥬",
  broccoli: "🥦",
  mushroom: "🍄",
  potato: "🥔",
  garlic: "🧄",
  ginger: "🫚",
  chili: "🌶️",
  scallion: "🧅",
  shrimp: "🍤",
  sesame_oil: "🫙",
  onion: "🧅",
  salt: "🧂",
  sugar: "🍬",
  black_pepper: "🧂",
  cumin_powder: "🧂",
  five_spice: "🧂",
  curry_powder: "🧂",
  chili_oil: "🌶️",
  hoisin_sauce: "🫙",
  fish_sauce: "🫙",
  ketchup: "🍅",
  mayonnaise: "🥫",
  spaghetti: "🍝",
  flour: "🌾",
  oats: "🌾",
  salmon: "🐟",
  fish_fillet: "🐟",
  pork_mince: "🥓",
  milk: "🥛",
  yogurt: "🥛",
  bell_pepper: "🫑",
  cucumber: "🥒",
  lettuce: "🥬",
  spinach: "🥬",
  zucchini: "🥒",
  cauliflower: "🥦",
  corn: "🌽",
  peas_frozen: "🫛",
  sweet_potato: "🍠",
  cilantro: "🌿"
};

const EMOJI_BY_CATEGORY = {
  protein: "🍖",
  vegetable: "🥬",
  staple: "🍚",
  sauce: "🫙",
  seasoning: "🫙",
  aromatics: "🧄"
};

export function resolveIngredientEmoji(ingredientKey, category) {
  if (EMOJI_BY_KEY[ingredientKey]) {
    return EMOJI_BY_KEY[ingredientKey];
  }

  if (category && EMOJI_BY_CATEGORY[category]) {
    return EMOJI_BY_CATEGORY[category];
  }

  return "🍽️";
}
