const COMMON_TIMEZONES = [
  "Pacific/Auckland",
  "Pacific/Chatham",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Brisbane",
  "Australia/Perth"
];

export function renderTimezonePicker(currentTimezone) {
  const options = COMMON_TIMEZONES.map((zone) => {
    const selected = zone === currentTimezone ? "selected" : "";
    return `<option value="${zone}" ${selected}>${zone}</option>`;
  }).join("");

  return `<select id="profile-timezone">${options}</select>`;
}
