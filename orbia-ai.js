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
            const detail = error?.message || String(error || "Erro nativo sem detalhes.");
            console.error("[ORBIA IA] Falha ao consultar getStatus().", error);
            return {
                available: false,
                downloadAvailable: false,
                modelInstalled: false,
                runtimeConnected: false,
                runtimeAvailable: false,
                modelLoading: false,
                downloading: false,
                mode: "error",
                errorMessage: detail,
                message: "Não foi possível consultar o mecanismo local: " + detail
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

    const DIAGNOSTIC_KEY = "orbia.ai.diagnostics.v1";

    function readDiagnostics() {
        try { return JSON.parse(localStorage.getItem(DIAGNOSTIC_KEY) || "null"); }
        catch (_) { return null; }
    }

    function saveDiagnostics(data) {
        try {
            data.updatedAt = new Date().toISOString();
            localStorage.setItem(DIAGNOSTIC_KEY, JSON.stringify(data));
        } catch (error) {
            console.warn("[ORBIA IA] Não foi possível salvar o diagnóstico local.", error);
        }
    }

    function createDiagnosticControls() {
        const card = document.getElementById("orbia-ai-install-card");
        if (!card || card.querySelector("#orbia-ai-diagnostic-panel")) return;

        const panel = document.createElement("section");
        panel.id = "orbia-ai-diagnostic-panel";
        panel.className = "orbia-ai-runtime-controls";
        panel.hidden = true;
        panel.innerHTML = `
            <p><strong>Diagnóstico da IA</strong></p>
            <p id="orbia-ai-diagnostic-message" aria-live="polite"></p>
            <button type="button" class="settings-button secondary" id="orbia-ai-copy-diagnostic">Copiar diagnóstico</button>
            <button type="button" class="settings-button secondary" id="orbia-ai-clear-diagnostic">Limpar diagnóstico</button>
        `;
        card.appendChild(panel);

        const message = panel.querySelector("#orbia-ai-diagnostic-message");
        const copy = panel.querySelector("#orbia-ai-copy-diagnostic");
        const clear = panel.querySelector("#orbia-ai-clear-diagnostic");

        function refresh() {
            const data = readDiagnostics();
            if (!data || (!data.pending && !data.error)) {
                panel.hidden = true;
                return;
            }
            panel.hidden = false;
            if (data.pending) {
                message.textContent = "A sessão anterior foi interrompida durante: " +
                    (data.stage || "uma operação da IA") +
                    ". O aplicativo foi fechado ou reiniciado antes de concluir.";
            } else {
                message.textContent = "Última falha registrada: " + (data.error || "erro sem detalhes") +
                    (data.stage ? " · Etapa: " + data.stage : "");
            }
        }

        copy.addEventListener("click", async () => {
            const report = JSON.stringify(readDiagnostics() || {}, null, 2);
            try {
                await navigator.clipboard.writeText(report);
                copy.textContent = "Diagnóstico copiado";
            } catch (_) {
                const field = document.createElement("textarea");
                field.value = report;
                panel.appendChild(field);
                field.select();
                try {
                    document.execCommand("copy");
                    copy.textContent = "Diagnóstico copiado";
                } catch (error) {
                    message.textContent = report;
                }
                field.remove();
            }
        });

        clear.addEventListener("click", () => {
            try { localStorage.removeItem(DIAGNOSTIC_KEY); } catch (_) {}
            copy.textContent = "Copiar diagnóstico";
            refresh();
        });

        window.addEventListener("error", event => {
            const previous = readDiagnostics() || {};
            saveDiagnostics({
                pending: false,
                stage: "JavaScript",
                error: event.message || "Erro JavaScript não identificado",
                source: event.filename || "",
                line: event.lineno || 0,
                previousStage: previous.stage || ""
            });
            refresh();
        });

        window.addEventListener("unhandledrejection", event => {
            const previous = readDiagnostics() || {};
            const reason = event.reason;
            saveDiagnostics({
                pending: false,
                stage: "Promise",
                error: reason?.message || String(reason || "Falha assíncrona sem detalhes"),
                previousStage: previous.stage || ""
            });
            refresh();
        });

        refresh();
        return { refresh };
    }

    const diagnosticUI = createDiagnosticControls();

    function markDiagnostic(stage) {
        const previous = readDiagnostics() || {};
        saveDiagnostics({
            pending: true,
            stage,
            startedAt: new Date().toISOString(),
            lastError: previous.error || ""
        });
        diagnosticUI?.refresh();
    }

    function finishDiagnostic() {
        try { localStorage.removeItem(DIAGNOSTIC_KEY); } catch (_) {}
        diagnosticUI?.refresh();
    }

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

        // A listener failure must not interrupt creation of the runtime controls.
        try {
            Promise.resolve(api.onDownloadProgress(setProgress)).catch(() => {});
        } catch (error) {
            console.warn("[ORBIA IA] Não foi possível registrar o progresso do download.", error);
        }
        try {
            Promise.resolve(api.onDownloadState(event => {
                setState(event);
                if (event.state === "completed" || event.state === "error" || event.state === "cancelled") {
                    button.dataset.downloading = "false";
                    pollDownloadStatus();
                }
            })).catch(() => {});
        } catch (error) {
            console.warn("[ORBIA IA] Não foi possível registrar os estados do download.", error);
        }

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
            if (current.mode === "error") {
                loadButton.disabled = true;
                loadButton.hidden = false;
                unloadButton.hidden = true;
                status.textContent = current.message || "Falha ao consultar o mecanismo local.";
                console.error("[ORBIA IA] Estado do runtime indisponível.", current.errorMessage || current);
                return;
            }
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

        try {
            Promise.resolve(api.onDownloadState(event => {
                if (event.state === "completed") refresh();
            })).catch(() => {});
        } catch (error) {
            console.warn("[ORBIA IA] Não foi possível registrar a atualização do runtime.", error);
        }

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
        }).catch(error => {
            loadButton.disabled = true;
            status.textContent = "Falha ao consultar o runtime: " + (error?.message || String(error));
            console.error("[ORBIA IA] Erro inesperado na consulta inicial do runtime.", error);
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

        function getAppContext() {
            const app = window.OrbiaAppActions;
            if (!app) return "Os módulos de Metas, Hábitos e Agenda ainda não estão disponíveis.";
            try {
                return JSON.stringify({
                    metas: app.getGoals?.() || [],
                    habitos: (app.getHabits?.() || []).map(item => ({
                        name: item.name, frequency: item.frequency,
                        weeklyGoal: item.weeklyGoal, completedDates: item.completedDates
                    })),
                    atividades: (app.getActivities?.() || []).slice(-12)
                }).slice(0, 3500);
            } catch (error) {
                console.warn("[ORBIA IA] Não foi possível montar o contexto do aplicativo.", error);
                return "Não foi possível consultar os dados do aplicativo.";
            }
        }

        function parseAppAction(message) {
            const text = String(message || "").trim();
            const habitMatch = text.match(/^(?:por favor,?\s*)?(?:quero\s+)?(?:crie|criar|adicione|adicionar|cadastre|cadastrar)\s+(?:um\s+)?h[aá]bito(?:\s+de)?\s+(.+)$/i);
            if (habitMatch) {
                const frequencyMatch = habitMatch[1].match(/\b([1-7])\s*(?:vezes?|x)\s*(?:por|na)\s*semana\b/i);
                if (!frequencyMatch) return null;
                const count = Number(frequencyMatch[1]);
                const name = habitMatch[1].replace(/\b[1-7]\s*(?:vezes?|x)\s*(?:por|na)\s*semana\b/i, "").replace(/[,.!?]+$/, "").trim();
                if (!name) return null;
                const dayOptions = { 1: [1], 2: [1,4], 3: [1,3,5], 4: [1,2,4,5], 5: [1,2,3,4,5], 6: [1,2,3,4,5,6], 7: [0,1,2,3,4,5,6] };
                const days = dayOptions[count];
                return {
                    type: "createHabit",
                    data: { name, frequency: count === 7 ? "daily" : "custom", daysOfWeek: days, weeklyGoal: count },
                    description: "Criar o hábito \"" + name + "\" " + count + " vez(es) por semana. Dias sugeridos: " + days.map(day => ["domingo","segunda","terça","quarta","quinta","sexta","sábado"][day]).join(", ")
                };
            }

            const goalMatch = text.match(/^(?:por favor,?\s*)?(?:quero\s+)?(?:crie|criar|adicione|adicionar|cadastre|cadastrar)\s+(?:uma\s+)?meta\s+(?:de\s+)?(.+)$/i);
            if (goalMatch) {
                const amount = goalMatch[1].match(/\b(\d+(?:[.,]\d+)?)\s*(\p{L}+)?/u);
                if (!amount) return null;
                const target = Number(amount[1].replace(",", "."));
                const unit = amount[2] || "unidades";
                const name = goalMatch[1].trim();
                return {
                    type: "createGoal",
                    data: { name, target, unit },
                    description: "Criar a meta \"" + name + "\" com objetivo de " + target + " " + unit + "."
                };
            }

            const completeHabitMatch = text.match(/^(?:marque|marcar|conclua|concluir)\s+(?:o\s+)?h[aá]bito\s+(.+?)(?:\s+como\s+conclu[ií]do)?(?:\s+hoje)?[.!]?$/i);
            if (completeHabitMatch) {
                return {
                    type: "completeHabit",
                    data: { name: completeHabitMatch[1].trim() },
                    description: "Marcar o hábito \"" + completeHabitMatch[1].trim() + "\" como concluído hoje."
                };
            }

            const progressMatch = text.match(/^(?:atualize|atualizar|registre|registrar)\s+(?:o\s+)?progresso\s+(?:da\s+)?meta\s+(.+?)\s+para\s+(\\d+(?:[.,]\\d+)?)$/i);
            if (progressMatch) {
                return {
                    type: "updateGoalProgress",
                    data: { name: progressMatch[1].trim(), current: Number(progressMatch[2].replace(",", ".")) },
                    description: "Atualizar o progresso da meta \"" + progressMatch[1].trim() + "\" para " + progressMatch[2] + "."
                };
            }

            const activityMatch = text.match(/^(?:por favor,?\s*)?(?:crie|criar|adicione|adicionar|agende|agendar)\s+(?:uma\s+)?atividade\s+(.+?)\s+(?:para|no dia|dia)\s+(\d{2})\/(\d{2})\/(\d{4})\s+às?\s+(\d{1,2}:\d{2})$/i);
            if (activityMatch) {
                const [, name, day, month, year, rawTime] = activityMatch;
                const date = year + "-" + month + "-" + day;
                const time = rawTime.padStart(5, "0");
                return {
                    type: "createActivity",
                    data: { name: name.trim(), date, time },
                    description: "Adicionar a atividade \"" + name.trim() + "\" em " + day + "/" + month + "/" + year + " às " + time + "."
                };
            }

            return null;
        }

        function showActionConfirmation(action) {
            const paragraph = addMessage("assistant", "Posso fazer isso no seu Órbia? Confira os detalhes:");
            const bubble = paragraph.parentElement;
            const details = document.createElement("p");
            details.textContent = action.description;
            bubble.appendChild(details);

            const actions = document.createElement("div");
            actions.className = "orbia-ai-chat-actions";
            const confirm = document.createElement("button");
            confirm.type = "button";
            confirm.className = "settings-button";
            confirm.textContent = "Confirmar e salvar";
            const cancel = document.createElement("button");
            cancel.type = "button";
            cancel.className = "settings-button secondary";
            cancel.textContent = "Cancelar";
            actions.append(confirm, cancel);
            bubble.appendChild(actions);

            confirm.addEventListener("click", () => {
                confirm.disabled = true;
                cancel.disabled = true;
                try {
                    const app = window.OrbiaAppActions;
                    const result = app[action.type](action.data);
                    details.textContent = "Pronto! Salvei no Órbia: " +
                        (result.name || result.title || action.data.name || "ação concluída") + ".";
                    confirm.remove();
                    cancel.remove();
                } catch (error) {
                    details.textContent = "Não consegui salvar: " + (error.message || String(error));
                    confirm.disabled = false;
                    cancel.disabled = false;
                }
            });
            cancel.addEventListener("click", () => {
                details.textContent = "Tudo bem. Não fiz nenhuma alteração.";
                actions.remove();
            });
            log.scrollTop = log.scrollHeight;
        }

        // Capacitor listener registration may return either a Promise or a
        // listener handle, depending on the bridge/runtime version.
        try {
            const generationListener = api.onGenerationToken(event => {
                if (activeAssistant && typeof event.token === "string") {
                    activeAssistant.textContent += event.token;
                    log.scrollTop = log.scrollHeight;
                }
            });
            if (generationListener && typeof generationListener.catch === "function") {
                generationListener.catch(error => {
                    const previous = readDiagnostics() || {};
                    saveDiagnostics({
                        pending: false,
                        stage: "registro do evento de geração",
                        error: error?.message || String(error || "Não foi possível registrar o evento generationToken."),
                        previousStage: previous.stage || ""
                    });
                    diagnosticUI?.refresh();
                    console.warn("[ORBIA IA] Falha ao registrar generationToken.", error);
                });
            }
        } catch (error) {
            const previous = readDiagnostics() || {};
            saveDiagnostics({
                pending: false,
                stage: "registro do evento de geração",
                error: error?.message || String(error || "Não foi possível registrar o evento generationToken."),
                previousStage: previous.stage || ""
            });
            diagnosticUI?.refresh();
            console.warn("[ORBIA IA] Falha ao registrar generationToken.", error);
        }

        form.addEventListener("submit", async event => {
            event.preventDefault();
            const prompt = input.value.trim();
            if (!prompt || send.disabled) return;
            addMessage("user", prompt);
            input.value = "";

            const proposedAction = parseAppAction(prompt);
            if (proposedAction && window.OrbiaAppActions) {
                showActionConfirmation(proposedAction);
                return;
            }

            activeAssistant = addMessage("assistant", "");
            send.disabled = true;
            stop.hidden = false;
            try {
                const recentContext = conversationHistory.slice(-3).map(turn => `Usuário: ${turn.user}\\nÓrbia: ${turn.assistant}`).join("\\n");
                const appContext = getAppContext();
                const instructions = "Você é a Órbia, companheira, mentora e assistente pessoal. Responda em português brasileiro, com acolhimento e objetividade. Ajude a pessoa a definir metas, hábitos e organizar a agenda. Use os dados reais abaixo para responder perguntas sobre o aplicativo. Nunca diga que criou, alterou ou concluiu algo: ações só são executadas quando o aplicativo apresenta uma confirmação explícita. Se faltarem dados, pergunte.\nDados atuais do Órbia: " + appContext;
                const fullPrompt = instructions + "\\n" + (recentContext ? recentContext + "\\n" : "") + "Usuário: " + prompt + "\\nÓrbia:";
                markDiagnostic("geração da resposta local");
                const result = await api.generate({ prompt: fullPrompt, maxTokens: 192, temperature: 0.7 });
                finishDiagnostic();
                if (!activeAssistant.textContent && result?.text) activeAssistant.textContent = result.text;
                if (!activeAssistant.textContent) activeAssistant.textContent = "Resposta interrompida.";
                else conversationHistory.push({ user: prompt, assistant: activeAssistant.textContent });
            } catch (error) {
                saveDiagnostics({
                    pending: false,
                    stage: "geração da resposta local",
                    error: error?.message || String(error || "Falha sem detalhes")
                });
                diagnosticUI?.refresh();
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
        // Build the load panel first: a download-listener error must never hide it.
        try {
            createRuntimeControls();
        } catch (error) {
            console.error("[ORBIA IA] Falha ao criar os controles de carregamento.", error);
        }
        try {
            createDownloadControls();
        } catch (error) {
            console.error("[ORBIA IA] Falha ao criar os controles de download.", error);
        }
    }
})();
