
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

                    <!-- Cabeça de perfil -->
                    <path
                        class="orbia-person"
                        d="
                            M 49 23
                            C 53 20 59 22 61 27
                            C 63 30 62 34 60 37
                            L 64 40
                            L 59 42
                            C 57 45 52 45 49 42
                            C 45 39 44 34 45 30
                            C 45 27 46 25 49 23
                            Z
                        "
                    />

                    <!-- Corpo lateral minimalista -->
                    <path
                        class="orbia-person"
                        d="
                            M 49 44
                            C 46 46 45 50 46 55
                            L 49 64
                            L 45 78
                            C 44 81 46 83 49 83
                            C 51 83 52 81 53 78
                            L 57 65
                            L 59 78
                            C 60 81 62 82 64 81
                            C 66 80 66 78 65 75
                            L 62 61
                            L 63 51
                            C 65 54 68 56 72 57
                            L 77 57
                            C 79 57 80 55 79 53
                            C 78 51 76 51 73 51
                            L 68 49
                            L 65 44
                            C 61 41 54 41 49 44
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
