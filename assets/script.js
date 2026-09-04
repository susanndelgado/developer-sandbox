/* ==================================================
   DEVELOPER SANDBOX
   Shared Interface Behavior
   ================================================== */

;(() => {
  /* ==================================================
     REFERENCE GUIDE CATALOG SEARCH
     ================================================== */

  const referenceSearch = document.querySelector("#reference-search")
  const guideRows = Array.from(document.querySelectorAll(".guide-row"))

  if (referenceSearch && guideRows.length) {
    referenceSearch.addEventListener("input", () => {
      const query = referenceSearch.value.trim().toLowerCase()

      guideRows.forEach((row) => {
        const searchText = row.dataset.search || row.textContent || ""
        row.hidden = Boolean(query) && !searchText.toLowerCase().includes(query)
      })
    })
  }

  /* ==================================================
     LABS SLIDER
     Markup is generated in HTML. JavaScript only changes
     which existing slide is visible.
     ================================================== */

  const labSlides = Array.from(document.querySelectorAll("[data-lab-slide]"))

  if (labSlides.length) {
    let currentLab = Math.max(
      0,
      labSlides.findIndex((slide) => !slide.hidden),
    )

    const showLab = (index) => {
      currentLab = (index + labSlides.length) % labSlides.length

      labSlides.forEach((slide, slideIndex) => {
        const active = slideIndex === currentLab
        slide.hidden = !active
        slide.setAttribute("aria-hidden", String(!active))
      })
    }

    document.querySelectorAll("[data-lab-prev]").forEach((button) => {
      button.addEventListener("click", () => showLab(currentLab - 1))
    })

    document.querySelectorAll("[data-lab-next]").forEach((button) => {
      button.addEventListener("click", () => showLab(currentLab + 1))
    })
  }

  /* ==================================================
     SHARED INTERFACE BEHAVIOR
     ================================================== */

  import("./script-core.js")

  /* ==================================================
     ROSETTA DISPLAY LABEL CLEANUP
     ================================================== */

  document.querySelectorAll("a, button").forEach((entry) => {
    const destination = [
      entry.getAttribute("href") ?? "",
      entry.getAttribute("onclick") ?? "",
    ].join(" ")

    if (!destination.includes("rosetta-stone")) return

    entry.querySelectorAll("strong, small").forEach((title) => {
      const text = title.textContent?.trim() ?? ""

      if (!text.startsWith("Rosetta Stone ")) return

      title.textContent = text.replace(/^Rosetta Stone\s+/, "")
    })
  })
})()
