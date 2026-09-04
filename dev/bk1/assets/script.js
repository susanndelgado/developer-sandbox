/* ==================================================
   DEVELOPER SANDBOX
   Shared Interface Bootstrap
   ================================================== */

(() => {
  const currentScript = document.currentScript;

  if (currentScript?.src) {
    const coreScript = document.createElement("script");
    coreScript.src = new URL("script-core.js", currentScript.src).href;
    coreScript.async = false;
    document.head.append(coreScript);
  }

  document
    .querySelectorAll("a, button")
    .forEach((entry) => {
      const destination = [
        entry.getAttribute("href") ?? "",
        entry.getAttribute("onclick") ?? "",
      ].join(" ");

      if (!destination.includes("rosetta-stone")) {
        return;
      }

      entry
        .querySelectorAll("strong, small")
        .forEach((title) => {
          const text = title.textContent?.trim() ?? "";

          if (!text.startsWith("Rosetta Stone ")) {
            return;
          }

          title.textContent = text.replace(/^Rosetta Stone\s+/, "");
        });
    });
})();
