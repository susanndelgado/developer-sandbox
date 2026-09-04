/* ==================================================
   DEVELOPER SANDBOX
   Shared Interface Behavior
   JavaScript controls behavior only; page markup is rendered in HTML.
   ================================================== */

;(() => {
  /* ==================================================
     ACTIVE GLOBAL NAVIGATION
     ================================================== */

  const currentSection = document.body.dataset.section

  if (currentSection) {
    document.querySelectorAll("[data-nav-section]").forEach((link) => {
      const active = link.dataset.navSection === currentSection
      link.classList.toggle("active", active)

      if (active) {
        link.setAttribute("aria-current", "page")
      } else {
        link.removeAttribute("aria-current")
      }
    })
  }

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
     PROJECT LIBRARY
     All catalog rows and inspector panels already exist in HTML.
     ================================================== */

  const librarySearch = document.querySelector("#library-search")
  const libraryRows = Array.from(document.querySelectorAll(".catalog-row[data-library-record]"))
  const libraryDetails = Array.from(document.querySelectorAll("[data-library-detail]"))
  const libraryFilters = Array.from(document.querySelectorAll("[data-library-filter]"))
  const libraryEmpty = document.querySelector("#library-empty")

  if (libraryRows.length && libraryDetails.length) {
    let activeFilter = "all"
    let currentRecord =
      libraryRows.find((row) => row.classList.contains("selected"))?.dataset.libraryRecord ||
      libraryRows[0]?.dataset.libraryRecord ||
      ""

    const showLibraryProject = (recordKey) => {
      if (!recordKey) return

      currentRecord = recordKey

      libraryRows.forEach((row) => {
        row.classList.toggle("selected", row.dataset.libraryRecord === recordKey)
      })

      libraryDetails.forEach((detail) => {
        detail.hidden = detail.dataset.libraryDetail !== recordKey
      })
    }

    const applyLibraryFilters = () => {
      const query = (librarySearch?.value || "").trim().toLowerCase()
      let firstVisible = null
      let visibleCount = 0

      libraryRows.forEach((row) => {
        const matchesType =
          activeFilter === "all" || row.dataset.classification === activeFilter
        const searchText = (row.dataset.search || row.textContent || "").toLowerCase()
        const matchesSearch = !query || searchText.includes(query)
        const visible = matchesType && matchesSearch

        row.hidden = !visible

        if (visible) {
          visibleCount += 1
          firstVisible ??= row
        }
      })

      if (libraryEmpty) {
        libraryEmpty.hidden = visibleCount !== 0
      }

      const currentRow = libraryRows.find(
        (row) => row.dataset.libraryRecord === currentRecord,
      )

      if (!currentRow || currentRow.hidden) {
        const nextRecord = firstVisible?.dataset.libraryRecord

        if (nextRecord) {
          showLibraryProject(nextRecord)
        } else {
          libraryDetails.forEach((detail) => {
            detail.hidden = true
          })
        }
      }
    }

    libraryRows.forEach((row) => {
      row.addEventListener("click", (event) => {
        event.preventDefault()

        const recordKey = row.dataset.libraryRecord
        if (recordKey) showLibraryProject(recordKey)
      })
    })

    libraryFilters.forEach((button) => {
      button.addEventListener("click", () => {
        activeFilter = button.dataset.libraryFilter || "all"

        libraryFilters.forEach((item) => {
          const active = item === button
          item.classList.toggle("active", active)
          item.setAttribute("aria-pressed", active ? "true" : "false")
        })

        applyLibraryFilters()
      })
    })

    librarySearch?.addEventListener("input", applyLibraryFilters)

    const requestedDetail = window.location.hash.replace(/^#library-detail-/, "")
    const requestedRow = libraryRows.find(
      (row) => row.dataset.libraryRecord === requestedDetail,
    )

    if (requestedRow?.dataset.libraryRecord) {
      showLibraryProject(requestedRow.dataset.libraryRecord)
    } else if (currentRecord) {
      showLibraryProject(currentRecord)
    }
  }

  /* ==================================================
     LABS SLIDER
     All slides already exist in HTML.
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

    showLab(currentLab)
  }

  /* ==================================================
     GENERATED COLLAPSIBLE CONTENT
     ================================================== */

  document.addEventListener("click", (event) => {
    const target = event.target

    if (!(target instanceof Element)) return

    const button = target.closest(".collapse-toggle")
    if (!(button instanceof HTMLButtonElement)) return

    const panelId =
      button.dataset.collapseTarget || button.getAttribute("aria-controls")
    if (!panelId) return

    const panel = document.getElementById(panelId)
    if (!panel) return

    const expanded = !panel.hidden
    panel.hidden = expanded

    if (button.hasAttribute("aria-expanded")) {
      button.setAttribute("aria-expanded", String(!expanded))
    }
  })

  /* ==================================================
     SHARED UI SOUND
     Restored from the earlier Sandbox interface.
     ================================================== */

  let audioContext = null

  const enableAudio = () => {
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (!AudioContextClass) return
      audioContext = new AudioContextClass()
    }

    if (audioContext.state === "suspended") {
      audioContext.resume()
    }
  }

  const playInterfaceSound = (
    frequency = 520,
    duration = 0.035,
    volume = 0.025,
  ) => {
    if (!audioContext) return

    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()

    oscillator.type = "sawtooth"
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
    gain.gain.setValueAtTime(volume, audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + duration,
    )

    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start()
    oscillator.stop(audioContext.currentTime + duration)
  }

  document.addEventListener("pointerdown", enableAudio, { once: true })
  document.addEventListener("keydown", enableAudio, { once: true })

  document.addEventListener("pointerover", (event) => {
    const target = event.target
    if (!(target instanceof Element)) return

    const control = target.closest("a, button, .project-card")
    if (!control) return

    if (event.relatedTarget instanceof Node && control.contains(event.relatedTarget)) {
      return
    }

    playInterfaceSound(540, 0.035, 0.03)
  })

  document.addEventListener("click", (event) => {
    const target = event.target
    if (!(target instanceof Element)) return

    const control = target.closest("a, button, .project-card")
    if (!control) return

    enableAudio()
    playInterfaceSound(760, 0.045, 0.04)
  })
})()
