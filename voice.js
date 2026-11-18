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
        if (!("speechSynthesis" in window)) return [];
        voices = window.speechSynthesis.getVoices().filter(v =>
            /^pt[-_]BR$/i.test(v.lang || "") && v.localService !== false
        );
        return voices;
    }
    function voiceFor(gender) {
        refreshVoices();
        if (!voices.length) return null;
        const patterns = gender === "female"
            ? /(female|femin|woman|mulher|maria|luciana|camila|francisca|helena|vitoria|brasilia.*f)/i
            : /(male|masc|man|homem|daniel|felipe|antonio|ricardo|joao|brasilia.*m)/i;
        return voices.find(v => patterns.test(v.name || "")) || voices[0];
    }
    function speak(text, preview = false) {
        if (!("speechSynthesis" in window)) {
            setStatus("A leitura em voz alta não está disponível neste Android.");
            return false;
        }
        const voice = voiceFor(settings.gender);
        if (!voice) {
            setStatus("Nenhuma voz offline em português (Brasil) foi encontrada. Instale uma voz pt-BR nas configurações de conversão de texto em fala do Android.");
            return false;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "pt-BR";
        utterance.voice = voice;
        utterance.rate = Math.min(1.05, Math.max(0.82, Number(settings.rate) || 0.94));
        utterance.pitch = settings.gender === "female" ? 1.08 : 0.91;
        utterance.volume = 0.92;
        utterance.onstart = () => setStatus("Reproduzindo prévia com: " + voice.name);
        utterance.onerror = event => setStatus("Não foi possível reproduzir a voz: " + event.error);
        utterance.onend = () => { if (preview) setStatus("Prévia concluída."); };
        window.speechSynthesis.speak(utterance);
        return true;
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
        if (!voices.length) setStatus("Aguardando uma voz offline pt-BR do Android.");
        else setStatus(voices.length + " voz(es) offline em português encontradas.");
    }
    function makeGreeting() {
        const hour = new Date().getHours();
        const period = hour >= 5 && hour < 12 ? "Bom dia" : hour >= 12 && hour < 18 ? "Boa tarde" : "Boa noite";
        const profile = window.OrbiaProfile?.getProfile?.();
        const name = profile?.name?.trim();
        const subtitle = document.querySelector(".greeting span")?.textContent || "Vamos organizar seu dia.";
        return period + (name ? ", " + name : "") + "! " + subtitle;
    }
    function greetOnce() {
        if (greetedThisLaunch || !settings.enabled) return;
        const profile = window.OrbiaProfile?.getProfile?.();
        if (!profile || profile.completed !== true) return;
        greetedThisLaunch = true;
        window.setTimeout(() => {
            if (settings.enabled) speak(makeGreeting());
        }, 900);
    }
    function init() {
        mount();
        greetOnce();
        window.speechSynthesis?.addEventListener?.("voiceschanged", refreshVoices);
        document.addEventListener("orbia:profile-ready", greetOnce);
        document.addEventListener("visibilitychange", () => {
            if (document.hidden && "speechSynthesis" in window) window.speechSynthesis.cancel();
        });
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
    else init();
})();