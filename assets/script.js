/* ==================================================
   DEVELOPER SANDBOX
   Shared Interface Bootstrap
   ================================================== */

(() => {
  const currentScript = document.currentScript;
  const body = document.body;

  const pageName = window.location.pathname.split("/").filter(Boolean).pop() || "index.html";

  const getSection = () => {
    if (pageName === "labs.html") return "labs";
    if (pageName === "system-guide.html" || pageName === "database.html") return "system";
    if (pageName === "rosetta-stones.html") return "projects";
    return body.dataset.section || "home";
  };

  const navLink = (section, href, label, icon) => {
    const active = getSection() === section;
    return `
      <a class="nav-link${active ? " active" : ""}" data-nav-section="${section}" href="${href}"${active ? ' aria-current="page"' : ""}>
        ${icon}
        ${label}
      </a>`;
  };

  const navIcons = {
    home: `<svg class="icon icon-glow" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.5 12 3l8.5 7.5M5.5 9v11h5v-6h3v6h5V9" /></svg>`,
    projects: `<svg class="icon icon-glow" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h6l2-2h10v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></svg>`,
    reference: `<svg class="icon icon-glow" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4.5h6.5c1.2 0 2 .8 2 2v13c0-1.2-.8-2-2-2H4Zm16 0h-6.5c-1.2 0-2 .8-2 2v13c0-1.2-.8-2-2-2H20Z" /></svg>`,
    labs: `<svg class="icon icon-glow" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6M10 3v6l-5.5 9.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3M7.5 16h9" /></svg>`,
    system: `<svg class="icon icon-glow" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.4" /><path d="M12 2.8v2.1M12 19.1v2.1M21.2 12h-2.1M4.9 12H2.8M18.5 5.5 17 7M7 17l-1.5 1.5M18.5 18.5 17 17M7 7 5.5 5.5" /></svg>`,
  };

  const headerMarkup = () => `
    <a class="brand" href="index.html" aria-label="Developer Sandbox home">
      <img src="assets/img/logo-blue.png" alt="" />
      <span class="brand-copy">
        <strong>DEVELOPER SANDBOX</strong>
        <small>Academy of Mastery</small>
      </span>
    </a>

    <nav class="site-nav glass glass-compact" aria-label="Developer Sandbox navigation">
      ${navLink("home", "index.html", "Home", navIcons.home)}
      ${navLink("projects", "library.html", "Projects", navIcons.projects)}
      ${navLink("reference", "reference-guides.html", "Reference Guides", navIcons.reference)}
      ${navLink("labs", "labs.html", "Labs", navIcons.labs)}
      ${navLink("system", "system-guide.html", "System Guide", navIcons.system)}
    </nav>

    <div class="header-meta">
      <a class="nav-orb glass-soft" href="system-guide.html" aria-label="Open System Guide">
        <svg class="icon icon-glow" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="5.5" />
          <path d="m15.2 15.2 4.3 4.3" />
        </svg>
      </a>
      <span class="welcome">Welcome<small>Build · Explore · Create</small></span>
      <a class="avatar glass-soft" href="https://sdelgado.com/work.html" aria-label="Return to sdelgado">SD</a>
    </div>`;

  const footerMarkup = () => `
    <nav class="footer-links" aria-label="Developer Sandbox resources">
      <a href="https://github.com/susanndelgado/developer-sandbox">
        <svg class="footer-icon icon-glow" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v4m0 0a2 2 0 1 0 0 4v4m10-8V4m0 4a2 2 0 1 1 0 4v4M9 10h6" /></svg>
        Sandbox Repo
      </a>
      <a href="https://github.com/susanndelgado">
        <svg class="footer-icon icon-glow" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M8 18v-2.2c-1.8-.2-2.7-.9-3.4-2M16 18v-2.2c1.7-.6 2.5-2 2.5-4 0-1-.3-1.9-.8-2.6.2-.9.1-1.7-.2-2.4-1-.2-2 .2-2.8.8a8 8 0 0 0-5.4 0C8.5 7 7.5 6.6 6.5 6.8c-.3.7-.4 1.5-.2 2.4a4.3 4.3 0 0 0-.8 2.6c0 2 1 3.4 2.5 4" /></svg>
        GitHub
      </a>
      <a href="system-guide.html">
        <svg class="footer-icon icon-glow" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4.5h6.5c1.2 0 2 .8 2 2v13c0-1.2-.8-2-2-2H4Zm16 0h-6.5c-1.2 0-2 .8-2 2v13c0-1.2-.8-2-2-2H20Z" /></svg>
        Documentation
      </a>
    </nav>
    <p class="footer-quote">“Dreams are the Foundation of Reality.” — Susan Delgado</p>
    <p class="footer-signature">Art × Code × Education × A More Creative Tomorrow</p>`;

  const normalizeInnerPage = () => {
    const legacyIds = body.id.split(/\s+/).filter(Boolean);
    if (!legacyIds.includes("pg")) return;

    const section = getSection();
    body.dataset.section = section;
    body.classList.add("site-page", "app-shell");

    if (pageName === "labs.html" || pageName === "rosetta-stones.html") {
      body.classList.add("special-catalog");
    }

    const directChildren = Array.from(body.children);
    const header = directChildren.find((item) => item.tagName === "HEADER");
    const main = directChildren.find((item) => item.tagName === "MAIN");
    const footer = directChildren.find((item) => item.tagName === "FOOTER");

    if (header) {
      header.className = "home-header page-frame full-frame";
      header.innerHTML = headerMarkup();
    }

    if (main) {
      main.classList.add("app-main", "page-frame", "full-frame");

      const sidebar = main.querySelector(".type-menu");
      const content = main.querySelector(".project-content");

      if (sidebar) {
        sidebar.classList.add("app-sidebar", "glass");
        const currentType = sidebar.querySelector('[aria-current="true"]');
        currentType?.classList.add("active");
      }

      if (content) {
        content.classList.add("app-content", "glass");

        const contentHeader = Array.from(content.children).find(
          (item) => item.tagName === "HEADER",
        );
        contentHeader?.classList.add("content-header");

        const documentBody = content.querySelector(".project-doc");
        if (documentBody) {
          documentBody.classList.add("app-scroll");
        } else if (body.classList.contains("special-catalog")) {
          content.classList.add("app-scroll");
        }
      }
    }

    if (footer) {
      footer.className = "home-footer page-frame full-frame";
      footer.innerHTML = footerMarkup();
    }
  };

  normalizeInnerPage();

  const referenceSearch = document.querySelector("#reference-search");
  const guideRows = Array.from(document.querySelectorAll(".guide-row"));

  if (referenceSearch && guideRows.length) {
    referenceSearch.addEventListener("input", () => {
      const query = referenceSearch.value.trim().toLowerCase();
      guideRows.forEach((row) => {
        const searchText = row.dataset.search || row.textContent || "";
        row.hidden = Boolean(query) && !searchText.toLowerCase().includes(query);
      });
    });
  }

  if (currentScript?.src) {
    const coreScript = document.createElement("script");
    coreScript.src = new URL("script-core.js", currentScript.src).href;
    coreScript.async = false;
    document.head.append(coreScript);
  }

  document.querySelectorAll("a, button").forEach((entry) => {
    const destination = [
      entry.getAttribute("href") ?? "",
      entry.getAttribute("onclick") ?? "",
    ].join(" ");

    if (!destination.includes("rosetta-stone")) return;

    entry.querySelectorAll("strong, small").forEach((title) => {
      const text = title.textContent?.trim() ?? "";
      if (!text.startsWith("Rosetta Stone ")) return;
      title.textContent = text.replace(/^Rosetta Stone\s+/, "");
    });
  });
})();
