/* ==================================================
   DEVELOPER SANDBOX
   Shared Interface JavaScript
   ================================================== */

/* ==================================================
   1. NAVIGATION
   ================================================== */

const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#primary-nav");

function setActiveNavigation() {
  const currentSection = document.body.dataset.section;

  if (!currentSection) {
    return;
  }

  document.querySelectorAll("[data-nav-section]").forEach((item) => {
    const isCurrent = item.dataset.navSection === currentSection;

    if (isCurrent) {
      item.setAttribute("aria-current", "page");
    } else {
      item.removeAttribute("aria-current");
    }
  });
}

function closeMenu() {
  if (!navigation || !menuButton) {
    return;
  }

  navigation.classList.remove("open");

  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Open navigation");
}

function openMenu() {
  if (!navigation || !menuButton) {
    return;
  }

  navigation.classList.add("open");

  menuButton.setAttribute("aria-expanded", "true");
  menuButton.setAttribute("aria-label", "Close navigation");
}

setActiveNavigation();

if (menuButton && navigation) {
  menuButton.addEventListener("click", () => {
    const isOpen =
      menuButton.getAttribute("aria-expanded") === "true";

    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  /* close when a navigation item is selected */

  navigation.addEventListener("click", (event) => {
    if (event.target.closest("button")) {
      closeMenu();
    }
  });

  /* close if user clicks elsewhere */

  document.addEventListener("click", (event) => {
    const clickedMenu = navigation.contains(event.target);
    const clickedButton = menuButton.contains(event.target);

    if (!clickedMenu && !clickedButton) {
      closeMenu();
    }
  });

  /* close with Escape */

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
      menuButton.focus();
    }
  });
}

/* ==================================================
   2. SANDBOX VOICE
   Shared by page help and Easter eggs
   ================================================== */

const preferredSandboxVoices = [
  "Victoria",
  "Samantha",
  "Karen",
  "Ava",
  "Zira",
  "Moira",
  "Tessa",
  "Fiona",
];

function getSandboxVoice() {
  const voices = window.speechSynthesis.getVoices();

  for (const name of preferredSandboxVoices) {
    const voice = voices.find(
      (voice) =>
        voice.name.includes(name) &&
        voice.lang.startsWith("en"),
    );

    if (voice) {
      return voice;
    }
  }

  return (
    voices.find((voice) => voice.lang === "en-US") ||
    voices.find((voice) => voice.lang.startsWith("en")) ||
    null
  );
}

function createSandboxMessage(
  text,
  rate = 0.9,
  pitch = 0.85,
  volume = 0.7,
) {
  const message = new SpeechSynthesisUtterance(text);
  const voice = getSandboxVoice();

  if (voice) {
    message.voice = voice;
  }

  message.rate = rate;
  message.pitch = pitch;
  message.volume = volume;

  return message;
}

function speakSandbox(text) {
  const message = createSandboxMessage(text);

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(message);

  return message;
}

/*
  Prompt the browser to load
  available speech voices.
*/

window.speechSynthesis.getVoices();

/* ==================================================
   3. PAGE HELP
   Hover = tooltip
   First click = speak
   Second click = stop
   ================================================== */

const pageHelp = document.querySelector(".help");

if (pageHelp) {
  const helpButton = pageHelp.querySelector("button");
  const helpTitle = pageHelp.querySelector("strong");
  const helpDescription = pageHelp.querySelector("p");

  let helpIsSpeaking = false;
  let currentHelpMessage = null;

  helpButton?.addEventListener("click", () => {
    /* second click stops the current help message */

    if (helpIsSpeaking) {
      window.speechSynthesis.cancel();

      helpIsSpeaking = false;
      currentHelpMessage = null;

      return;
    }

    const title =
      helpTitle?.textContent?.trim() ?? "";

    const description =
      helpDescription?.textContent?.trim() ?? "";

    const text = [title, description]
      .filter(Boolean)
      .join(". ");

    if (!text) {
      return;
    }

    const message = createSandboxMessage(text);

    currentHelpMessage = message;
    helpIsSpeaking = true;

    function finishHelpMessage() {
      if (currentHelpMessage !== message) {
        return;
      }

      helpIsSpeaking = false;
      currentHelpMessage = null;
    }

    message.onend = finishHelpMessage;
    message.onerror = finishHelpMessage;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(message);
  });
}

