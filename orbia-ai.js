(() => {
    "use strict";

    const section = document.getElementById("ai-section");
    if (!section) return;

    const plugin = () => window.Capacitor?.Plugins?.OrbiaLocalAI || null;

    async function getStatus() {
        const native = plugin();
        if (!native) {
            return {
                available: false,
                downloadAvailable: false,
                modelInstalled: false,
                runtimeConnected: false,
                downloading: false,
                mode: "not-installed",
                message: "O mecanismo de IA local não está incluído nesta versão."
            };
        }

        try {
            const status = await native.getStatus();
            return {
                available: Boolean(status?.supported && status?.runtimeReady),
                downloadAvailable: Boolean(status?.supported),
                modelInstalled: Boolean(status?.modelInstalled),
                runtimeConnected: Boolean(status?.runtimeReady),
                downloading: Boolean(status?.downloading),
                mode: status?.mode || "native",
                message: status?.message || ""
            };
        } catch (error) {
            return {
                available: false,
                downloadAvailable: false,
                modelInstalled: false,
                runtimeConnected: false,
                downloading: false,
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

    const api = {
        getStatus,
        getModelInfo: () => invoke("getModelInfo"),
        startModelDownload: options => invoke("startModelDownload", options),
        cancelModelDownload: () => invoke("cancelModelDownload"),
        deleteModel: () => invoke("deleteModel"),
        loadModel: options => invoke("loadModel", options),
        unloadModel: () => invoke("unloadModel"),
        generate: options => invoke("generate", options),
        stopGeneration: () => invoke("stopGeneration"),
        onDownloadProgress: callback => {
            const native = plugin();
            if (!native?.addListener) throw new Error("Eventos nativos não disponíveis.");
            return native.addListener("modelDownloadProgress", callback);
        },
        onDownloadState: callback => {
            const native = plugin();
            if (!native?.addListener) throw new Error("Eventos nativos não disponíveis.");
            return native.addListener("modelDownloadState", callback);
        }
    };
    window.OrbiaAI = Object.freeze(api);

    function createDownloadControls() {
        const card = document.getElementById("orbia-ai-install-card");
        if (!card || card.querySelector("#orbia-ai-download-button")) return;

        const controls = document.createElement("div");
        controls.className = "orbia-ai-download-controls";
        controls.innerHTML = `
            <div class="orbia-ai-download-meta">
                <span>Qwen2.5 · GGUF · Q4_0</span>
                <strong>aprox. 429 MB</strong>
            </div>
            <div class="orbia-ai-download-track" role="progressbar" aria-label="Download do modelo" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
                <div class="orbia-ai-download-fill"></div>
            </div>
            <p class="orbia-ai-download-status" aria-live="polite">O modelo ainda não foi baixado.</p>
            <button type="button" class="settings-button" id="orbia-ai-download-button">Baixar modelo (429 MB)</button>
            <p class="orbia-ai-download-footnote">O arquivo será salvo no armazenamento privado do aplicativo. Recomendamos Wi-Fi e espaço livre suficiente.</p>
        `;
        card.appendChild(controls);

        const button = controls.querySelector("#orbia-ai-download-button");
        const statusText = controls.querySelector(".orbia-ai-download-status");
        const progress = controls.querySelector(".orbia-ai-download-track");
        const fill = controls.querySelector(".orbia-ai-download-fill");

        const formatBytes = value => {
            if (!Number.isFinite(value) || value < 0) return "";
            return (value / (1024 * 1024)).toFixed(1) + " MB";
        };

        function setProgress(event) {
            const percent = Number(event.progress);
            if (percent >= 0) {
                fill.style.width = Math.min(100, percent) + "%";
                progress.setAttribute("aria-valuenow", String(Math.round(percent)));
                statusText.textContent = `Baixando: ${formatBytes(event.downloadedBytes)} de ${formatBytes(event.totalBytes)} · ${Math.round(percent)}%`;
            } else {
                statusText.textContent = `Baixando: ${formatBytes(event.downloadedBytes)}`;
            }
        }

        function setState(event) {
            if (event.state === "completed") {
                fill.style.width = "100%";
                progress.setAttribute("aria-valuenow", "100");
                statusText.textContent = "Modelo baixado e verificado. A conversa ainda depende da integração do motor local.";
                button.textContent = "Modelo instalado";
                button.disabled = true;
            } else if (event.state === "cancelled") {
                statusText.textContent = "Download pausado. Toque em continuar para retomar de onde parou.";
                button.textContent = "Continuar download";
                button.disabled = false;
            } else if (event.state === "error") {
                statusText.textContent = "Não foi possível concluir: " + (event.message || "erro no download.");
                button.textContent = "Tentar novamente";
                button.disabled = false;
            }
        }

        button.addEventListener("click", async () => {
            if (button.dataset.downloading === "true") {
                button.disabled = true;
                try {
                    await api.cancelModelDownload();
                    statusText.textContent = "Solicitando pausa do download…";
                } catch (error) {
                    statusText.textContent = error.message;
                    button.disabled = false;
                }
                return;
            }

            const accepted = window.confirm(
                "O modelo ocupa aproximadamente 429 MB. O download usa internet, mas suas conversas não serão enviadas para servidores. Recomendamos Wi-Fi. Deseja continuar?"
            );
            if (!accepted) return;

            button.disabled = true;
            statusText.textContent = "Iniciando download seguro…";
            try {
                await api.startModelDownload();
                button.dataset.downloading = "true";
                button.textContent = "Pausar download";
                button.disabled = false;
            } catch (error) {
                statusText.textContent = error.message || "Não foi possível iniciar o download.";
                button.textContent = "Tentar novamente";
                button.disabled = false;
            }
        });

        api.onDownloadProgress(setProgress).catch(() => {});
        api.onDownloadState(event => {
            setState(event);
            if (event.state !== "downloading") {
                button.dataset.downloading = "false";
            }
        }).catch(() => {});

        api.getStatus().then(status => {
            if (status.modelInstalled) {
                fill.style.width = "100%";
                progress.setAttribute("aria-valuenow", "100");
                statusText.textContent = "Modelo já instalado e armazenado neste aparelho.";
                button.textContent = "Modelo instalado";
                button.disabled = true;
            } else if (status.downloading) {
                button.dataset.downloading = "true";
                button.textContent = "Pausar download";
            }
        }).catch(() => {});
    }

    if (plugin()) createDownloadControls();
})();
