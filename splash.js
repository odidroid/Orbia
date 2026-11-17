
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
                    viewBox="0 0 108 108"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                >

                    <ellipse
                        class="orbia-orbit"
                        cx="54"
                        cy="54"
                        rx="43"
                        ry="19"
                        transform="rotate(-25 54 54)"
                    />

                    <circle
                        class="orbia-person"
                        cx="54"
                        cy="35"
                        r="8"
                    />

                    <path
                        class="orbia-person"
                        d="
                            M 43 47
                            C 39 48 36 53 36 59
                            L 33 76
                            C 32 80 35 83 39 83
                            C 42 83 44 81 45 77
                            L 49 63
                            L 49 87
                            L 59 87
                            L 59 63
                            L 63 77
                            C 64 81 66 83 69 83
                            C 73 83 76 80 75 76
                            L 72 59
                            C 72 53 69 48 65 47
                            Z
                        "
                    />

                    <circle
                        class="orbia-orbit-dot"
                        cx="97"
                        cy="54"
                        r="3.2"
                    />

                </svg>

                <div class="orbia-splash-name">
                    ORBIA
                </div>

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
            }, 700);

        }, 3200);
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            createSplash,
            { once: true }
        );
    } else {
        createSplash();
    }
})();
