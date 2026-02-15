export function renderSettingSectionCard({ title, body }) {
  return `
    <section class="setting-card">
      <h3>${title}</h3>
      <div class="setting-card-body">${body}</div>
    </section>
  `;
}
