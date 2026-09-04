/* ==================================================
   DEVELOPER SANDBOX
   Shared Interface Behavior
   ================================================== */

(() => {
  const currentScript = document.currentScript;

  /* ==================================================
     REFERENCE GUIDE CATALOG SEARCH
     ================================================== */

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

  /* ==================================================
     SHARED INTERFACE BEHAVIOR
     ================================================== */

  if (currentScript?.src) {
    const coreScript = document.createElement("script");
    coreScript.src = new URL("script-core.js", currentScript.src).href;
    coreScript.async = false;
    document.head.append(coreScript);
  }

  /* ==================================================
     ROSETTA DISPLAY LABEL CLEANUP
     ================================================== */

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
