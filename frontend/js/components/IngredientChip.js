export function renderIngredientChip({ item, emoji, language, expiring }) {
  const primaryName = language === "en-NZ" ? item.nameEn : item.nameZh;
  const secondaryName = language === "en-NZ" ? item.nameZh : item.nameEn;

  return `
    <div class="ingredient-chip ${expiring ? "expiring" : ""}">
      <div class="ingredient-main">
        <span class="ingredient-emoji" aria-hidden="true">${emoji}</span>
        <div class="ingredient-names">
          <span class="ingredient-primary">${primaryName}</span>
          <span class="ingredient-secondary">${secondaryName}</span>
        </div>
      </div>
      <span class="ingredient-qty">${item.quantity} ${item.unit}</span>
    </div>
  `;
}
