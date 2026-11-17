(() => {
    "use strict";

    const STORAGE_KEY = "orbia-sounds-enabled";
    const enabled = () => localStorage.getItem(STORAGE_KEY) !== "false";
    let context = null;
    let pendingStartup = true;
    let lastTap = 0;

    function audioContext() {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return null;
        if (!context) context = new AudioContextClass();
        if (context.state === "suspended") context.resume().catch(() => {});
        return context;
    }

    function tone(frequency, start, duration, volume, type = "sine") {
        const ctx = audioContext();
        if (!ctx || !enabled()) return;
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(start);
        oscillator.stop(start + duration + 0.03);
    }

    function playStartup() {
        if (!enabled()) return;
        const ctx = audioContext();
        if (!ctx || ctx.state !== "running") {
            pendingStartup = true;
            return;
        }
        pendingStartup = false;
        const now = ctx.currentTime + 0.04;
        tone(523.25, now, 0.24, 0.045);
        tone(659.25, now + 0.12, 0.28, 0.04);
        tone(783.99, now + 0.26, 0.42, 0.035);
    }

    function playTap() {
        if (!enabled()) return;
        const nowMs = Date.now();
        if (nowMs - lastTap < 100) return;
        lastTap = nowMs;
        const ctx = audioContext();
        if (!ctx || ctx.state !== "running") return;
        const now = ctx.currentTime + 0.005;
        tone(880, now, 0.075, 0.022, "sine");
        tone(1174.66, now + 0.035, 0.085, 0.014, "sine");
    }

    function mount() {
        const settings = document.getElementById("settings-section");
        if (settings && !document.getElementById("orbia-sound-card")) {
            const card = document.createElement("section");
            card.id = "orbia-sound-card";
            card.className = "sleep-card";
            card.style.marginBottom = "18px";
            card.innerHTML = `
                <h2>♪ Sons do ORBIA</h2>
                <p class="settings-description">Uma identidade sonora discreta para a inicialização e a navegação.</p>
                <label style="display:flex;align-items:center;gap:10px;font-size:14px">
                    <input id="orbia-sounds-enabled" type="checkbox" ${enabled() ? "checked" : ""}>
                    Ativar sons suaves do aplicativo
                </label>
                <button type="button" id="orbia-sound-preview" class="settings-button secondary">Ouvir som de demonstração</button>
            `;
            settings.appendChild(card);
            document.getElementById("orbia-sounds-enabled").addEventListener("change", event => {
                localStorage.setItem(STORAGE_KEY, event.target.checked ? "true" : "false");
                if (event.target.checked) playStartup();
            });
            document.getElementById("orbia-sound-preview").addEventListener("click", () => {
                if (!enabled()) {
                    localStorage.setItem(STORAGE_KEY, "true");
                    document.getElementById("orbia-sounds-enabled").checked = true;
                }
                playStartup();
            });
        }

        document.querySelectorAll(".bottom-navigation button").forEach(button => {
            button.addEventListener("click", playTap, { passive: true });
        });

        document.addEventListener("pointerdown", () => {
            const ctx = audioContext();
            if (pendingStartup && ctx && ctx.state === "running") {
                playStartup();
            }
        }, { once: true, passive: true });

        if (document.readyState === "complete") {
            setTimeout(playStartup, 220);
        } else {
            window.addEventListener("load", () => setTimeout(playStartup, 220), { once: true });
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", mount, { once: true });
    } else {
        mount();
    }

    window.OrbiaSounds = { playStartup, playTap };
})();