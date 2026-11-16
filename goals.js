
/* =========================================
   ORBIA — MÓDULO DE METAS PERSONALIZADAS
========================================= */


// =========================================
// DADOS
// =========================================

let goals = [];

try {
    const savedGoals = JSON.parse(
        localStorage.getItem("orbia-goals") || "[]"
    );

    goals = Array.isArray(savedGoals) ? savedGoals : [];

} catch (error) {
    console.error("Erro ao carregar metas:", error);
    goals = [];
}


function saveGoals() {
    localStorage.setItem(
        "orbia-goals",
        JSON.stringify(goals)
    );
}


// =========================================
// ESTILOS DO MÓDULO
// =========================================

const goalsStyle = document.createElement("style");

goalsStyle.textContent = `
    #goals-section {
        margin-top: 5px;
        margin-bottom: 30px;
    }

    .goals-intro {
        margin-bottom: 20px;
        padding: 20px;
        border-radius: 19px;
        background: var(--primary);
        color: #FFFFFF;
    }

    .goals-intro h2 {
        font-size: 20px;
        margin-bottom: 8px;
    }

    .goals-intro p {
        font-size: 12px;
        line-height: 1.6;
        color: rgba(255,255,255,0.8);
    }

    .goals-summary {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 9px;
        margin-bottom: 22px;
    }

    .goal-summary-item {
        padding: 13px 7px;
        border: 1px solid var(--border);
        border-radius: 14px;
        background: var(--surface);
        text-align: center;
    }

    .goal-summary-item strong {
        display: block;
        font-size: 21px;
        color: var(--primary);
        margin-bottom: 5px;
    }

    .goal-summary-item span {
        display: block;
        font-size: 10px;
        color: var(--muted);
    }

    .goals-list {
        display: flex;
        flex-direction: column;
        gap: 13px;
    }

    .goal-card {
        padding: 17px;
        border: 1px solid var(--border);
        border-radius: 18px;
        background: var(--surface);
        box-shadow: var(--shadow);
    }

    .goal-card-top {
        display: flex;
        align-items: flex-start;
        gap: 11px;
        margin-bottom: 12px;
    }

    .goal-card-icon {
        width: 42px;
        height: 42px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 13px;
        background: rgba(53,184,154,0.12);
        font-size: 21px;
    }

    .goal-card-info {
        flex: 1;
        min-width: 0;
    }

    .goal-card-info h3 {
        font-size: 15px;
        overflow-wrap: anywhere;
        margin-bottom: 5px;
    }

    .goal-card-info p {
        font-size: 11px;
        color: var(--muted);
        line-height: 1.5;
        overflow-wrap: anywhere;
    }

    .goal-status {
        flex-shrink: 0;
        padding: 5px 8px;
        border-radius: 8px;
        background: rgba(53,184,154,0.12);
        color: var(--accent);
        font-size: 10px;
        font-weight: 700;
    }

    .goal-status.overdue {
        background: rgba(227,107,107,0.12);
        color: #E36B6B;
    }

    .goal-numbers {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        margin: 14px 0 9px;
    }

    .goal-numbers strong {
        color: var(--primary);
        font-size: 14px;
    }

    .goal-numbers span {
        color: var(--muted);
        font-size: 11px;
    }

    .goal-progress-track {
        height: 9px;
        width: 100%;
        border-radius: 20px;
        overflow: hidden;
        background: var(--background);
    }

    .goal-progress-fill {
        height: 100%;
        width: 0;
        border-radius: 20px;
        background: var(--accent);
        transition: width 0.3s ease;
    }

    .goal-deadline {
        display: block;
        margin-top: 11px;
        color: var(--muted);
        font-size: 11px;
    }

    .goal-update-area {
        display: flex;
        gap: 8px;
        margin-top: 15px;
    }

    .goal-update-area input {
        flex: 1;
        min-width: 0;
        height: 40px;
        padding: 9px;
        border: 1px solid var(--border);
        border-radius: 10px;
        background: var(--background);
        color: var(--text);
        font-size: 13px;
    }

    .goal-update-area button {
        padding: 0 12px;
        border: none;
        border-radius: 10px;
        background: var(--accent);
        color: #FFFFFF;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
    }

    .goal-card-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 12px;
    }

    .goal-card-actions button {
        padding: 8px 12px;
        border: none;
        border-radius: 9px;
        background: var(--background);
        color: var(--muted);
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
    }

    .goal-card-actions .goal-delete {
        color: #E36B6B;
    }

    .goals-empty {
        padding: 28px 18px;
        border: 1px dashed var(--border);
        border-radius: 17px;
        background: var(--surface);
        text-align: center;
    }

    .goals-empty strong {
        display: block;
        margin-bottom: 8px;
        color: var(--primary);
        font-size: 15px;
    }

    .goals-empty p {
        color: var(--muted);
        font-size: 12px;
        line-height: 1.6;
    }

    .add-goal-button {
        width: 100%;
        min-height: 49px;
        margin-top: 15px;
        border: 1px dashed var(--accent);
        border-radius: 15px;
        background: transparent;
        color: var(--accent);
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
    }

    #goal-modal {
        display: none;
        position: fixed;
        inset: 0;
        z-index: 120;
        align-items: center;
        justify-content: center;
        padding: 18px;
        background: rgba(0,0,0,0.6);
    }

    #goal-modal.active {
        display: flex;
    }

    .goal-modal-content {
        width: 100%;
        max-width: 420px;
        max-height: 88vh;
        overflow-y: auto;
        padding: 23px;
        border-radius: 21px;
        background: var(--surface);
        color: var(--text);
        box-shadow: var(--shadow);
    }

    .goal-modal-content h2 {
        margin-bottom: 18px;
        font-size: 20px;
    }

    .goal-modal-content label {
        display: block;
        margin: 12px 0 7px;
        font-size: 12px;
        font-weight: 700;
        color: var(--text);
    }

    .goal-modal-content input,
    .goal-modal-content textarea {
        width: 100%;
        padding: 12px;
        border: 1px solid var(--border);
        border-radius: 11px;
        background: var(--background);
        color: var(--text);
        font-family: inherit;
        font-size: 13px;
        outline: none;
    }

    .goal-modal-content textarea {
        min-height: 65px;
        resize: vertical;
    }

    .goal-modal-content input:focus,
    .goal-modal-content textarea:focus {
        border-color: var(--accent);
    }

    .goal-form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
    }

    .goal-modal-actions {
        display: flex;
        gap: 10px;
        margin-top: 20px;
    }

    .goal-modal-actions button {
        flex: 1;
        min-height: 44px;
        border: none;
        border-radius: 11px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
    }

    #cancel-goal {
        background: var(--background);
        color: var(--text);
    }

    #save-goal {
        background: var(--accent);
        color: #FFFFFF;
    }

    @media (max-width: 380px) {
        .goal-status {
            font-size: 9px;
            padding: 5px 6px;
        }

        .goal-summary-item strong {
            font-size: 18px;
        }
    }
`;

