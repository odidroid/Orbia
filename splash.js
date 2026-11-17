(() => {
    function createSplash() {
        if (document.getElementById("orbia-splash")) {
            return;
        }

        const splash = document.createElement("div");

        splash.id = "orbia-splash";
        splash.setAttribute("role", "status");
        splash.setAttribute("aria-label", "Iniciando ORBIA");

        splash.innerHTML = `
            <div class="orbia-splash-content">
                <svg
                    class="orbia-splash-symbol"
                    viewBox="0 0 120 120"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                >
                    <path
                        id="orbia-orbit-path"
                        class="orbia-orbit"
                        d="M 60 18 A 42 42 0 1 1 59.999 18"
                    />
                    <circle class="orbia-orbit-dot" r="3.5">
                        <animateMotion
                            dur="5.8s"
                            repeatCount="indefinite"
                            rotate="auto"
                        >
                            <mpath href="#orbia-orbit-path" />
                        </animateMotion>
                    </circle>
                </svg>

                <div class="orbia-splash-name">ORBIA</div>
                <div class="orbia-splash-tagline">
                    Tudo na sua órbita. Sua vida no seu ritmo.
                </div>
            </div>
        `;

        document.body.prepend(splash);

        window.setTimeout(() => {
            splash.classList.add("splash-hidden");

            window.setTimeout(() => {
                splash.remove();
                document.documentElement.classList.remove("orbia-loading");
            }, 700);
        }, 3200);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", createSplash, { once: true });
    } else {
        createSplash();
    }
})();
