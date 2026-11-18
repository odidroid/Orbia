(() => {
    "use strict";
    const KEY = "orbia-voice-settings";
    const defaults = { enabled: true, gender: "female", rate: 0.94, greeted: "" };
    const read = () => {
        try { return { ...defaults, ...(JSON.parse(localStorage.getItem(KEY) || "{}")) }; }
        catch { return { ...defaults }; }
    };
    let settings = read();
    let greetedThisLaunch = false;
    let voices = [];
    const $ = id => document.getElementById(id);

    function save() {
        localStorage.setItem(KEY, JSON.stringify(settings));
    }
    function refreshVoices() {
        if (!("speechSynthesis" in window)) {
            voices = [];
            return voices;
        }
        try {
            const available = window.speechSynthesis.getVoices() || [];
            // WebView pode informar vozes remotas ou variantes de idioma como pt_BR.
            voices = available.filter(v => /^pt[-_]BR(?:[-_].*)?$/i.test(v.lang || ""));
            if (!voices.length) {
                voices = available.filter(v => /^pt(?:[-_].*)?$/i.test(v.lang || ""));
            }
        } catch (error) {
            console.warn("Não foi possível listar as vozes do Android:", error);
            voices = [];
        }
        return voices;
    }
    function voiceFor(gender) {
        refreshVoices();
        if (!voices.length) return null; // null deixa o Android escolher sua voz padrão.
        const patterns = gender === "female"
            ? /(female|femin|woman|mulher|maria|luciana|camila|francisca|helena|vitoria|brasilia.*f)/i
            : /(male|masc|man|homem|daniel|felipe|antonio|ricardo|joao|brasilia.*m)/i;
        return voices.find(v => patterns.test(v.name || "")) || voices[0];
    }
    function speak(text, preview = false) {
        if (!("speechSynthesis" in window) || typeof window.SpeechSynthesisUtterance !== "function") {
            setStatus("Este Android/WebView não disponibilizou o recurso de fala. Verifique se há um mecanismo de conversão de texto em voz instalado.");
            return false;
        }

        const synth = window.speechSynthesis;
        const voice = voiceFor(settings.gender);
        try {
            synth.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = "pt-BR";
            // Não exigir uma voz listada: alguns WebViews só expõem a voz padrão do Android.
            if (voice) utterance.voice = voice;
            utterance.rate = Math.min(1.05, Math.max(0.82, Number(settings.rate) || 0.94));
            utterance.pitch = settings.gender === "female" ? 1.08 : 0.91;
            utterance.volume = 1;
            utterance.onstart = () => setStatus("Reproduzindo com a voz disponível no Android" + (voice ? ": " + voice.name : "."));
            utterance.onerror = event => {
                greetedThisLaunch = false;
                setStatus("O Android não conseguiu iniciar a fala (" + (event.error || "erro desconhecido") + "). Confira o mecanismo de texto em voz nas configurações do aparelho.");
            };
            utterance.onend = () => { if (preview) setStatus("Prévia concluída."); };
            synth.speak(utterance);
            // Alguns WebViews ficam pausados depois de uma fala cancelada anteriormente.
            if (synth.paused && typeof synth.resume === "function") synth.resume();
            setStatus(voice ? "Voz em português encontrada: " + voice.name : "Tentando usar a voz padrão de português do Android…");
            return true;
        } catch (error) {
            console.error("Falha ao iniciar a saudação por voz:", error);
            setStatus("Não foi possível iniciar a fala neste aparelho: " + error.message);
            return false;
        }
    }
    function setStatus(message) {
        const el = $("orbia-voice-status");
        if (el) el.textContent = message;
    }
    function mount() {
        const section = $("settings-section");
        if (!section || $("orbia-voice-card")) return;
        const card = document.createElement("div");
        card.className = "sleep-card";
        card.id = "orbia-voice-card";
        card.innerHTML = `
            <h2>🔊 Saudações por voz</h2>
            <div class="sleep-hours">
                <strong>Uma recepção com a sua cara</strong>
                <span class="settings-description">O ORBIA pode dizer sua saudação ao abrir o aplicativo. A voz é processada no próprio aparelho, sem enviar sua fala para a internet.</span>
                <label class="settings-description" for="orbia-voice-enabled" style="display:block;margin-top:14px;font-weight:700;color:var(--text)">Saudação falada</label>
                <select id="orbia-voice-enabled" class="settings-button secondary" style="margin-top:6px">
                    <option value="true">Ativada</option><option value="false">Desativada</option>
                </select>
                <label class="settings-description" for="orbia-voice-gender" style="display:block;margin-top:14px;font-weight:700;color:var(--text)">Tipo de voz</label>
                <select id="orbia-voice-gender" class="settings-button secondary" style="margin-top:6px">
                    <option value="female">Feminina</option><option value="male">Masculina</option>
                </select>
                <label class="settings-description" for="orbia-voice-rate" style="display:block;margin-top:14px;font-weight:700;color:var(--text)">Velocidade da fala</label>
                <input id="orbia-voice-rate" type="range" min="0.82" max="1.05" step="0.01" style="width:100%;margin-top:10px">
                <button type="button" id="orbia-voice-preview" class="settings-button">▶ Ouvir prévia da voz</button>
                <span id="orbia-voice-status" class="settings-info" aria-live="polite"></span>
                <span class="settings-info">As vozes disponíveis variam conforme o mecanismo de voz instalado no Android. Para uma voz realmente diferente, escolha uma voz pt-BR masculina ou feminina nas opções de conversão de texto em fala do aparelho.</span>
            </div>`;
        const backupCard = section.querySelector("#export-backup")?.closest(".sleep-card");
        if (backupCard) section.insertBefore(card, backupCard); else section.appendChild(card);
        $("orbia-voice-enabled").value = String(settings.enabled);
        $("orbia-voice-gender").value = settings.gender;
        $("orbia-voice-rate").value = String(settings.rate);
        $("orbia-voice-enabled").addEventListener("change", e => { settings.enabled = e.target.value === "true"; save(); });
        $("orbia-voice-gender").addEventListener("change", e => { settings.gender = e.target.value; save(); });
        $("orbia-voice-rate").addEventListener("input", e => { settings.rate = Number(e.target.value); save(); });
        $("orbia-voice-preview").addEventListener("click", () => {
            const profile = window.OrbiaProfile?.getProfile?.();
            const name = profile?.name ? ", " + profile.name : "";
            const phrase = settings.gender === "female"
                ? "Olá" + name + "! Que bom ter você por aqui. Vamos com calma, um passo de cada vez."
                : "Olá" + name + "! Bom ter você por aqui. Vamos organizar seu dia no seu ritmo.";
            speak(phrase, true);
        });
        refreshVoices();
        if (!("speechSynthesis" in window)) {
            setStatus("Este Android/WebView não oferece a API de fala. É necessária uma integração nativa com o mecanismo de voz.");
        } else if (!voices.length) {
            setStatus("Nenhuma voz listada pelo WebView. O ORBIA tentará usar a voz padrão do Android.");
        } else {
            setStatus(voices.length + " voz(es) em português encontradas.");
        }
    }
    function makeGreeting() {
        const hour = new Date().getHours();
        const period = hour >= 5 && hour < 12 ? "Bom dia" : hour >= 12 && hour < 18 ? "Boa tarde" : "Boa noite";
        const profile = window.OrbiaProfile?.getProfile?.();
        const name = profile?.name?.trim();
        let subtitle = document.querySelector(".greeting span")?.textContent || "Vamos organizar seu dia.";
        if (name) {
            const suffix = ", " + name + "?";
            if (subtitle.toLocaleLowerCase().endsWith(suffix.toLocaleLowerCase())) {
                subtitle = subtitle.slice(0, -suffix.length) + "?";
            }
        }
        return period + (name ? ", " + name : "") + "! " + subtitle;
    }
    function greetOnce() {
        if (greetedThisLaunch || !settings.enabled) return;
        const profile = window.OrbiaProfile?.getProfile?.();
        if (!profile || profile.completed !== true) return;
        window.setTimeout(() => {
            if (!settings.enabled || greetedThisLaunch) return;
            greetedThisLaunch = speak(makeGreeting());
        }, 1800);
    }
    function init() {
        mount();
        greetOnce();
        window.speechSynthesis?.addEventListener?.("voiceschanged", () => { refreshVoices(); greetOnce(); });
        document.addEventListener("orbia:profile-ready", greetOnce);
        document.addEventListener("visibilitychange", () => {
            if (document.hidden && "speechSynthesis" in window) window.speechSynthesis.cancel();
        });
    }
    window.OrbiaVoice = {
        getSettings: () => ({ enabled: settings.enabled, gender: settings.gender, rate: settings.rate }),
        restoreSettings: value => {
            if (!value || typeof value !== "object") return;
            settings = { ...defaults, ...value, greeted: "" };
            if (!["female", "male"].includes(settings.gender)) settings.gender = "female";
            settings.enabled = settings.enabled !== false;
            settings.rate = Math.min(1.05, Math.max(0.82, Number(settings.rate) || 0.94));
            save();
            const enabled = $("orbia-voice-enabled");
            const gender = $("orbia-voice-gender");
            const rate = $("orbia-voice-rate");
            if (enabled) enabled.value = String(settings.enabled);
            if (gender) gender.value = settings.gender;
            if (rate) rate.value = String(settings.rate);
        }
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
    else init();
})();