document.head.appendChild(goalsStyle);


// =========================================
// CRIAR SEÇÃO DE METAS
// =========================================

const goalsSection = document.createElement("section");

goalsSection.id = "goals-section";
goalsSection.style.display = "none";

goalsSection.innerHTML = `
    <div class="goals-intro">
        <h2>🎯 Suas conquistas</h2>
        <p>
            Transforme seus objetivos em resultados.
            Acompanhe cada avanço no seu próprio ritmo.
        </p>
    </div>

    <div class="goals-summary">
        <div class="goal-summary-item">
            <strong id="goals-total">0</strong>
            <span>Total de metas</span>
        </div>

        <div class="goal-summary-item">
            <strong id="goals-completed">0</strong>
            <span>Concluídas</span>
        </div>

        <div class="goal-summary-item">
            <strong id="goals-progress">0%</strong>
            <span>Progresso geral</span>
        </div>
    </div>

    <div class="section-header">
        <h2>Minhas metas</h2>
        <span id="goals-count"></span>
    </div>

    <div id="goals-list" class="goals-list"></div>

    <button
        type="button"
        id="add-goal-button"
        class="add-goal-button"
    >
        + Criar nova meta
    </button>
`;

const mainElement = document.querySelector("main");
const settingsSection = document.getElementById("settings-section");

mainElement.insertBefore(goalsSection, settingsSection);


