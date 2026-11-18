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
                runtimeAvailable: Boolean(status?.nativeRuntimeAvailable),
                modelLoading: Boolean(status?.modelLoading),
                generationInProgress: Boolean(status?.generationInProgress),
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
        },
        onGenerationToken: callback => {
            const native = plugin();
            if (!native?.addListener) throw new Error("Eventos nativos não disponíveis.");
            return native.addListener("generationToken", callback);
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
                statusText.textContent = "Modelo baixado e verificado. Agora carregue-o para iniciar a conversa offline.";
                button.textContent = "Modelo instalado";
                button.disabled = true;
                const removeButton = document.createElement("button");
                removeButton.type = "button";
                removeButton.className = "settings-button secondary";
                removeButton.textContent = "Remover modelo do aparelho";
                removeButton.addEventListener("click", async () => {
                    if (!window.confirm("Deseja remover o arquivo de IA deste aparelho? Seus dados do ORBIA não serão apagados.")) return;
                    removeButton.disabled = true;
                    try {
                        const current = await api.getStatus();
                        if (current.runtimeConnected) await api.unloadModel();
                        await api.deleteModel();
                        fill.style.width = "0";
                        progress.setAttribute("aria-valuenow", "0");
                        statusText.textContent = "Modelo removido do armazenamento privado.";
                        button.textContent = "Baixar modelo (429 MB)";
                        button.disabled = false;
                        removeButton.remove();
                    } catch (error) {
                        statusText.textContent = error.message || "Não foi possível remover o modelo.";
                        removeButton.disabled = false;
                    }
                });
                controls.appendChild(removeButton);
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
                const removeButton = document.createElement("button");
                removeButton.type = "button";
                removeButton.className = "settings-button secondary";
                removeButton.textContent = "Remover modelo do aparelho";
                removeButton.addEventListener("click", async () => {
                    if (!window.confirm("Deseja remover o arquivo de IA deste aparelho? Seus dados do ORBIA não serão apagados.")) return;
                    removeButton.disabled = true;
                    try {
                        const current = await api.getStatus();
                        if (current.runtimeConnected) await api.unloadModel();
                        await api.deleteModel();
                        fill.style.width = "0";
                        progress.setAttribute("aria-valuenow", "0");
                        statusText.textContent = "Modelo removido do armazenamento privado.";
                        button.textContent = "Baixar modelo (429 MB)";
                        button.disabled = false;
                        removeButton.remove();
                    } catch (error) {
                        statusText.textContent = error.message || "Não foi possível remover o modelo.";
                        removeButton.disabled = false;
                    }
                });
                controls.appendChild(removeButton);
            } else if (status.downloading) {
                button.dataset.downloading = "true";
                button.textContent = "Pausar download";
            }
        }).catch(() => {});
    }


    function createRuntimeControls() {
        const card = document.getElementById("orbia-ai-install-card");
        if (!card || card.querySelector("#orbia-ai-load-button")) return;

        const panel = document.createElement("div");
        panel.className = "orbia-ai-runtime-controls";
        panel.innerHTML = `
            <p class="orbia-ai-runtime-status" aria-live="polite">Verificando o runtime local…</p>
            <button type="button" class="settings-button" id="orbia-ai-load-button" disabled>Carregar IA neste celular</button>
            <button type="button" class="settings-button secondary" id="orbia-ai-unload-button" hidden>Descarregar IA da memória</button>
        `;
        card.appendChild(panel);

        const status = panel.querySelector(".orbia-ai-runtime-status");
        const loadButton = panel.querySelector("#orbia-ai-load-button");
        const unloadButton = panel.querySelector("#orbia-ai-unload-button");

        async function refresh() {
            const current = await api.getStatus();
            loadButton.disabled = !current.modelInstalled || !current.runtimeAvailable || current.modelLoading;
            loadButton.hidden = current.runtimeConnected;
            unloadButton.hidden = !current.runtimeConnected;
            if (current.runtimeConnected) status.textContent = "IA carregada e pronta. As respostas são processadas no próprio aparelho.";
            else if (!current.runtimeAvailable) status.textContent = "Este APK não contém o runtime llama.cpp. Será necessário instalar uma versão atualizada.";
            else if (current.modelInstalled) status.textContent = "Modelo instalado. Carregue-o para começar (contexto inicial de 1.024 tokens).";
            else status.textContent = "Baixe o modelo para habilitar a conversa local.";
        }

        loadButton.addEventListener("click", async () => {
            loadButton.disabled = true;
            status.textContent = "Carregando o modelo na memória… isso pode levar alguns segundos.";
            try {
                await api.loadModel({ contextSize: 1024, threads: 3 });
                status.textContent = "IA carregada. Pode começar a conversar offline.";
                await refresh();
                createChatControls();
            } catch (error) {
                status.textContent = error.message || "Não foi possível carregar o modelo. O aparelho pode estar sem memória.";
                loadButton.disabled = false;
            }
        });

        unloadButton.addEventListener("click", async () => {
            unloadButton.disabled = true;
            try {
                await api.unloadModel();
                status.textContent = "IA descarregada da memória.";
                await refresh();
            } catch (error) {
                status.textContent = error.message || "Não foi possível descarregar a IA.";
                unloadButton.disabled = false;
            }
        });

        api.onDownloadState(event => { if (event.state === "completed") refresh(); }).catch(() => {});

        api.getStatus().then(current => {
            if (current.modelInstalled) {
                loadButton.disabled = !current.runtimeAvailable;
                loadButton.hidden = current.runtimeConnected;
                unloadButton.hidden = !current.runtimeConnected;
                status.textContent = current.runtimeConnected
                    ? "IA carregada e pronta neste aparelho."
                    : (current.runtimeAvailable ? "Modelo instalado. Carregue-o para conversar." : "Runtime nativo ausente neste APK.");
                if (current.runtimeConnected) createChatControls();
            }
        }).catch(() => {
            status.textContent = "Não foi possível consultar o estado do runtime.";
        });
    }

    function createChatControls() {
        const card = document.getElementById("orbia-ai-install-card");
        if (!card || card.querySelector("#orbia-ai-chat-form")) return;

        const chat = document.createElement("div");
        chat.className = "orbia-ai-local-chat";
        chat.innerHTML = `
            <div class="orbia-ai-local-chat-log" id="orbia-ai-chat-log" aria-live="polite">
                <div class="orbia-ai-local-assistant"><strong>Órbia</strong><p>Estou pronta para conversar com você. Esta conversa é processada localmente neste aparelho.</p></div>
            </div>
            <form id="orbia-ai-chat-form">
                <textarea id="orbia-ai-chat-input" rows="2" maxlength="3000" placeholder="Escreva sua mensagem…" aria-label="Sua mensagem"></textarea>
                <div class="orbia-ai-chat-actions">
                    <button type="button" class="settings-button secondary" id="orbia-ai-stop-button" hidden>Parar resposta</button>
                    <button type="submit" class="settings-button" id="orbia-ai-send-button">Enviar</button>
                </div>
            </form>
            <p class="orbia-ai-download-footnote">Modelo compacto de 0,5 bilhão de parâmetros. As respostas podem ser mais simples e lentas que serviços de IA na nuvem.</p>
        `;
        card.appendChild(chat);

        const form = chat.querySelector("#orbia-ai-chat-form");
        const input = chat.querySelector("#orbia-ai-chat-input");
        const log = chat.querySelector("#orbia-ai-chat-log");
        const send = chat.querySelector("#orbia-ai-send-button");
        const stop = chat.querySelector("#orbia-ai-stop-button");
        let activeAssistant = null;

        function addMessage(kind, text) {
            const bubble = document.createElement("div");
            bubble.className = kind === "user" ? "orbia-ai-local-user" : "orbia-ai-local-assistant";
            if (kind === "assistant") {
                const heading = document.createElement("strong");
                heading.textContent = "Órbia";
                bubble.appendChild(heading);
            }
            const paragraph = document.createElement("p");
            paragraph.textContent = text || "";
            bubble.appendChild(paragraph);
            log.appendChild(bubble);
            log.scrollTop = log.scrollHeight;
            return paragraph;
        }

        api.onGenerationToken(event => {
            if (activeAssistant && typeof event.token === "string") {
                activeAssistant.textContent += event.token;
                log.scrollTop = log.scrollHeight;
            }
        }).catch(() => {});

        form.addEventListener("submit", async event => {
            event.preventDefault();
            const prompt = input.value.trim();
            if (!prompt || send.disabled) return;
            addMessage("user", prompt);
            input.value = "";
            activeAssistant = addMessage("assistant", "");
            send.disabled = true;
            stop.hidden = false;
            try {
                const result = await api.generate({ prompt, maxTokens: 192, temperature: 0.7 });
                if (!activeAssistant.textContent && result?.text) activeAssistant.textContent = result.text;
                if (!activeAssistant.textContent) activeAssistant.textContent = "Resposta interrompida.";
            } catch (error) {
                activeAssistant.textContent = error.message || "Não consegui gerar uma resposta local.";
            } finally {
                send.disabled = false;
                stop.hidden = true;
                activeAssistant = null;
                input.focus();
            }
        });

        stop.addEventListener("click", async () => {
            stop.disabled = true;
            try { await api.stopGeneration(); }
            catch (error) { status.textContent = error.message || "Não foi possível interromper a resposta."; }
            stop.disabled = false;
        });
    }

    if (plugin()) {
        createDownloadControls();
        createRuntimeControls();
    }
})();
