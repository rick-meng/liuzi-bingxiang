const MASS_IN_G = {
    g: 1,
    kg: 1000
};
const VOLUME_IN_ML = {
    ml: 1,
    l: 1000,
    tbsp: 15,
    tsp: 5
};
export function convertUnit(quantity, fromUnit, toUnit) {
    if (fromUnit === toUnit) {
        return quantity;
    }
    if (fromUnit in MASS_IN_G && toUnit in MASS_IN_G) {
        const inGram = quantity * MASS_IN_G[fromUnit];
        return inGram / MASS_IN_G[toUnit];
    }
    if (fromUnit in VOLUME_IN_ML && toUnit in VOLUME_IN_ML) {
        const inMl = quantity * VOLUME_IN_ML[fromUnit];
        return inMl / VOLUME_IN_ML[toUnit];
    }
    return null;
}
export function safeRound(quantity, precision = 2) {
    const factor = 10 ** precision;
    return Math.round(quantity * factor) / factor;
}