// =========================================
// NAVEGAÇÃO
// =========================================

const goalsNavigationButton = document.getElementById("nav-goals");
const originalShowPage = showPage;

showPage = function(page) {
    if (page === "goals") {
        const sections = [
            "daily-progress-section",
            "agenda-section",
            "schedule-section",
            "sleep-section",
            "habits-section",
            "settings-section"
        ];

        sections.forEach(id => {
            const section = document.getElementById(id);

            if (section) {
                section.style.display = "none";
            }
        });

        goalsSection.style.display = "";

        document.querySelectorAll(".bottom-navigation button")
            .forEach(button => {
                button.classList.toggle(
                    "active",
                    button.id === "nav-goals"
                );
            });

        document.getElementById("add-activity").style.display = "none";
        document.getElementById("add-habit").style.display = "none";

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

        renderGoals();

        return;
    }

    originalShowPage(page);

    goalsSection.style.display = "none";
    goalsNavigationButton.classList.remove("active");
};

goalsNavigationButton.addEventListener("click", () => {
    showPage("goals");
});


// =========================================
// MODAL DE METAS
// =========================================

const goalModal = document.createElement("div");

goalModal.id = "goal-modal";

goalModal.innerHTML = `
    <div class="goal-modal-content">

        <h2 id="goal-modal-title">Nova meta</h2>

        <label for="goal-name">Nome da meta</label>
        <input
            type="text"
            id="goal-name"
            maxlength="60"
            placeholder="Ex.: Ler 20 livros"
        >

        <label for="goal-description">Descrição (opcional)</label>
        <textarea
            id="goal-description"
            maxlength="180"
            placeholder="Descreva o que deseja alcançar..."
        ></textarea>

        <div class="goal-form-row">

            <div>
                <label for="goal-target">Objetivo</label>
                <input
                    type="number"
                    id="goal-target"
                    min="0.01"
                    step="any"
                    placeholder="20"
                >
            </div>

            <div>
                <label for="goal-unit">Unidade</label>
                <input
                    type="text"
                    id="goal-unit"
                    maxlength="20"
                    placeholder="livros"
                >
            </div>

        </div>

        <div class="goal-form-row">

            <div>
                <label for="goal-current">Progresso atual</label>
                <input
                    type="number"
                    id="goal-current"
                    min="0"
                    step="any"
                    value="0"
                >
            </div>

            <div>
                <label for="goal-deadline">Prazo (opcional)</label>
                <input
                    type="date"
                    id="goal-deadline"
                >
            </div>

        </div>

        <div class="goal-modal-actions">
            <button type="button" id="cancel-goal">
                Cancelar
            </button>

            <button type="button" id="save-goal">
                Salvar meta
            </button>
        </div>

    </div>
`;

document.body.appendChild(goalModal);

const goalNameInput = document.getElementById("goal-name");
const goalDescriptionInput = document.getElementById("goal-description");
const goalTargetInput = document.getElementById("goal-target");
const goalUnitInput = document.getElementById("goal-unit");
const goalCurrentInput = document.getElementById("goal-current");
const goalDeadlineInput = document.getElementById("goal-deadline");

const goalModalTitle = document.getElementById("goal-modal-title");
const saveGoalButton = document.getElementById("save-goal");
const cancelGoalButton = document.getElementById("cancel-goal");

let editingGoalId = null;


// =========================================
// ABRIR MODAL
// =========================================

function openGoalModal(goal = null) {
    editingGoalId = goal ? goal.id : null;

    if (goal) {
        goalModalTitle.textContent = "Editar meta";

        goalNameInput.value = goal.name || "";
        goalDescriptionInput.value = goal.description || "";
        goalTargetInput.value = goal.target;
        goalUnitInput.value = goal.unit || "";
        goalCurrentInput.value = goal.current || 0;
        goalDeadlineInput.value = goal.deadline || "";

        saveGoalButton.textContent = "Salvar alterações";

    } else {
        goalModalTitle.textContent = "Nova meta";

        goalNameInput.value = "";
        goalDescriptionInput.value = "";
        goalTargetInput.value = "";
        goalUnitInput.value = "";
        goalCurrentInput.value = 0;
        goalDeadlineInput.value = "";

        saveGoalButton.textContent = "Salvar meta";
    }

    goalModal.classList.add("active");
    goalNameInput.focus();
}


