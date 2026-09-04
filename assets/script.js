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
     Desktop switches the existing preview panel.
     Mobile follows the catalog row's project-page link.
     ================================================== */

  const librarySearch = document.querySelector("#library-search")
  const libraryRows = Array.from(document.querySelectorAll(".catalog-row[data-library-record]"))
  const libraryDetails = Array.from(document.querySelectorAll("[data-library-detail]"))
  const libraryFilters = Array.from(document.querySelectorAll("[data-library-filter]"))
  const libraryStatusFilters = Array.from(document.querySelectorAll(".library-heading .status"))
  const libraryEmpty = document.querySelector("#library-empty")
  const libraryMobile = window.matchMedia("(max-width: 899px)")

  if (libraryRows.length && libraryDetails.length) {
    let activeFilter = "all"
    let activeStatus = "all"
    let currentRecord =
      libraryRows.find((row) => row.classList.contains("selected"))?.dataset.libraryRecord ||
      libraryRows[0]?.dataset.libraryRecord ||
      ""

    const normalizeLibraryStatus = (value) => {
      const status = String(value || "").trim().toLowerCase()

      if (status.includes("in progress")) return "in-progress"
      if (status.includes("complete")) return "complete"
      if (status.includes("inactive")) return "inactive"
      return "planned"
    }

    libraryRows.forEach((row) => {
      const recordKey = row.dataset.libraryRecord
      const detail = libraryDetails.find(
        (item) => item.dataset.libraryDetail === recordKey,
      )
      const statusLabel = detail?.querySelector(".status-stack .status")?.textContent || ""
      row.dataset.status = normalizeLibraryStatus(statusLabel)
    })

    libraryStatusFilters.forEach((control) => {
      const statusKey = normalizeLibraryStatus(control.textContent)
      control.dataset.libraryStatus = statusKey
      control.classList.add("tag")
      control.setAttribute("role", "button")
      control.setAttribute("tabindex", "0")
      control.setAttribute("aria-pressed", "false")
    })

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
        const matchesStatus =
          activeStatus === "all" || row.dataset.status === activeStatus
        const searchText = (row.dataset.search || row.textContent || "").toLowerCase()
        const matchesSearch = !query || searchText.includes(query)
        const visible = matchesType && matchesStatus && matchesSearch

        row.hidden = !visible

        if (visible) {
          visibleCount += 1
          firstVisible ??= row
        }
      })

      if (libraryEmpty) {
        libraryEmpty.hidden = visibleCount !== 0
      }

      if (libraryMobile.matches) return

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

    const setLibraryStatusFilter = (control) => {
      const requestedStatus = control.dataset.libraryStatus || "all"
      activeStatus = activeStatus === requestedStatus ? "all" : requestedStatus

      libraryStatusFilters.forEach((item) => {
        const active = item.dataset.libraryStatus === activeStatus
        item.classList.toggle("active", active)
        item.setAttribute("aria-pressed", active ? "true" : "false")
      })

      applyLibraryFilters()
    }

    libraryRows.forEach((row) => {
      const recordKey = row.dataset.libraryRecord

      row.addEventListener("click", (event) => {
        if (libraryMobile.matches) return

        event.preventDefault()

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

    libraryStatusFilters.forEach((control) => {
      control.addEventListener("click", () => setLibraryStatusFilter(control))
      control.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return
        event.preventDefault()
        setLibraryStatusFilter(control)
      })
    })

    librarySearch?.addEventListener("input", applyLibraryFilters)

    const requestedSearch = new URLSearchParams(window.location.search).get("search")

    if (librarySearch && requestedSearch) {
      librarySearch.value = requestedSearch
      applyLibraryFilters()
    }

    if (!libraryMobile.matches) {
      const requestedDetail = window.location.hash.replace(/^#library-detail-/, "")
      const requestedRow = libraryRows.find(
        (row) => row.dataset.libraryRecord === requestedDetail,
      )

      if (requestedRow?.dataset.libraryRecord && !requestedRow.hidden) {
        showLibraryProject(requestedRow.dataset.libraryRecord)
      } else if (currentRecord) {
        const currentRow = libraryRows.find(
          (row) => row.dataset.libraryRecord === currentRecord,
        )

        if (currentRow && !currentRow.hidden) {
          showLibraryProject(currentRecord)
        }
      }
    }
  }

  /* ==================================================
     ROSETTA STONE ACCORDION MAP
     The generator renders every project panel and route in HTML.
     JavaScript only opens one existing route at a time and filters the
     existing project panels. No map markup is created here.
     ================================================== */

  const rosettaToggles = Array.from(
    document.querySelectorAll("[data-rosetta-toggle]"),
  )
  const rosettaProjects = Array.from(
    document.querySelectorAll("[data-rosetta-project]"),
  )
  const rosettaSearch = document.querySelector("#rosetta-search")
  const rosettaFilters = Array.from(
    document.querySelectorAll("[data-rosetta-filter]"),
  )
  const rosettaFilterEmpty = document.querySelector("#rosetta-filter-empty")

  if (rosettaToggles.length) {
    let activeRosettaFilter = "all"

    const setRosettaRoute = (toggle, expanded) => {
      const routeId = toggle.getAttribute("aria-controls")
      if (!routeId) return

      const route = document.getElementById(routeId)
      if (!route) return

      route.hidden = !expanded
      toggle.setAttribute("aria-expanded", expanded ? "true" : "false")
      toggle
        .closest("[data-rosetta-project]")
        ?.classList.toggle("expanded", expanded)
    }

    const rosettaProjectStatus = (project) => {
      if (project.classList.contains("rosetta-project--in-progress")) {
        return "in-progress"
      }

      if (project.classList.contains("rosetta-project--complete")) {
        return "complete"
      }

      if (project.classList.contains("rosetta-project--inactive")) {
        return "inactive"
      }

      return "planned"
    }

    const applyRosettaFilters = () => {
      const query = (rosettaSearch?.value || "").trim().toLowerCase()
      let visibleCount = 0

      rosettaProjects.forEach((project) => {
        const status = rosettaProjectStatus(project)
        const searchText = (project.textContent || "").toLowerCase()
        const matchesStatus =
          activeRosettaFilter === "all" || status === activeRosettaFilter
        const matchesSearch = !query || searchText.includes(query)
        const visible = matchesStatus && matchesSearch

        if (!visible) {
          const toggle = project.querySelector("[data-rosetta-toggle]")
          if (toggle) setRosettaRoute(toggle, false)
        }

        project.hidden = !visible
        if (visible) visibleCount += 1
      })

      if (rosettaFilterEmpty) {
        rosettaFilterEmpty.hidden = visibleCount !== 0
      }
    }

    rosettaToggles.forEach((toggle) => {
      toggle.addEventListener("click", () => {
        const willOpen = toggle.getAttribute("aria-expanded") !== "true"

        rosettaToggles.forEach((item) => setRosettaRoute(item, false))

        if (willOpen) {
          setRosettaRoute(toggle, true)
        }
      })
    })

    rosettaFilters.forEach((button) => {
      button.addEventListener("click", () => {
        activeRosettaFilter = button.dataset.rosettaFilter || "all"

        rosettaFilters.forEach((item) => {
          const active = item === button
          item.classList.toggle("active", active)
          item.setAttribute("aria-pressed", active ? "true" : "false")
        })

        applyRosettaFilters()
      })
    })

    rosettaSearch?.addEventListener("input", applyRosettaFilters)
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

    if (button.hasAttribute("aria-label")) {
      const label = button.getAttribute("aria-label") || ""
      button.setAttribute(
        "aria-label",
        label.replace(
          expanded ? /^Collapse / : /^Expand /,
          expanded ? "Expand " : "Collapse ",
        ),
      )
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

    const control = target.closest("a, button, [role='button'], .project-card")
    if (!control) return

    if (event.relatedTarget instanceof Node && control.contains(event.relatedTarget)) {
      return
    }

    playInterfaceSound(540, 0.035, 0.03)
  })

  document.addEventListener("click", (event) => {
    const target = event.target
    if (!(target instanceof Element)) return

    const control = target.closest("a, button, [role='button'], .project-card")
    if (!control) return

    enableAudio()
    playInterfaceSound(760, 0.045, 0.04)
  })
})()
