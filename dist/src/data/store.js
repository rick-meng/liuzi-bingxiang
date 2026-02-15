const pantryItems = [];
const userProfiles = new Map();
const userSettings = new Map();
export function getPantryItemsByUser(userId) {
    return pantryItems.filter((item) => item.userId === userId);
}
export function addPantryItem(item) {
    pantryItems.push(item);
    return item;
}
export function updatePantryItem(userId, itemId, patch) {
    const target = pantryItems.find((item) => item.id === itemId && item.userId === userId);
    if (!target) {
        return undefined;
    }
    const normalizedPatch = {
        ...patch,
        openedAt: patch.openedAt ?? undefined,
        expiresAt: patch.expiresAt ?? undefined,
        purchasedAt: patch.purchasedAt ?? undefined
    };
    Object.assign(target, normalizedPatch);
    return target;
}
export function removePantryItem(userId, itemId) {
    const index = pantryItems.findIndex((item) => item.id === itemId && item.userId === userId);
    if (index < 0) {
        return false;
    }
    pantryItems.splice(index, 1);
    return true;
}
export function setUserProfile(profile) {
    userProfiles.set(profile.id, profile);
}
export function getUserProfile(userId) {
    return userProfiles.get(userId);
}
export function getUserSettings(userId) {
    return userSettings.get(userId) ?? {};
}
export function upsertUserSettings(userId, values) {
    const existing = userSettings.get(userId) ?? {};
    const merged = {
        ...existing,
        ...values
    };
    userSettings.set(userId, merged);
    return merged;
}
export function resetStore() {
    pantryItems.splice(0, pantryItems.length);
    userProfiles.clear();
    userSettings.clear();
}