// =========================================
// FECHAR MODAL
// =========================================

function closeGoalModal() {
    goalModal.classList.remove("active");

    editingGoalId = null;
}

cancelGoalButton.addEventListener("click", closeGoalModal);

goalModal.addEventListener("click", event => {
    if (event.target === goalModal) {
        closeGoalModal();
    }
});

document.addEventListener("keydown", event => {
    if (
        event.key === "Escape" &&
        goalModal.classList.contains("active")
    ) {
        closeGoalModal();
    }
});

document.getElementById("add-goal-button")
    .addEventListener("click", () => {
        openGoalModal();
    });


// =========================================
// FORMATAR NÚMEROS
// =========================================

function formatGoalNumber(value) {
    return Number(value).toLocaleString("pt-BR", {
        maximumFractionDigits: 2
    });
}


// =========================================
// SALVAR META
// =========================================

saveGoalButton.addEventListener("click", () => {
    const name = goalNameInput.value.trim();
    const description = goalDescriptionInput.value.trim();

    const target = Number(goalTargetInput.value);
    const unit = goalUnitInput.value.trim() || "unidades";
    const current = Number(goalCurrentInput.value);

    const deadline = goalDeadlineInput.value;

    if (!name) {
        alert("Digite o nome da sua meta.");
        goalNameInput.focus();
        return;
    }

    if (!Number.isFinite(target) || target <= 0) {
        alert("Digite um objetivo maior que zero.");
        goalTargetInput.focus();
        return;
    }

    if (!Number.isFinite(current) || current < 0) {
        alert("O progresso atual não pode ser negativo.");
        goalCurrentInput.focus();
        return;
    }

    if (editingGoalId !== null) {
        const goal = goals.find(
            item => item.id === editingGoalId
        );

        if (goal) {
            goal.name = name;
            goal.description = description;
            goal.target = target;
            goal.unit = unit;
            goal.current = current;
            goal.deadline = deadline;
        }

    } else {
        goals.push({
            id: Date.now(),
            name,
            description,
            target,
            unit,
            current,
            deadline,
            createdAt: new Date().toISOString()
        });
    }

    saveGoals();
    renderGoals();
    closeGoalModal();
});


// =========================================
// PRAZO DA META
// =========================================

function getGoalDeadlineLabel(goal) {
    if (!goal.deadline) {
        return "Sem prazo definido";
    }

    const today = getLocalDate();

    const deadlineDate = new Date(
        goal.deadline + "T12:00:00"
    );

    const formattedDate = deadlineDate.toLocaleDateString("pt-BR");

    if (Number(goal.current) >= Number(goal.target)) {
        return `Prazo: ${formattedDate}`;
    }

    if (goal.deadline < today) {
        return `Prazo encerrado em ${formattedDate}`;
    }

    if (goal.deadline === today) {
        return "Prazo final: hoje";
    }

    return `Prazo: ${formattedDate}`;
}


// =========================================
// MOSTRAR METAS
// =========================================

