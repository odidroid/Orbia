
/* ==========================================
   ORBIA - MÓDULO DE SONO
   Registro, duração, média e histórico
   Armazenamento local
========================================== */

(() => {
    "use strict";

    const STORAGE_KEY = "orbia-sleep";

    const section = document.getElementById("sleep-section");

    if (!section) return;

    let sleepRecords = [];
    let editingId = null;

    /* ==========================================
       ESTILOS
    ========================================== */

    const style = document.createElement("style");

    style.textContent = `
        .sleep-panel {
            margin-top: 14px;
        }

        .sleep-summary-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin: 16px 0;
        }

        .sleep-summary-item {
            padding: 15px;
            background: var(--background);
            border: 1px solid var(--border);
            border-radius: 14px;
        }

        .sleep-summary-item span {
            display: block;
            color: var(--muted);
            font-size: 11px;
            margin-bottom: 7px;
        }

        .sleep-summary-item strong {
            font-size: 20px;
            color: var(--primary);
        }

        .sleep-form {
            margin-top: 18px;
            padding: 16px;
            background: var(--background);
            border: 1px solid var(--border);
            border-radius: 15px;
        }

        .sleep-form h3,
        .sleep-history-title {
            font-size: 15px;
            margin-bottom: 13px;
            color: var(--text);
        }

        .sleep-field {
            margin-bottom: 13px;
        }

        .sleep-field label {
            display: block;
            margin-bottom: 6px;
            color: var(--muted);
            font-size: 12px;
            font-weight: 600;
        }

        .sleep-field input {
            display: block;
            width: 100%;
            min-height: 45px;
            padding: 10px;
            box-sizing: border-box;
            border: 1px solid var(--border);
            border-radius: 10px;
            background: var(--surface);
            color: var(--text);
            font-size: 14px;
        }

        .sleep-save-button {
            width: 100%;
            min-height: 46px;
            border: none;
            border-radius: 12px;
            background: var(--accent);
            color: white;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
        }

        .sleep-cancel-button {
            width: 100%;
            min-height: 42px;
            margin-top: 8px;
            border: 1px solid var(--border);
            border-radius: 12px;
            background: var(--surface);
            color: var(--text);
            font-size: 13px;
            cursor: pointer;
            display: none;
        }

        .sleep-feedback {
            display: block;
            min-height: 18px;
            margin-top: 10px;
            color: var(--accent);
            font-size: 12px;
            line-height: 1.5;
        }

        .sleep-history {
            margin-top: 22px;
        }

        .sleep-history-card {
            padding: 14px;
            margin-bottom: 10px;
            border: 1px solid var(--border);
            border-radius: 14px;
            background: var(--background);
        }

        .sleep-history-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 10px;
        }

        .sleep-history-date {
            font-size: 13px;
            font-weight: 700;
            color: var(--text);
        }

        .sleep-duration {
            color: var(--primary);
            font-size: 17px;
            font-weight: 800;
        }

        .sleep-times {
            color: var(--muted);
            font-size: 12px;
            line-height: 1.7;
        }

        .sleep-record-actions {
            display: flex;
            gap: 8px;
            margin-top: 12px;
        }

        .sleep-record-actions button {
            flex: 1;
            min-height: 35px;
            border: 1px solid var(--border);
            border-radius: 9px;
            background: var(--surface);
            color: var(--text);
            font-size: 12px;
            cursor: pointer;
        }

        .sleep-record-actions button.delete {
            color: #D9534F;
        }

        .sleep-empty {
            padding: 18px 12px;
            text-align: center;
            color: var(--muted);
            background: var(--background);
            border: 1px dashed var(--border);
            border-radius: 13px;
            font-size: 12px;
            line-height: 1.6;
        }

        .sleep-intro {
            color: var(--muted);
            font-size: 12px;
            line-height: 1.6;
            margin-top: 7px;
        }
    `;

    document.head.appendChild(style);

    /* ==========================================
       ESTRUTURA
    ========================================== */

    section.innerHTML = `
        <h2>🌙 Seu sono</h2>

        <p class="sleep-intro">
            Acompanhe suas noites de descanso e descubra
            quanto tempo você está dormindo.
        </p>

        <div class="sleep-panel">

            <div class="sleep-summary-grid">

                <div class="sleep-summary-item">
                    <span>Último registro</span>
                    <strong id="sleep-last-duration">--</strong>
                </div>

                <div class="sleep-summary-item">
                    <span>Média dos últimos 7 registros</span>
                    <strong id="sleep-average">--</strong>
                </div>

            </div>

            <form id="sleep-form" class="sleep-form">

                <h3 id="sleep-form-title">Registrar meu sono</h3>

                <div class="sleep-field">
                    <label for="sleep-date">
                        Data em que acordou
                    </label>

                    <input
                        type="date"
                        id="sleep-date"
                        required
                    >
                </div>

                <div class="sleep-field">
                    <label for="sleep-bedtime">
                        Horário em que foi dormir
                    </label>

                    <input
                        type="time"
                        id="sleep-bedtime"
                        required
                    >
                </div>

                <div class="sleep-field">
                    <label for="sleep-waketime">
                        Horário em que acordou
                    </label>

                    <input
                        type="time"
                        id="sleep-waketime"
                        required
                    >
                </div>

                <button
                    type="submit"
                    class="sleep-save-button"
                >
                    Salvar registro
                </button>

                <button
                    type="button"
                    id="sleep-cancel-edit"
                    class="sleep-cancel-button"
                >
                    Cancelar edição
                </button>

                <span
                    id="sleep-feedback"
                    class="sleep-feedback"
                    aria-live="polite"
                ></span>

            </form>

            <div class="sleep-history">

                <h3 class="sleep-history-title">
                    Histórico de sono
                </h3>

                <div id="sleep-history-list"></div>

            </div>

        </div>
    `;

    /* ==========================================
       ELEMENTOS
    ========================================== */

    const form = document.getElementById("sleep-form");
    const dateInput = document.getElementById("sleep-date");
    const bedtimeInput = document.getElementById("sleep-bedtime");
    const waketimeInput = document.getElementById("sleep-waketime");
    const feedback = document.getElementById("sleep-feedback");
    const cancelButton = document.getElementById("sleep-cancel-edit");

    /* ==========================================
       DATA LOCAL
    ========================================== */

    function getLocalDate() {
        const now = new Date();

        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    dateInput.value = getLocalDate();

    /* ==========================================
       ARMAZENAMENTO
    ========================================== */

    function loadRecords() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);

            sleepRecords = stored ? JSON.parse(stored) : [];

            if (!Array.isArray(sleepRecords)) {
                sleepRecords = [];
            }

            sleepRecords = sleepRecords.filter(record =>
                record &&
                typeof record.id !== "undefined" &&
                typeof record.date === "string" &&
                typeof record.bedtime === "string" &&
                typeof record.waketime === "string"
            );

        } catch (error) {
            console.error("Erro ao carregar registros de sono:", error);
            sleepRecords = [];
        }
    }

    function saveRecords() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(sleepRecords)
            );
            window.dispatchEvent(new Event("orbia:data-changed"));

            return true;

        } catch (error) {
            console.error("Erro ao salvar registros de sono:", error);
            feedback.textContent = "Não foi possível salvar os dados.";
            return false;
        }
    }

    /* ==========================================
       CÁLCULOS
    ========================================== */

    function getDuration(bedtime, waketime) {
        const bedParts = bedtime.split(":").map(Number);
        const wakeParts = waketime.split(":").map(Number);

        const bedMinutes = bedParts[0] * 60 + bedParts[1];
        let wakeMinutes = wakeParts[0] * 60 + wakeParts[1];

        if (wakeMinutes <= bedMinutes) {
            wakeMinutes += 24 * 60;
        }

        return wakeMinutes - bedMinutes;
    }

    function formatDuration(minutes) {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;

        return `${hours}h ${String(remainingMinutes).padStart(2, "0")}min`;
    }

    function formatDate(dateString) {
        const parts = dateString.split("-");

        if (parts.length !== 3) return dateString;

        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    /* ==========================================
       RESUMO
    ========================================== */

    function renderSummary() {
        const lastDuration = document.getElementById(
            "sleep-last-duration"
        );

        const averageElement = document.getElementById(
            "sleep-average"
        );

        const sorted = [...sleepRecords].sort((a, b) =>
            b.date.localeCompare(a.date)
        );

        if (sorted.length === 0) {
            lastDuration.textContent = "--";
            averageElement.textContent = "--";
            return;
        }

        const last = sorted[0];

        lastDuration.textContent = formatDuration(
            getDuration(last.bedtime, last.waketime)
        );

        const recentRecords = sorted.slice(0, 7);

        const totalMinutes = recentRecords.reduce((total, record) => {
            return total + getDuration(
                record.bedtime,
                record.waketime
            );
        }, 0);

        const average = Math.round(
            totalMinutes / recentRecords.length
        );

        averageElement.textContent = formatDuration(average);
    }

    /* ==========================================
       HISTÓRICO
    ========================================== */

    function renderHistory() {
        const container = document.getElementById(
            "sleep-history-list"
        );

        const sorted = [...sleepRecords].sort((a, b) =>
            b.date.localeCompare(a.date)
        );

        if (sorted.length === 0) {
            container.innerHTML = `
                <div class="sleep-empty">
                    Você ainda não possui registros de sono.
                    Registre sua primeira noite para começar
                    a acompanhar seu descanso.
                </div>
            `;

            return;
        }

        container.innerHTML = sorted.map(record => {
            const duration = getDuration(
                record.bedtime,
                record.waketime
            );

            return `
                <article class="sleep-history-card">

                    <div class="sleep-history-top">
                        <span class="sleep-history-date">
                            ${formatDate(record.date)}
                        </span>

                        <strong class="sleep-duration">
                            ${formatDuration(duration)}
                        </strong>
                    </div>

                    <div class="sleep-times">
                        🌙 Dormiu: ${record.bedtime}<br>
                        ☀️ Acordou: ${record.waketime}
                    </div>

                    <div class="sleep-record-actions">

                        <button
                            type="button"
                            data-sleep-edit="${record.id}"
                        >
                            Editar
                        </button>

                        <button
                            type="button"
                            class="delete"
                            data-sleep-delete="${record.id}"
                        >
                            Excluir
                        </button>

                    </div>

                </article>
            `;
        }).join("");
    }

    function render() {
        renderSummary();
        renderHistory();
    }

    /* ==========================================
       LIMPAR FORMULÁRIO
    ========================================== */

    function resetForm() {
        editingId = null;

        form.reset();

        dateInput.value = getLocalDate();

        document.getElementById(
            "sleep-form-title"
        ).textContent = "Registrar meu sono";

        form.querySelector(
            ".sleep-save-button"
        ).textContent = "Salvar registro";

        cancelButton.style.display = "none";

        feedback.textContent = "";
    }

    /* ==========================================
       SALVAR REGISTRO
    ========================================== */

    form.addEventListener("submit", event => {
        event.preventDefault();

        const date = dateInput.value;
        const bedtime = bedtimeInput.value;
        const waketime = waketimeInput.value;

        if (!date || !bedtime || !waketime) {
            feedback.textContent = "Preencha todos os campos.";
            return;
        }

        const duration = getDuration(bedtime, waketime);

        if (duration <= 0 || duration > 18 * 60) {
            feedback.textContent =
                "Confira os horários. A duração precisa ser de até 18 horas.";

            return;
        }

        const duplicate = sleepRecords.find(record =>
            record.date === date &&
            record.id !== editingId
        );

        if (duplicate) {
            feedback.textContent =
                "Já existe um registro para essa data. Edite o registro existente.";

            return;
        }

        if (editingId !== null) {
            const index = sleepRecords.findIndex(
                record => record.id === editingId
            );

            if (index !== -1) {
                sleepRecords[index] = {
                    ...sleepRecords[index],
                    date,
                    bedtime,
                    waketime
                };
            }

        } else {
            sleepRecords.push({
                id: String(Date.now()),
                date,
                bedtime,
                waketime
            });
        }

        if (!saveRecords()) return;

        const wasEditing = editingId !== null;

        resetForm();
        render();

        feedback.textContent = wasEditing
            ? "Registro atualizado com sucesso!"
            : "Sono registrado com sucesso!";
    });

    /* ==========================================
       EDITAR E EXCLUIR
    ========================================== */

    document.getElementById(
        "sleep-history-list"
    ).addEventListener("click", event => {

        const editButton = event.target.closest(
            "[data-sleep-edit]"
        );

        const deleteButton = event.target.closest(
            "[data-sleep-delete]"
        );

        if (editButton) {
            const id = editButton.dataset.sleepEdit;

            const record = sleepRecords.find(
                item => item.id === id
            );

            if (!record) return;

            editingId = id;

            dateInput.value = record.date;
            bedtimeInput.value = record.bedtime;
            waketimeInput.value = record.waketime;

            document.getElementById(
                "sleep-form-title"
            ).textContent = "Editar registro";

            form.querySelector(
                ".sleep-save-button"
            ).textContent = "Atualizar registro";

            cancelButton.style.display = "block";

            feedback.textContent = "Editando registro selecionado.";

            form.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }

        if (deleteButton) {
            const id = deleteButton.dataset.sleepDelete;

            const confirmed = window.confirm(
                "Deseja realmente excluir este registro de sono?"
            );

            if (!confirmed) return;

            sleepRecords = sleepRecords.filter(
                item => item.id !== id
            );

            if (editingId === id) {
                resetForm();
            }

            if (saveRecords()) {
                render();
            }
        }
    });

    cancelButton.addEventListener("click", resetForm);

    /* ==========================================
       INICIALIZAÇÃO
    ========================================== */

    loadRecords();
    render();

})();
