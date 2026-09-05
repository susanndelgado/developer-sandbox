from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"Missing expected block: {label}")
    file.write_text(text.replace(old, new, 1))


replace_once(
    "src/generator/generate.ts",
    '''function renderHomeFeaturedProject(): string {
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
''',
    '''function renderHomeFeaturedProject(): string {
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
''',
    "renderHomeFeaturedProject",
)

replace_once(
    "assets/styles.css",
    '''.featured-body {
  display: grid;
  grid-template-columns: minmax(120px, 0.67fr) minmax(0, 1fr);
  gap: 15px;
  min-height: 0;
  height: calc(100% - 43px);
}

.featured-copy {''',
    '''.featured-slider {
  position: relative;
  min-width: 0;
  min-height: 0;
  height: calc(100% - 43px);
}

.featured-slides,
.featured-slide {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.featured-body {
  display: grid;
  grid-template-columns: minmax(120px, 0.67fr) minmax(0, 1fr);
  gap: 15px;
  min-height: 0;
  height: 100%;
}

.featured-arrow {
  position: absolute;
  z-index: 4;
  top: 50%;
  display: grid;
  place-items: center;
  width: 30px;
  height: 44px;
  padding: 0;
  border: 1px solid rgba(105, 220, 255, 0.22);
  border-radius: 10px;
  color: #bfeeff;
  background: rgba(3, 13, 31, 0.72);
  box-shadow: 0 0 12px rgba(58, 173, 255, 0.08);
  cursor: pointer;
  transform: translateY(-50%);
  transition:
    color 160ms ease,
    border-color 160ms ease,
    background 160ms ease,
    box-shadow 160ms ease;
}

.featured-arrow span {
  font-size: 1.5rem;
  line-height: 1;
}

.featured-arrow:hover,
.featured-arrow:focus-visible {
  color: white;
  border-color: rgba(105, 220, 255, 0.5);
  background: rgba(9, 34, 69, 0.9);
  box-shadow: 0 0 16px rgba(58, 173, 255, 0.16);
}

.featured-arrow-prev {
  left: clamp(-42px, -2.4vw, -30px);
}

.featured-arrow-next {
  right: clamp(-42px, -2.4vw, -30px);
}

.featured-copy {''',
    "featured slider styles",
)

replace_once(
    "assets/media.css",
    '''  .featured-copy .panel-copy {
    font-size: 0.5rem;
  }
''',
    '''  .featured-arrow-prev {
    left: -12px;
  }

  .featured-arrow-next {
    right: -12px;
  }

  .featured-copy .panel-copy {
    font-size: 0.5rem;
  }
''',
    "compact desktop featured arrows",
)

replace_once(
    "assets/media.css",
    '''  /* Library becomes a direct project list on mobile. */
''',
    '''  .featured-arrow {
    width: 28px;
    height: 38px;
    border-radius: 8px;
    background: rgba(3, 13, 31, 0.82);
  }

  .featured-arrow-prev {
    left: 4px;
  }

  .featured-arrow-next {
    right: 4px;
  }

  /* Library becomes a direct project list on mobile. */
''',
    "mobile featured arrows",
)

replace_once(
    "assets/media.css",
    '''  .featured-body {
    grid-template-columns: 1fr;
    height: calc(100% - 32px);
  }
''',
    '''  .featured-slider {
    height: calc(100% - 32px);
  }

  .featured-body {
    grid-template-columns: 1fr;
    height: 100%;
  }

  .featured-arrow {
    top: 50%;
    width: clamp(20px, 4.8vh, 24px);
    height: clamp(32px, 8vh, 40px);
    border-color: rgba(105, 220, 255, 0.18);
    border-radius: 7px;
    background: rgba(2, 10, 26, 0.72);
  }

  .featured-arrow span {
    font-size: clamp(1rem, 3vh, 1.25rem);
  }

  .featured-arrow-prev {
    left: 3px;
  }

  .featured-arrow-next {
    right: 3px;
  }
''',
    "landscape featured slider",
)

replace_once(
    "assets/script.js",
    '''  /* ==================================================
     REFERENCE GUIDE CATALOG SEARCH
     ================================================== */
''',
    '''  /* ==================================================
     HOME FEATURED SLIDER
     Every featured slide already exists in generated HTML.
     JavaScript only switches which existing slide is visible.
     ================================================== */

  document.querySelectorAll("[data-featured-slider]").forEach((slider) => {
    const slides = Array.from(slider.querySelectorAll("[data-featured-slide]"))
    const previous = slider.querySelector("[data-featured-prev]")
    const next = slider.querySelector("[data-featured-next]")

    if (slides.length < 2) return

    let currentFeatured = Math.max(
      0,
      slides.findIndex((slide) => !slide.hidden),
    )

    const showFeatured = (index) => {
      currentFeatured = (index + slides.length) % slides.length

      slides.forEach((slide, slideIndex) => {
        const active = slideIndex === currentFeatured
        slide.hidden = !active
        slide.setAttribute("aria-hidden", String(!active))
      })
    }

    previous?.addEventListener("click", () => showFeatured(currentFeatured - 1))
    next?.addEventListener("click", () => showFeatured(currentFeatured + 1))

    showFeatured(currentFeatured)
  })

  /* ==================================================
     REFERENCE GUIDE CATALOG SEARCH
     ================================================== */
''',
    "featured slider behavior",
)