/* ==================================================
   4. SANDBOX RETURN VISITOR
   Homepage only
   ================================================== */

const sandboxPath = window.location.pathname
  .replace(/\/index\.html$/, "/")
  .replace(/\/+$/, "/");

const isSandboxHome =
  sandboxPath === "/app/sandbox/";

if (isSandboxHome) {
  const storageKey = "sandbox-home-visits";

  const MEMORY_DAYS = 7;
  const MEMORY_TIME =
    MEMORY_DAYS * 24 * 60 * 60 * 1000;

  const now = Date.now();

  let data = {
    count: 0,
    expires: now + MEMORY_TIME,
  };

  /* ---------- READ SAVED VISITS ---------- */

  try {
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      const parsed = JSON.parse(saved);

      if (parsed.expires > now) {
        data = parsed;
      }
    }
  } catch (error) {
    data = {
      count: 0,
      expires: now + MEMORY_TIME,
    };
  }

  /* ---------- COUNT HOMEPAGE VISIT ---------- */

  data.count++;

  /*
    After 30 visits,
    begin the cycle again.
  */

  if (data.count > 10) {
    data.count = 1;
  }

  data.expires = now + MEMORY_TIME;

  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify(data),
    );
  } catch (error) {
    /* localStorage unavailable */
  }

  /* ---------- CHOOSE MESSAGE ---------- */

  let returnMessage = "";

  if (data.count === 5) {
    returnMessage =
      "Back again? I'm starting to think you like me.";
  }

  /* ---------- QUEUE MESSAGE ---------- */

  if (returnMessage) {
    let messagePlayed = false;

    function handleReturnVisitor(event) {
      /*
        Ignore the brand so this does not
        interfere with the five-click
        logo Easter egg.
      */

      if (event.target.closest(".brand")) {
        return;
      }

      if (messagePlayed) {
        return;
      }

      messagePlayed = true;

      const control =
        event.target.closest("a, button");

      /*
        Temporarily stop navigation
        while the message speaks.
      */

      if (control) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }

      const message =
        createSandboxMessage(returnMessage);

      let continued = false;

      function continueAction() {
        if (continued) {
          return;
        }

        continued = true;

        document.removeEventListener(
          "click",
          handleReturnVisitor,
          true,
        );

        if (control) {
          control.click();
        }
      }

      message.onend = continueAction;
      message.onerror = continueAction;

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(message);

      /*
        Fallback in case the browser
        does not fire the end event.
      */

      setTimeout(continueAction, 4000);
    }

    document.addEventListener(
      "click",
      handleReturnVisitor,
      true,
    );
  }
}

// /* ==================================================
//    5. SANDBOX LOGO EASTER EGG
//    Five brand clicks
//    ================================================== */

// const sandboxLogo =
//   document.querySelector(".brand");

// if (sandboxLogo) {
//   let logoClicks = 0;
//   let logoTimer;

//   sandboxLogo.addEventListener(
//     "click",
//     (event) => {
//       /*
//         Prevent # links from jumping
//         or reloading while counting.
//       */

//       const href =
//         sandboxLogo.getAttribute("href");

//       if (!href || href === "#") {
//         event.preventDefault();
//       }

//       logoClicks++;

//       clearTimeout(logoTimer);

//       logoTimer = setTimeout(() => {
//         logoClicks = 0;
//       }, 3000);

//       /* ---------- FIVE CLICKS ---------- */

//       if (logoClicks === 5) {
//         logoClicks = 0;

//         clearTimeout(logoTimer);

//         speakSandbox(
//           "Hello. Welcome to Susan's Developer Sandbox. Curiosity detected.",
//         );
//       }
//     },
//   );
// }

/* ==================================================
   6. SANDBOX UI SOUND
   ================================================== */

let audioContext = null;

