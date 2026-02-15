export function renderDynamicSettingField(field, value, language) {
  const label = language === "en-NZ" ? field.labels.en : field.labels.zh;
  const description = field.description
    ? language === "en-NZ"
      ? field.description.en
      : field.description.zh
    : "";

  let control = "";

  if (field.type === "boolean") {
    control = `
      <label class="switch-row">
        <input type="checkbox" data-field-key="${field.key}" ${value ? "checked" : ""}>
      </label>
    `;
  } else if (field.type === "single_select") {
    const options = (field.options ?? [])
      .map((option) => {
        const optionLabel = language === "en-NZ" ? option.labels.en : option.labels.zh;
        return `<option value="${option.value}" ${option.value === value ? "selected" : ""}>${optionLabel}</option>`;
      })
      .join("");

    control = `<select data-field-key="${field.key}">${options}</select>`;
  } else if (field.type === "multi_select") {
    const selected = Array.isArray(value) ? value : [];
    const options = (field.options ?? [])
      .map((option) => {
        const optionLabel = language === "en-NZ" ? option.labels.en : option.labels.zh;
        const checked = selected.includes(option.value) ? "checked" : "";
        return `
          <label class="multi-option">
            <input type="checkbox" data-field-key="${field.key}" data-multi-option="${option.value}" ${checked}>
            <span>${optionLabel}</span>
          </label>
        `;
      })
      .join("");

    control = `<div class="multi-options">${options}</div>`;
  } else if (field.type === "number") {
    const min = field.validations?.min ?? "";
    const max = field.validations?.max ?? "";
    control = `<input type="number" data-field-key="${field.key}" value="${value ?? ""}" min="${min}" max="${max}">`;
  } else if (field.type === "time") {
    control = `<input type="time" data-field-key="${field.key}" value="${value ?? "18:00"}">`;
  } else {
    const maxLength = field.validations?.maxLength ?? "";
    control = `<input type="text" data-field-key="${field.key}" value="${value ?? ""}" maxlength="${maxLength}">`;
  }

  return `
    <div class="dynamic-field" data-setting-key="${field.key}">
      <label>${label}</label>
      ${description ? `<p>${description}</p>` : ""}
      ${control}
    </div>
  `;
}
