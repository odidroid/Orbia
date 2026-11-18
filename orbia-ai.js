(() => {
    "use strict";

    // A interface não simula respostas: o motor local será conectado
    // quando a integração nativa e o gerenciador de modelos estiverem prontos.
    const section = document.getElementById("ai-section");
    if (!section) return;

    window.OrbiaAI = {
        getStatus() {
            return {
                available: false,
                modelInstalled: false,
                runtimeConnected: false,
                mode: "interface-preview"
            };
        }
    };
})();