function enableAudio() {
  if (!audioContext) {
    const AudioContextClass =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    audioContext =
      new AudioContextClass();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

/* ---------- CREATE UI TONE ---------- */

function playInterfaceSound(
  frequency = 520,
  duration = 0.035,
  volume = 0.025,
) {
  if (!audioContext) {
    return;
  }

  const oscillator =
    audioContext.createOscillator();

  const gain =
    audioContext.createGain();

  oscillator.type = "sawtooth";

  oscillator.frequency.setValueAtTime(
    frequency,
    audioContext.currentTime,
  );

  gain.gain.setValueAtTime(
    volume,
    audioContext.currentTime,
  );

  gain.gain.exponentialRampToValueAtTime(
    0.001,
    audioContext.currentTime + duration,
  );

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.start();

  oscillator.stop(
    audioContext.currentTime + duration,
  );
}

/* ---------- ENABLE AUDIO AFTER INTERACTION ---------- */

document.addEventListener(
  "pointerdown",
  enableAudio,
  {
    once: true,
  },
);

document.addEventListener(
  "keydown",
  enableAudio,
  {
    once: true,
  },
);

/* ---------- HOVER SOUND ---------- */

document.addEventListener(
  "pointerover",
  (event) => {
    const control = event.target.closest(
      "a, button, .project-card",
    );

    if (!control) {
      return;
    }

    /*
      Prevent sound from repeating
      while moving between children
      inside the same control.
    */

    if (
      event.relatedTarget &&
      control.contains(event.relatedTarget)
    ) {
      return;
    }

    playInterfaceSound(
      540,
      0.035,
      0.03,
    );
  },
);

/* ---------- CLICK SOUND ---------- */

document.addEventListener(
  "click",
  (event) => {
    const control = event.target.closest(
      "a, button, .project-card",
    );

    if (!control) {
      return;
    }

    enableAudio();

    playInterfaceSound(
      760,
      0.045,
      0.04,
    );
  },
);

/* ==================================================
   7. FEATURED PROJECT SLIDER
   ================================================== */

const featuredSlider =
  document.querySelector(".featured");

if (featuredSlider) {
  const slides = Array.from(
    featuredSlider.querySelectorAll(
      "[data-featured-slide]",
    ),
  );

  const dots = Array.from(
    featuredSlider.querySelectorAll(
      "[data-featured-dot]",
    ),
  );

  const previousButton =
    featuredSlider.querySelector(
      "[data-featured-prev]",
    );

  const nextButton =
    featuredSlider.querySelector(
      "[data-featured-next]",
    );

  let currentIndex = slides.findIndex(
    (slide) =>
      slide.classList.contains("active"),
  );

  if (currentIndex < 0) {
    currentIndex = 0;
  }

  function showFeaturedProject(index) {
    if (!slides.length) {
      return;
    }

    currentIndex =
      (index + slides.length) %
      slides.length;

    slides.forEach(
      (slide, slideIndex) => {
        const isActive =
          slideIndex === currentIndex;

        slide.classList.toggle(
          "active",
          isActive,
        );

        slide.setAttribute(
          "aria-hidden",
          isActive ? "false" : "true",
        );
      },
    );

    dots.forEach(
      (dot, dotIndex) => {
        const isActive =
          dotIndex === currentIndex;

        dot.classList.toggle(
          "active",
          isActive,
        );

        if (isActive) {
          dot.setAttribute(
            "aria-current",
            "true",
          );
        } else {
          dot.removeAttribute(
            "aria-current",
          );
        }
      },
    );
  }

  previousButton?.addEventListener(
    "click",
    () => {
      showFeaturedProject(
        currentIndex - 1,
      );
    },
  );

  nextButton?.addEventListener(
    "click",
    () => {
      showFeaturedProject(
        currentIndex + 1,
      );
    },
  );

  dots.forEach((dot) => {
    dot.addEventListener(
      "click",
      () => {
        const index = Number(
          dot.dataset.featuredDot,
        );

        if (Number.isInteger(index)) {
          showFeaturedProject(index);
        }
      },
    );
  });

  /* one featured project = no navigation needed */

  if (slides.length <= 1) {
    if (previousButton) {
      previousButton.disabled = true;
    }

    if (nextButton) {
      nextButton.disabled = true;
    }
  }

  showFeaturedProject(currentIndex);
}