function renderGoals() {
    const list = document.getElementById("goals-list");

    list.innerHTML = "";

    const total = goals.length;

    const completed = goals.filter(goal => {
        return Number(goal.current) >= Number(goal.target);
    }).length;

    const totalProgress = goals.reduce((sum, goal) => {
        const target = Number(goal.target) || 0;
        const current = Number(goal.current) || 0;

        if (target <= 0) {
            return sum;
        }

        return sum + Math.min(100, (current / target) * 100);
    }, 0);

    const averageProgress = total === 0
        ? 0
        : Math.round(totalProgress / total);

    document.getElementById("goals-total").textContent = total;
    document.getElementById("goals-completed").textContent = completed;
    document.getElementById("goals-progress").textContent =
        averageProgress + "%";

    document.getElementById("goals-count").textContent =
        total === 1 ? "1 meta" : `${total} metas`;

    if (total === 0) {
        const empty = document.createElement("div");
        empty.className = "goals-empty";

        const title = document.createElement("strong");
        title.textContent = "Seu próximo objetivo começa aqui";

        const message = document.createElement("p");
        message.textContent =
            "Você ainda não criou nenhuma meta. Defina um objetivo e acompanhe cada passo até alcançá-lo.";

        empty.appendChild(title);
        empty.appendChild(message);

        list.appendChild(empty);

        return;
    }

    goals.forEach(goal => {
        const target = Number(goal.target);
        const current = Number(goal.current) || 0;

        const percentage = Math.min(
            100,
            Math.round((current / target) * 100)
        );

        const isCompleted = current >= target;

        const isOverdue =
            !isCompleted &&
            goal.deadline &&
            goal.deadline < getLocalDate();

        const card = document.createElement("article");
        card.className = "goal-card";

        // CABEÇALHO

        const top = document.createElement("div");
        top.className = "goal-card-top";

        const icon = document.createElement("div");
        icon.className = "goal-card-icon";
        icon.textContent = "🎯";

        const info = document.createElement("div");
        info.className = "goal-card-info";

        const title = document.createElement("h3");
        title.textContent = goal.name;

        info.appendChild(title);

        if (goal.description) {
            const description = document.createElement("p");
            description.textContent = goal.description;

            info.appendChild(description);
        }

        const status = document.createElement("span");
        status.className = "goal-status";

        if (isCompleted) {
            status.textContent = "Concluída";

        } else if (isOverdue) {
            status.textContent = "Atrasada";
            status.classList.add("overdue");

        } else {
            status.textContent = "Em andamento";
        }

        top.appendChild(icon);
        top.appendChild(info);
        top.appendChild(status);

        card.appendChild(top);

        // NÚMEROS

        const numbers = document.createElement("div");
        numbers.className = "goal-numbers";

        const progressValue = document.createElement("strong");

        progressValue.textContent =
            `${formatGoalNumber(current)} / ${formatGoalNumber(target)} ${goal.unit}`;

        const percent = document.createElement("span");
        percent.textContent = percentage + "%";

        numbers.appendChild(progressValue);
        numbers.appendChild(percent);

        card.appendChild(numbers);

        // BARRA DE PROGRESSO

        const track = document.createElement("div");
        track.className = "goal-progress-track";

        const fill = document.createElement("div");
        fill.className = "goal-progress-fill";
        fill.style.width = percentage + "%";

        track.appendChild(fill);
        card.appendChild(track);

        // PRAZO

        const deadline = document.createElement("span");
        deadline.className = "goal-deadline";

        deadline.textContent = "📅 " + getGoalDeadlineLabel(goal);

        card.appendChild(deadline);

        // ATUALIZAR PROGRESSO

        if (!isCompleted) {
            const updateArea = document.createElement("div");
            updateArea.className = "goal-update-area";

            const progressInput = document.createElement("input");
            progressInput.type = "number";
            progressInput.min = "0";
            progressInput.step = "any";
            progressInput.value = current;
            progressInput.setAttribute(
                "aria-label",
                "Novo progresso da meta"
            );

            const updateButton = document.createElement("button");
            updateButton.type = "button";
            updateButton.textContent = "Atualizar";

            updateButton.addEventListener("click", () => {
                const newValue = Number(progressInput.value);

                if (
                    !Number.isFinite(newValue) ||
                    newValue < 0
                ) {
                    alert("Digite um progresso válido.");
                    return;
                }

                goal.current = newValue;

                saveGoals();
                renderGoals();
            });

            updateArea.appendChild(progressInput);
            updateArea.appendChild(updateButton);

            card.appendChild(updateArea);
        }

        // AÇÕES

        const actions = document.createElement("div");
        actions.className = "goal-card-actions";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.textContent = "Editar";

        editButton.addEventListener("click", () => {
            openGoalModal(goal);
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "goal-delete";
        deleteButton.textContent = "Excluir";

        deleteButton.addEventListener("click", () => {
            if (!confirm(`Deseja excluir a meta "${goal.name}"?`)) {
                return;
            }

            goals = goals.filter(item => item.id !== goal.id);

            saveGoals();
            renderGoals();
        });

        actions.appendChild(editButton);
        actions.appendChild(deleteButton);

        card.appendChild(actions);

        list.appendChild(card);
    });
}


// =========================================
// INICIALIZAÇÃO
// =========================================

renderGoals();
