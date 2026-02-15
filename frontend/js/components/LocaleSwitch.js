export function renderLocaleSwitch(language) {
  return `
    <div class="locale-switch" role="group" aria-label="language switch">
      <button type="button" data-language="zh-CN" class="${language === "zh-CN" ? "active" : ""}">中文</button>
      <button type="button" data-language="en-NZ" class="${language === "en-NZ" ? "active" : ""}">English</button>
    </div>
  `;
}
