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
                downloadState: status?.downloadState || (status?.downloading ? "downloading" : "idle"),
                downloadMessage: status?.downloadMessage || "",
                downloadedBytes: Number(status?.downloadedBytes || 0),
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
            if (event.state === "downloading") {
                button.dataset.downloading = "true";
                button.textContent = "Pausar download";
                button.disabled = false;
            } else if (event.state === "verifying") {
                button.dataset.downloading = "true";
                button.textContent = "Verificando modelo…";
                button.disabled = true;
                statusText.textContent = event.message || "Download concluído. Verificando a integridade do modelo…";
            } else if (event.state === "installing") {
                button.dataset.downloading = "true";
                button.textContent = "Finalizando…";
                button.disabled = true;
                statusText.textContent = event.message || "Verificação concluída. Salvando o modelo…";
            } else if (event.state === "completed") {
                fill.style.width = "100%";
                progress.setAttribute("aria-valuenow", "100");
                statusText.textContent = "Modelo baixado e verificado. Agora carregue-o para iniciar a conversa offline.";
                button.textContent = "Modelo instalado";
                button.disabled = true;
                button.dataset.downloading = "false";
                if (controls.querySelector(".orbia-ai-remove-model")) return;
                const removeButton = document.createElement("button");
                removeButton.classList.add("orbia-ai-remove-model");
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
                button.dataset.downloading = "false";
                statusText.textContent = "Download pausado. Toque em continuar para retomar de onde parou.";
                button.textContent = "Continuar download";
                button.disabled = false;
            } else if (event.state === "error") {
                button.dataset.downloading = "false";
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
                const started = await api.startModelDownload();
                if (started?.alreadyInstalled) {
                    setState({ state: "completed" });
                    return;
                }
                button.dataset.downloading = "true";
                button.textContent = "Pausar download";
                button.disabled = false;
                pollDownloadStatus();
            } catch (error) {
                statusText.textContent = error.message || "Não foi possível iniciar o download.";
                button.textContent = "Tentar novamente";
                button.disabled = false;
            }
        });

        let pollTimer = null;
        let pollActive = false;
        async function pollDownloadStatus() {
            if (pollActive) return;
            pollActive = true;
            try {
                const current = await api.getStatus();
                const state = current.downloadState;
                if (state === "verifying" || state === "installing") {
                    setState({ state, message: current.downloadMessage });
                } else if (state === "completed" || current.modelInstalled) {
                    setState({ state: "completed" });
                } else if (state === "error") {
                    setState({ state: "error", message: current.downloadMessage });
                } else if (state === "cancelled") {
                    setState({ state: "cancelled" });
                } else if (current.downloading) {
                    button.dataset.downloading = "true";
                    button.textContent = "Pausar download";
                    button.disabled = false;
                    if (current.downloadedBytes > 0) setProgress({
                        downloadedBytes: current.downloadedBytes,
                        totalBytes: 0,
                        progress: -1
                    });
                }
                if (current.downloading || state === "verifying" || state === "installing") {
                    pollTimer = window.setTimeout(() => {
                        pollActive = false;
                        pollDownloadStatus();
                    }, 1200);
                } else {
                    pollActive = false;
                    if (pollTimer) window.clearTimeout(pollTimer);
                }
            } catch (_) {
                pollActive = false;
                pollTimer = window.setTimeout(pollDownloadStatus, 2500);
            }
        }

        api.onDownloadProgress(setProgress).catch(() => {});
        api.onDownloadState(event => {
            setState(event);
            if (event.state === "completed" || event.state === "error" || event.state === "cancelled") {
                button.dataset.downloading = "false";
                pollDownloadStatus();
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
            } else if (status.downloading || ["verifying", "installing"].includes(status.downloadState)) {
                button.dataset.downloading = "true";
                setState({ state: status.downloadState || "downloading", message: status.downloadMessage });
                pollDownloadStatus();
            } else if (status.downloadState === "error") {
                setState({ state: "error", message: status.downloadMessage });
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

        // Atualiza o painel mesmo se o evento de conclusão do download tiver sido
        // emitido antes de o listener ficar pronto ou se o app voltar do segundo plano.
        let statusPollTimer = null;
        let statusPollStopped = false;

        async function syncRuntimeStatus() {
            try {
                const current = await api.getStatus();
                const installed = Boolean(current.modelInstalled);
                const connected = Boolean(current.runtimeConnected);
                const runtimeAvailable = Boolean(current.runtimeAvailable);

                loadButton.hidden = connected;
                unloadButton.hidden = !connected;
                loadButton.disabled = !installed || !runtimeAvailable ||
                    Boolean(current.modelLoading) || Boolean(current.downloading);

                if (connected) {
                    status.textContent = "IA carregada e pronta neste aparelho. As respostas são processadas localmente.";
                    createChatControls();
                    statusPollStopped = true;
                } else if (!runtimeAvailable) {
                    status.textContent = installed
                        ? (current.message || "O runtime llama.cpp não foi carregado neste APK. Instale a versão mais recente do ORBIA.")
                        : "Aguardando o modelo ser baixado. O runtime local será verificado automaticamente.";
                } else if (installed) {
                    status.textContent = current.modelLoading
                        ? "Carregando a IA na memória…"
                        : "Modelo instalado. Toque em “Carregar IA neste celular” para iniciar.";
                    statusPollStopped = true;
                } else if (current.downloading) {
                    status.textContent = "Download em andamento. A opção de carregar será liberada assim que a verificação terminar.";
                } else {
                    status.textContent = "Baixe o modelo para habilitar a conversa local.";
                }

                if (!statusPollStopped && !statusPollTimer) {
                    statusPollTimer = window.setTimeout(() => {
                        statusPollTimer = null;
                        syncRuntimeStatus();
                    }, 1500);
                }
            } catch (_) {
                status.textContent = "Não foi possível consultar o estado da IA. Tentando novamente…";
                if (!statusPollTimer) {
                    statusPollTimer = window.setTimeout(() => {
                        statusPollTimer = null;
                        syncRuntimeStatus();
                    }, 2500);
                }
            }
        }

        api.onDownloadState(event => {
            if (event.state === "completed" || event.state === "error" || event.state === "cancelled") {
                statusPollStopped = false;
                if (statusPollTimer) {
                    window.clearTimeout(statusPollTimer);
                    statusPollTimer = null;
                }
                syncRuntimeStatus();
            }
        }).catch(() => {});

        // Primeira leitura imediata e nova leitura enquanto o modelo ainda não
        // estiver instalado, evitando depender exclusivamente de eventos nativos.
        syncRuntimeStatus();
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
        const conversationHistory = [];

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
                const recentContext = conversationHistory.slice(-3).map(turn => `Usuário: ${turn.user}\\nÓrbia: ${turn.assistant}`).join("\\n");
                const fullPrompt = recentContext ? `${recentContext}\\nUsuário: ${prompt}\\nÓrbia:` : prompt;
                const result = await api.generate({ prompt: fullPrompt, maxTokens: 192, temperature: 0.7 });
                if (!activeAssistant.textContent && result?.text) activeAssistant.textContent = result.text;
                if (!activeAssistant.textContent) activeAssistant.textContent = "Resposta interrompida.";
                else conversationHistory.push({ user: prompt, assistant: activeAssistant.textContent });
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
