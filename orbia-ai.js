(() => {
    "use strict";

    const section = document.getElementById("ai-section");
    if (!section) return;

    // Contrato público entre a interface web e o futuro plugin Android.
    // A ausência do plugin é tratada explicitamente: nunca simular inferência.
    const plugin = () => window.Capacitor?.Plugins?.OrbiaLocalAI || null;

    async function getStatus() {
        const native = plugin();
        if (!native) {
            return {
                available: false,
                modelInstalled: false,
                runtimeConnected: false,
                mode: "not-installed",
                message: "O mecanismo de IA local ainda não está incluído nesta versão."
            };
        }

        try {
            const status = await native.getStatus();
            return {
                available: Boolean(status?.supported && status?.runtimeReady),
                modelInstalled: Boolean(status?.modelInstalled),
                runtimeConnected: Boolean(status?.runtimeReady),
                mode: status?.mode || "native",
                message: status?.message || ""
            };
        } catch (error) {
            return {
                available: false,
                modelInstalled: false,
                runtimeConnected: false,
                mode: "error",
                message: "Não foi possível consultar o mecanismo local."
            };
        }
    }

    async function invoke(method, options = {}) {
        const native = plugin();
        if (!native || typeof native[method] !== "function") {
            throw new Error("O mecanismo de IA local não está disponível nesta versão.");
        }
        return native[method](options);
    }

    window.OrbiaAI = Object.freeze({
        getStatus,
        // Métodos ficam disponíveis quando o plugin nativo correspondente
        // for adicionado. A interface não faz chamadas de rede para inferência.
        getModelInfo: () => invoke("getModelInfo"),
        startModelDownload: options => invoke("startModelDownload", options),
        cancelModelDownload: () => invoke("cancelModelDownload"),
        deleteModel: () => invoke("deleteModel"),
        loadModel: options => invoke("loadModel", options),
        unloadModel: () => invoke("unloadModel"),
        generate: options => invoke("generate", options),
        stopGeneration: () => invoke("stopGeneration")
    });
})();
