(() => {
  const SOUNDTRACK_VOLUME = 0.82;
  const SYNC_THRESHOLD_SECONDS = 0.14;

  const scriptUrl = new URL(document.currentScript.src, window.location.href);
  const soundtrackUrl = new URL("./audio/moonrise.m4a", scriptUrl);

  const soundtrack = new Audio(soundtrackUrl.href);
  soundtrack.preload = "auto";
  soundtrack.loop = false;
  soundtrack.volume = SOUNDTRACK_VOLUME;
  soundtrack.playsInline = true;

  let audioEnabled = false;
  let startInFlight = false;
  let sceneReady = false;

  window.__moonriseAudio = soundtrack;

  const originalResetScene =
    typeof window.resetScene === "function"
      ? window.resetScene
      : null;

  function sceneIsReady() {
    return (
      document.querySelector("canvas") &&
      typeof window.millis === "function"
    );
  }

  function makeSoundPrompt() {
    if (document.getElementById("moonrise-sound-prompt")) return;

    const prompt = document.createElement("button");
    prompt.id = "moonrise-sound-prompt";
    prompt.type = "button";
    prompt.setAttribute("aria-label", "开启背景音乐");
    prompt.textContent = "点击开启声音";

    Object.assign(prompt.style, {
      position: "fixed",
      left: "50%",
      bottom: "max(22px, env(safe-area-inset-bottom))",
      transform: "translateX(-50%)",
      zIndex: "9999",
      padding: "9px 14px",
      border: "1px solid rgba(255,255,255,.30)",
      borderRadius: "999px",
      background: "rgba(2,10,27,.34)",
      color: "rgba(255,255,255,.88)",
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
      font: "400 13px/1 system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      letterSpacing: ".08em",
      cursor: "pointer",
      boxShadow: "0 6px 22px rgba(0,0,0,.12)",
      opacity: "0",
      transition: "opacity .35s ease",
    });

    document.body.appendChild(prompt);

    requestAnimationFrame(() => {
      prompt.style.opacity = "1";
    });
  }

  function removeSoundPrompt() {
    const prompt = document.getElementById("moonrise-sound-prompt");
    if (!prompt) return;

    prompt.style.opacity = "0";
    window.setTimeout(() => {
      prompt.remove();
    }, 360);
  }

  function restartAudioFromZero() {
    if (!audioEnabled) return;

    try {
      soundtrack.currentTime = 0;
    } catch (_) {}

    if (soundtrack.paused) {
      soundtrack.play().catch(() => {
        audioEnabled = false;
        makeSoundPrompt();
      });
    }
  }

  if (originalResetScene) {
    window.resetScene = function syncedResetScene(...args) {
      const result = originalResetScene.apply(this, args);
      restartAudioFromZero();
      return result;
    };
  }

  async function startAudioAndAnimationTogether() {
    if (audioEnabled || startInFlight || !sceneIsReady()) {
      return;
    }

    startInFlight = true;

    try {
      soundtrack.currentTime = 0;
      soundtrack.volume = SOUNDTRACK_VOLUME;

      await soundtrack.play();

      audioEnabled = true;
      removeSoundPrompt();

      // The visual may already have been running while autoplay was blocked.
      // Restart the original scene once so picture and soundtrack both begin at 0.
      if (originalResetScene) {
        originalResetScene();
      }

      soundtrack.currentTime = 0;

      if (soundtrack.paused) {
        await soundtrack.play();
      }
    } catch (_) {
      audioEnabled = false;
      makeSoundPrompt();
    } finally {
      startInFlight = false;
    }
  }

  function handleUserGesture(event) {
    const target = event && event.target;

    if (
      target &&
      target.closest &&
      target.closest(".experience-exit")
    ) {
      return;
    }

    startAudioAndAnimationTogether();
  }

  // Use several gesture types because browser autoplay policies differ.
  window.addEventListener("pointerdown", handleUserGesture, { passive: true });
  window.addEventListener("touchstart", handleUserGesture, { passive: true });
  window.addEventListener("click", handleUserGesture);
  window.addEventListener("keydown", handleUserGesture);

  const readyTimer = window.setInterval(() => {
    if (!sceneIsReady()) return;

    sceneReady = true;
    window.clearInterval(readyTimer);

    // Try autoplay once. If blocked, show an explicit but unobtrusive prompt.
    startAudioAndAnimationTogether();

    window.setTimeout(() => {
      if (!audioEnabled && soundtrack.paused) {
        makeSoundPrompt();
      }
    }, 500);
  }, 80);

  soundtrack.addEventListener("error", () => {
    audioEnabled = false;
    makeSoundPrompt();
  });

  soundtrack.addEventListener("playing", () => {
    audioEnabled = true;
    removeSoundPrompt();
  });

  function correctDrift(force = false) {
    if (
      !audioEnabled ||
      !sceneReady ||
      soundtrack.paused ||
      soundtrack.readyState < 2
    ) {
      return;
    }

    try {
      if (
        typeof window.millis !== "function" ||
        typeof startMs !== "number" ||
        typeof LOOP_TIME !== "number"
      ) {
        return;
      }

      const sceneTime = (window.millis() - startMs) / 1000;

      if (sceneTime < 0 || sceneTime >= LOOP_TIME) {
        return;
      }

      const maxAudioTime = Math.max(
        0,
        (Number.isFinite(soundtrack.duration)
          ? soundtrack.duration
          : LOOP_TIME) - 0.03
      );

      const targetTime = Math.min(sceneTime, maxAudioTime);
      const drift = soundtrack.currentTime - targetTime;

      if (force || Math.abs(drift) > SYNC_THRESHOLD_SECONDS) {
        soundtrack.currentTime = targetTime;
      }
    } catch (_) {}
  }

  window.setInterval(() => {
    correctDrift(false);
  }, 500);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      window.setTimeout(() => {
        correctDrift(true);
      }, 80);
    }
  });

  soundtrack.addEventListener("ended", () => {
    if (!audioEnabled) return;

    try {
      if (
        typeof startMs === "number" &&
        typeof window.millis === "function" &&
        typeof LOOP_TIME === "number"
      ) {
        const sceneTime = (window.millis() - startMs) / 1000;

        if (sceneTime < LOOP_TIME - 0.2) {
          soundtrack.currentTime = Math.max(0, sceneTime);
          soundtrack.play().catch(() => {
            audioEnabled = false;
            makeSoundPrompt();
          });
        }
      }
    } catch (_) {}
  });
})();