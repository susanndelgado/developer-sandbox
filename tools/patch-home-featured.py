from pathlib import Path

path = Path("src/generator/generate.ts")
text = path.read_text()

old = '''function renderHomeFeaturedProject(): string {
  const record =
    getPublicFeaturedProjects()[0] ??
    getPublicGeneralProjects()[0] ??
    getPublicRosettaStones()[0] ??
    getPublicLabs()[0];

  if (!record) {
    return `
<div class="featured-body">
  <figure class="preview-frame"><img src="assets/img/desktop.png" alt="Developer Sandbox project preview" /></figure>
  <div class="featured-copy">
    <small>Developer Sandbox</small>
    <h2>Projects in Progress</h2>
    <p class="panel-copy">New project previews will appear here as they are published.</p>
    <a class="home-panel-link" href="library.html">View Library →</a>
  </div>
</div>`;
  }

  return `
<div class="featured-body">
  <figure class="preview-frame">${renderPreviewOrFallback(record)}</figure>
  <div class="featured-copy">
    <small>${escapeHtml(classificationDisplayLabel(record))}</small>
    <h2>${escapeHtml(record.title)}</h2>
    <p class="panel-copy">${escapeHtml(record.description ?? record.subtitle ?? "")}</p>
    <div class="tag-row" aria-label="${attr(record.title)} technologies">
      ${renderTechnologyTags(record, 4)}
    </div>
    <a class="home-panel-link" href="${attr(entryUrl(record))}">View Project →</a>
  </div>
</div>`;
}
'''

new = '''function renderHomeFeaturedProject(): string {
  const records = getPublicFeaturedProjects();

  if (!records.length) {
    return `
<div class="featured-slider">
  <div class="featured-slides">
    <section class="featured-slide">
      <div class="featured-body">
        <figure class="preview-frame"><img src="assets/img/desktop.png" alt="Developer Sandbox project preview" /></figure>
        <div class="featured-copy">
          <small>Developer Sandbox</small>
          <h2>Featured projects</h2>
          <p class="panel-copy">Mark an entry as featured to place it in this slider.</p>
          <a class="home-panel-link" href="library.html">View Library →</a>
        </div>
      </div>
    </section>
  </div>
</div>`;
  }

  const slides = records
    .map(
      (record, index) => `
<section
  class="featured-slide"
  data-featured-slide
  aria-label="Featured project ${index + 1} of ${records.length}"
  aria-hidden="${index === 0 ? "false" : "true"}"${index === 0 ? "" : " hidden"}
>
  <div class="featured-body">
    <figure class="preview-frame">${renderPreviewOrFallback(record)}</figure>
    <div class="featured-copy">
      <small>${escapeHtml(classificationDisplayLabel(record))}</small>
      <h2>${escapeHtml(record.title)}</h2>
      <p class="panel-copy">${escapeHtml(record.description ?? record.subtitle ?? "")}</p>
      <div class="tag-row" aria-label="${attr(record.title)} technologies">
        ${renderTechnologyTags(record, 4)}
      </div>
      <a class="home-panel-link" href="${attr(entryUrl(record))}">View Project →</a>
    </div>
  </div>
</section>`,
    )
    .join("\\n");

  const controls = records.length > 1
    ? `
  <button class="featured-arrow featured-arrow-prev" type="button" data-featured-prev aria-label="Previous featured project">
    <span aria-hidden="true">‹</span>
  </button>
  <button class="featured-arrow featured-arrow-next" type="button" data-featured-next aria-label="Next featured project">
    <span aria-hidden="true">›</span>
  </button>`
    : "";

  return `
<div class="featured-slider" data-featured-slider>
  <div class="featured-slides" aria-live="polite">
    ${slides}
  </div>
  ${controls}
</div>`;
}
'''

if old not in text:
    raise SystemExit("Expected renderHomeFeaturedProject block not found")

path.write_text(text.replace(old, new, 1))
