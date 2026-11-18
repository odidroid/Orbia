(() => {
    "use strict";

    const PROFILE_KEY = "orbia-profile";
    const $ = id => document.getElementById(id);
    const readProfile = () => {
        try {
            const value = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
            return value && typeof value === "object" ? value : null;
        } catch (error) {
            console.warn("Perfil ORBIA inválido; será solicitado novamente.", error);
            return null;
        }
    };

    let profile = readProfile();
    let currentPage = "home";

    const pageCopy = {
        home: { title: "Vamos organizar seu dia", subtitle: "Um passo de cada vez, no seu ritmo." },
        agenda: { title: "Vamos planejar sua agenda", subtitle: "Organize seus compromissos e horários." },
        habits: { title: "Vamos cuidar dos seus hábitos", subtitle: "Pequenas atitudes constroem grandes mudanças." },
        goals: { title: "Vamos avançar nas suas metas", subtitle: "Seus objetivos, no seu ritmo." },
        finance: { title: "Vamos organizar suas finanças", subtitle: "Mais clareza para cuidar do seu dinheiro." },
        settings: { title: "Vamos ajustar seu ORBIA", subtitle: "Deixe tudo do seu jeito." }
    };

    function greetingPeriod() {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return { text: "Bom dia", emoji: "☀️" };
        if (hour >= 12 && hour < 18) return { text: "Boa tarde", emoji: "🌤️" };
        return { text: "Boa noite", emoji: "🌙" };
    }

    function refresh() {
        profile = readProfile();
        const heading = document.querySelector(".greeting h1");
        const subtitle = document.querySelector(".greeting span");
        if (!heading || !subtitle) return;
        const name = profile && profile.name ? profile.name.trim() : "";
        const copy = pageCopy[currentPage] || pageCopy.home;

        if (currentPage === "home") {
            const period = greetingPeriod();
            heading.textContent = period.text + (name ? ", " + name : "") + "! " + period.emoji;
            subtitle.textContent = copy.title + (name ? ", " + name : "") + "?";
        } else {
            heading.textContent = copy.title + (name ? ", " + name : "") + "?";
            subtitle.textContent = copy.subtitle;
        }
        document.dispatchEvent(new Event("orbia:profile-ready"));
    }

    function mountStyles() {
        if ($("orbia-profile-styles")) return;
        const style = document.createElement("style");
        style.id = "orbia-profile-styles";
        style.textContent = `
        body.orbia-first-launch > *:not(#orbia-onboarding){visibility:hidden!important}\n        #orbia-onboarding{position:fixed;inset:0;z-index:1500;display:none;align-items:center;justify-content:center;padding:22px;background:rgba(10,18,30,.78);backdrop-filter:blur(9px);overflow-y:auto}
        #orbia-onboarding.active{display:flex}
        .orbia-onboarding-card{width:100%;max-width:460px;max-height:calc(100vh - 44px);overflow-y:auto;padding:26px 22px;border:1px solid var(--border);border-radius:24px;background:var(--surface);color:var(--text);box-shadow:0 24px 70px rgba(0,0,0,.25)}
        .orbia-onboarding-mark{width:48px;height:48px;display:grid;place-items:center;border-radius:16px;background:rgba(53,184,154,.13);color:var(--accent);font-size:25px;margin-bottom:18px}
        .orbia-onboarding-card h2{font-size:24px;color:var(--primary);margin-bottom:8px}
        .orbia-onboarding-card>p{font-size:13px;line-height:1.6;color:var(--muted);margin-bottom:20px}
        .orbia-profile-field{display:block;margin:14px 0 6px;font-size:12px;font-weight:700;color:var(--text)}
        .orbia-onboarding-card input{width:100%;min-height:46px;padding:12px;border:1px solid var(--border);border-radius:12px;background:var(--background);color:var(--text);font:inherit}
        .orbia-profile-time-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .orbia-profile-submit{width:100%;min-height:48px;margin-top:22px;border:0;border-radius:13px;background:var(--accent);color:#fff;font-size:14px;font-weight:800}
        .orbia-profile-error{min-height:18px;margin-top:9px;color:#D65B5B;font-size:12px}
        @media(max-width:360px){.orbia-onboarding-card{padding:22px 17px}.orbia-profile-time-grid{gap:8px}}
        `;
        document.head.appendChild(style);
    }

    function mountOnboarding() {
        if ($("orbia-onboarding")) return;
        const overlay = document.createElement("div");
        overlay.id = "orbia-onboarding";
        overlay.innerHTML = `
            <form class="orbia-onboarding-card" id="orbia-profile-form">
                <div class="orbia-onboarding-mark" aria-hidden="true">✦</div>
                <h2>Vamos colocar você na órbita?</h2>
                <p>Conte um pouquinho sobre você para o ORBIA adaptar sua experiência e acompanhar seus horários.</p>
                <label class="orbia-profile-field" for="orbia-profile-name">Como podemos chamar você?</label>
                <input id="orbia-profile-name" name="name" type="text" maxlength="32" autocomplete="nickname" placeholder="Seu nome ou apelido" required>
                <label class="orbia-profile-field" for="orbia-profile-birth">Data de nascimento</label>
                <input id="orbia-profile-birth" name="birthDate" type="date" required>
                <div class="orbia-profile-time-grid">
                    <div><label class="orbia-profile-field" for="orbia-profile-bedtime">Que horas costuma dormir?</label><input id="orbia-profile-bedtime" name="bedtime" type="time" value="22:00" required></div>
                    <div><label class="orbia-profile-field" for="orbia-profile-waketime">Que horas costuma acordar?</label><input id="orbia-profile-waketime" name="waketime" type="time" value="07:00" required></div>
                </div>
                <p class="orbia-profile-error" id="orbia-profile-error" role="alert"></p>
                <button class="orbia-profile-submit" type="submit">Começar minha jornada</button>
            </form>`;
        document.body.appendChild(overlay);

        const birth = $("orbia-profile-birth");
        const localToday = () => { const now = new Date(); return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0"); };
        birth.max = localToday();
        $("orbia-profile-form").addEventListener("submit", event => {
            event.preventDefault();
            const name = $("orbia-profile-name").value.trim();
            const birthDate = birth.value;
            const bedtime = $("orbia-profile-bedtime").value;
            const waketime = $("orbia-profile-waketime").value;
            if (!name || !birthDate || !bedtime || !waketime) {
                $("orbia-profile-error").textContent = "Preencha todos os campos para continuar.";
                return;
            }
            if (birthDate > localToday()) {
                $("orbia-profile-error").textContent = "A data de nascimento não pode estar no futuro.";
                return;
            }
            profile = { name, birthDate, bedtime, waketime, completed: true };
            try {
                localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
                if (window.OrbiaNotifications && window.OrbiaNotifications.getSettings && window.OrbiaNotifications.restoreSettings) {
                    const previous = window.OrbiaNotifications.getSettings();
                    window.OrbiaNotifications.restoreSettings({ ...previous, bedtime, waketime });
                } else {
                    localStorage.setItem("orbia-sleep-reminders", JSON.stringify({ enabled: false, bedtime, waketime }));
                }
                overlay.classList.remove("active");
                document.body.classList.remove("orbia-first-launch");
                document.body.style.overflow = "";
                refresh();
            } catch (error) {
                console.error("Não foi possível salvar o perfil ORBIA:", error);
                $("orbia-profile-error").textContent = "Não foi possível salvar agora. Tente novamente.";
            }
        });
    }

    function showOnboardingIfNeeded() {
        mountStyles();
        mountOnboarding();
        if (!profile || profile.completed !== true) {
            document.body.classList.add("orbia-first-launch");
            $("orbia-onboarding").classList.add("active");
            document.body.style.overflow = "hidden";
        }
    }

    const originalShowPage = window.showPage;
    if (typeof originalShowPage === "function") {
        const wrappedShowPage = function(page) {
            currentPage = page;
            const result = originalShowPage.apply(this, arguments);
            refresh();
            return result;
        };
        window.showPage = wrappedShowPage;
        showPage = wrappedShowPage;
    }

    window.OrbiaProfile = {
        getProfile: () => profile ? { ...profile } : null,
        refresh,
        edit: () => {
            if (!$("orbia-onboarding")) { mountStyles(); mountOnboarding(); }
            $("orbia-profile-name").value = profile?.name || "";
            $("orbia-profile-birth").value = profile?.birthDate || "";
            $("orbia-profile-bedtime").value = profile?.bedtime || "22:00";
            $("orbia-profile-waketime").value = profile?.waketime || "07:00";
            $("orbia-onboarding").classList.add("active");
            document.body.style.overflow = "hidden";
        }
    };

    const originalSubmit = () => {
        const overlay = $("orbia-onboarding");
        if (overlay) {
            const observer = new MutationObserver(() => {
                if (!overlay.classList.contains("active")) document.body.style.overflow = "";
            });
            observer.observe(overlay, { attributes: true, attributeFilter: ["class"] });
        }
    };
    originalSubmit();

    const editButton = $("edit-orbia-profile");
    if (editButton) editButton.addEventListener("click", () => window.OrbiaProfile.edit());

    refresh();
    showOnboardingIfNeeded();
    window.setInterval(refresh, 60000);
})();