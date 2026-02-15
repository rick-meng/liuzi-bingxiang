const JSON_HEADERS = {
  "Content-Type": "application/json"
};

async function request(path, options = {}) {
  const response = await fetch(path, options);

  if (response.status === 204) {
    return null;
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.message ?? "Request failed";
    throw new Error(message);
  }

  return body;
}

function query(path, params) {
  const url = new URL(path, window.location.origin);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    url.searchParams.set(key, String(value));
  }
  return `${url.pathname}${url.search}`;
}

export const api = {
  getProfile({ userId, market, timezone }) {
    return request(query("/users/me/profile", { userId, market, timezone }));
  },

  updateProfile(payload, market) {
    return request(query("/users/me/profile", { market }), {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify(payload)
    });
  },

  getIngredientCatalog(market) {
    return request(query("/catalog/ingredients", { market }));
  },

  getPantryItems(userId) {
    return request(query("/pantry/items", { userId }));
  },

  addPantryItem(market, payload) {
    return request(query("/pantry/items", { market }), {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(payload)
    });
  },

  patchPantryItem(userId, itemId, patch) {
    return request(query(`/pantry/items/${itemId}`, { userId }), {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify(patch)
    });
  },

  deletePantryItem(userId, itemId) {
    return request(query(`/pantry/items/${itemId}`, { userId }), {
      method: "DELETE"
    });
  },

  getExpiryAlerts({ userId, market, timezone }) {
    return request(query("/alerts/expiry", { userId, market, timezone }));
  },

  getDinnerRecommendations(payload) {
    return request("/recommendations/dinner", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(payload)
    });
  },

  getRecipeDetails(recipeId, market) {
    return request(query(`/recipes/${recipeId}`, { market }));
  },

  buildShoppingList(payload) {
    return request("/shopping-list/from-recipes", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(payload)
    });
  },

  getSettingsSchema() {
    return request("/settings/schema");
  },

  getUserSettings(userId) {
    return request(query("/users/me/settings", { userId }));
  },

  updateUserSettings(payload) {
    return request("/users/me/settings", {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify(payload)
    });
  }
};
