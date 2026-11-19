
// =====================================
// ORBIA — FUNCIONALIDADES PRINCIPAIS
// =====================================


// =====================================
// ELEMENTOS
// =====================================

const themeButton = document.getElementById("theme-button");
const currentDate = document.getElementById("current-date");
const greetingTitle = document.querySelector(".greeting h1");

const activityList = document.getElementById("activity-list");
const progressPercent = document.getElementById("progress-percent");
const progressCount = document.getElementById("progress-count");
const progressFill = document.getElementById("progress-fill");

const addButton = document.getElementById("add-activity");
const modal = document.getElementById("activity-modal");
const modalTitle = modal.querySelector("h2");

let editingActivityId = null;

const activityName = document.getElementById("activity-name");
const activityTime = document.getElementById("activity-time");
const activityDate = document.getElementById("activity-date");
const activityRepeat = document.getElementById("activity-repeat");
const activityRepeatInterval = document.getElementById("activity-repeat-interval");
const activityRepeatDuration = document.getElementById("activity-repeat-duration");
const activityRepeatUntil = document.getElementById("activity-repeat-until");
const repeatWeekdays = Array.from(document.querySelectorAll(".activity-repeat-day"));

const saveButton = document.getElementById("save-activity");
const cancelButton = document.getElementById("cancel-activity");

const weekDays = document.getElementById("week-days");
const weekLabel = document.getElementById("week-label");
const previousWeek = document.getElementById("previous-week");
const nextWeek = document.getElementById("next-week");

const habitsList = document.getElementById("habits-list");
const habitsCount = document.getElementById("habits-count");
const addHabitButton = document.getElementById("add-habit");


// =====================================
// DATAS E DADOS
// =====================================

function getLocalDate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function shiftDate(dateString, amount) {
    const date = new Date(dateString + "T12:00:00");
    date.setDate(date.getDate() + amount);
    return getLocalDate(date);
}

let selectedDate = getLocalDate();

function loadLocalArray(key, label) {
    try {
        const raw = localStorage.getItem(key);
        const value = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(value)) throw new Error("Formato inválido");
        return value;
    } catch (error) {
        console.error("Não foi possível carregar " + label + ":", error);
        try {
            const raw = localStorage.getItem(key);
            if (raw) localStorage.setItem("orbia-recovery-" + key, raw);
        } catch (recoveryError) {
            console.error("Não foi possível preservar os dados inválidos:", recoveryError);
        }
        return [];
    }
}

let activities = loadLocalArray("orbia-activities", "atividades");

activities.forEach(activity => {
    if (!activity.date) {
        activity.date = selectedDate;
    }
});

function saveActivities() {
    localStorage.setItem(
        "orbia-activities",
        JSON.stringify(activities)
    );
    window.dispatchEvent(new Event("orbia:data-changed"));
}

function dateDifferenceInDays(startDate, endDate) {
    const start = new Date(startDate + "T12:00:00");
    const end = new Date(endDate + "T12:00:00");
    return Math.round((end - start) / 86400000);
}

function isActivityScheduled(activity, dateString) {
    if (dateString < activity.date) return false;
    if (!activity.recurrence) return dateString === activity.date;

    const rule = activity.recurrence;
    if (rule.until && dateString > rule.until) return false;

    const elapsedDays = dateDifferenceInDays(activity.date, dateString);

    if (rule.type === "daily") return true;
    if (rule.type === "weekly") {
        const weekday = new Date(dateString + "T12:00:00").getDay();
        return Array.isArray(rule.daysOfWeek) && rule.daysOfWeek.includes(weekday);
    }
    if (rule.type === "interval") {
        return elapsedDays % Math.max(1, Number(rule.interval) || 1) === 0;
    }

    return false;
}

function isActivityDone(activity, dateString) {
    if (!activity.recurrence) return Boolean(activity.done);
    return Array.isArray(activity.doneDates) && activity.doneDates.includes(dateString);
}

function getMonthEndDate(dateString, months) {
    const date = new Date(dateString + "T12:00:00");
    const originalDay = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() + months);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(originalDay, lastDay));
    date.setDate(date.getDate() - 1);
    return getLocalDate(date);
}

function updateRepeatFields() {
    const type = activityRepeat.value;
    document.getElementById("activity-repeat-weekdays").hidden = type !== "weekly";
    document.getElementById("activity-repeat-interval-field").hidden = type !== "interval";
    document.getElementById("activity-repeat-until-field").hidden = activityRepeatDuration.value !== "custom";
}

function resetActivityRepeatForm() {
    activityRepeat.value = "none";
    activityRepeatInterval.value = "2";
    activityRepeatDuration.value = "never";
    activityRepeatUntil.value = "";
    repeatWeekdays.forEach(input => { input.checked = false; });
    updateRepeatFields();
}

function fillActivityRepeatForm(activity) {
    resetActivityRepeatForm();
    if (!activity.recurrence) return;

    activityRepeat.value = activity.recurrence.type;
    activityRepeatInterval.value = String(activity.recurrence.interval || 2);
    const days = activity.recurrence.daysOfWeek || [];
    repeatWeekdays.forEach(input => {
        input.checked = days.includes(Number(input.value));
    });

    if (activity.recurrence.until) {
        activityRepeatDuration.value = "custom";
        activityRepeatUntil.value = activity.recurrence.until;
    }
    updateRepeatFields();
}

function buildActivityRecurrence(startDate) {
    const type = activityRepeat.value;
    if (type === "none") return null;

    let until = null;
    const duration = activityRepeatDuration.value;
    if (duration === "custom") {
        until = activityRepeatUntil.value;
        if (!until || until < startDate) {
            throw new Error("Escolha uma data final igual ou posterior ao início.");
        }
    } else if (duration !== "never") {
        until = getMonthEndDate(startDate, Number(duration));
    }

    if (type === "weekly") {
        const daysOfWeek = repeatWeekdays
            .filter(input => input.checked)
            .map(input => Number(input.value));
        if (!daysOfWeek.length) {
            throw new Error("Selecione pelo menos um dia da semana.");
        }
        return { type, daysOfWeek, until };
    }

    if (type === "interval") {
        const interval = Math.max(2, Math.min(365, Number(activityRepeatInterval.value) || 2));
        return { type, interval, until };
    }

    return { type: "daily", until };
}

saveActivities();


// =====================================
// DADOS DOS HÁBITOS
// =====================================

let habits = loadLocalArray("orbia-habits", "hábitos");

function getDaysForFrequency(frequency) {
    if (frequency === "weekdays") {
        return [1, 2, 3, 4, 5];
    }

    if (frequency === "weekends") {
        return [0, 6];
    }

    return [0, 1, 2, 3, 4, 5, 6];
}

habits.forEach(habit => {
    if (!Array.isArray(habit.completedDates)) {
        habit.completedDates = [];
    }

    if (!habit.icon) {
        habit.icon = "⭐";
    }

    if (!habit.frequency) {
        habit.frequency = "daily";
    }

    if (!Array.isArray(habit.daysOfWeek)) {
        habit.daysOfWeek = getDaysForFrequency(habit.frequency);
    }

    if (!habit.daysOfWeek.length) {
        habit.daysOfWeek = getDaysForFrequency("daily");
    }

    if (!habit.weeklyGoal) {
        habit.weeklyGoal = habit.daysOfWeek.length;
    }
});

function saveHabits() {
    localStorage.setItem(
        "orbia-habits",
        JSON.stringify(habits)
    );
    window.dispatchEvent(new Event("orbia:data-changed"));
}

saveHabits();


// =====================================
// DATA E SAUDAÇÃO
// =====================================

function updateDate() {
    const now = new Date();

    currentDate.textContent = now.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long"
    }).toUpperCase();

    const hour = now.getHours();

    if (hour >= 5 && hour < 12) {
        greetingTitle.textContent = "Bom dia! ☀️";
    } else if (hour >= 12 && hour < 18) {
        greetingTitle.textContent = "Boa tarde! 🌤️";
    } else {
        greetingTitle.textContent = "Boa noite! 🌙";
    }
}


// =====================================
// TEMA CLARO E ESCURO
// =====================================

function updateThemeButton() {
    themeButton.textContent =
        document.body.classList.contains("dark-theme")
            ? "☀"
            : "☾";
}

const savedTheme = localStorage.getItem("orbia-theme");

if (savedTheme === "dark") {
    document.body.classList.add("dark-theme");
}

updateThemeButton();

themeButton.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");

    const isDark = document.body.classList.contains("dark-theme");

    localStorage.setItem(
        "orbia-theme",
        isDark ? "dark" : "light"
    );

    updateThemeButton();
});


// =====================================
// AGENDA SEMANAL
// =====================================

function renderWeek() {
    weekDays.innerHTML = "";

    // A semana acompanha a data selecionada, permitindo
    // navegar livremente pelo histórico sem perder o dia em foco.
    const anchor = new Date(selectedDate + "T12:00:00");
    const monday = new Date(anchor);
    const dayOfWeek = (anchor.getDay() + 6) % 7;

    monday.setDate(anchor.getDate() - dayOfWeek);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    weekLabel.textContent =
        `${monday.toLocaleDateString("pt-BR")} — ${sunday.toLocaleDateString("pt-BR")}`;

    const names = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];

    for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);

        const dateString = getLocalDate(date);

        const button = document.createElement("button");
        button.className = "week-day";

        if (dateString === selectedDate) {
            button.classList.add("selected");
        }

        const dayName = document.createElement("span");
        dayName.textContent = names[i];

        const dayNumber = document.createElement("strong");
        dayNumber.textContent = date.getDate();

        button.appendChild(dayName);
        button.appendChild(dayNumber);

        button.addEventListener("click", () => {
            selectedDate = dateString;
            renderWeek();
            renderActivities();
        });

        weekDays.appendChild(button);
    }
}

previousWeek.addEventListener("click", () => {
    selectedDate = shiftDate(selectedDate, -7);
    renderWeek();
    renderActivities();
});

nextWeek.addEventListener("click", () => {
    selectedDate = shiftDate(selectedDate, 7);
    renderWeek();
    renderActivities();
});


// =====================================
// MOSTRAR ATIVIDADES
// =====================================

function renderActivities() {
    activityList.innerHTML = "";

    const dailyActivities = activities
        .filter(activity => isActivityScheduled(activity, selectedDate))
        .map(activity => ({
            ...activity,
            occurrenceDate: selectedDate,
            done: isActivityDone(activity, selectedDate)
        }))
        .sort((a, b) => a.time.localeCompare(b.time));

    dailyActivities.forEach(activity => {
        const sourceActivity = activities.find(item => item.id === activity.id);
        const card = document.createElement("div");
        card.className = "activity-card";

        const time = document.createElement("span");
        time.className = "activity-time";
        time.textContent = activity.time;

        const details = document.createElement("div");
        details.className = "activity-details";

        const name = document.createElement("h3");
        name.textContent = activity.name;

        const status = document.createElement("span");
        status.textContent = activity.done ? "Concluída" : "Pendente";

        details.appendChild(name);
        details.appendChild(status);

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = activity.done;

        checkbox.addEventListener("change", () => {
            if (sourceActivity.recurrence) {
                if (!Array.isArray(sourceActivity.doneDates)) sourceActivity.doneDates = [];
                sourceActivity.doneDates = sourceActivity.doneDates.filter(date => date !== selectedDate);
                if (checkbox.checked) sourceActivity.doneDates.push(selectedDate);
            } else {
                sourceActivity.done = checkbox.checked;
            }
            saveActivities();
            renderActivities();
        });

        const actions = document.createElement("div");
        actions.className = "activity-actions";

        const editButton = document.createElement("button");
        editButton.className = "edit-activity";
        editButton.textContent = "✎";

        editButton.addEventListener("click", () => {
            editingActivityId = activity.id;

            activityName.value = activity.name;
            activityTime.value = activity.time;
            activityDate.value = activity.date;
            fillActivityRepeatForm(sourceActivity);

            modalTitle.textContent = "Editar atividade";
            saveButton.textContent = "Salvar alterações";

            modal.classList.add("active");
        });

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-activity";
        deleteButton.textContent = "×";

        deleteButton.addEventListener("click", () => {
            if (!confirm(`Deseja excluir "${activity.name}"?`)) {
                return;
            }

            activities = activities.filter(
                item => item.id !== activity.id
            );

            saveActivities();
            renderActivities();
        });

        actions.appendChild(editButton);
        actions.appendChild(deleteButton);

        card.appendChild(time);
        card.appendChild(details);
        card.appendChild(checkbox);
        card.appendChild(actions);

        activityList.appendChild(card);
    });

    updateProgress();
}


// =====================================
// PROGRESSO DIÁRIO
// =====================================

function updateProgress() {
    const dailyActivities = activities.filter(
        activity => isActivityScheduled(activity, selectedDate)
    );

    const total = dailyActivities.length;

    const completed = dailyActivities.filter(
        activity => isActivityDone(activity, selectedDate)
    ).length;

    const percentage = total === 0
        ? 0
        : Math.round((completed / total) * 100);

    progressPercent.textContent = percentage + "%";
    progressCount.textContent = `${completed} de ${total} atividades`;
    progressFill.style.width = percentage + "%";
}


// =====================================
// ABRIR E FECHAR ATIVIDADES
// =====================================

addButton.addEventListener("click", () => {
    editingActivityId = null;

    activityName.value = "";
    activityTime.value = "";
    activityDate.value = selectedDate;
    resetActivityRepeatForm();

    modalTitle.textContent = "Nova atividade";
    saveButton.textContent = "Salvar";

    modal.classList.add("active");
    activityName.focus();
});

cancelButton.addEventListener("click", () => {
    modal.classList.remove("active");
    editingActivityId = null;
    resetActivityRepeatForm();
});

activityRepeat.addEventListener("change", updateRepeatFields);
activityRepeatDuration.addEventListener("change", updateRepeatFields);
updateRepeatFields();


// =====================================
// CRIAR E EDITAR ATIVIDADES
// =====================================

saveButton.addEventListener("click", () => {
    const name = activityName.value.trim();
    const time = activityTime.value;
    const date = activityDate.value;

    if (!name || !time || !date) {
        alert("Preencha o nome, horário e data.");
        return;
    }

    let recurrence;
    try {
        recurrence = buildActivityRecurrence(date);
    } catch (error) {
        alert(error.message);
        return;
    }

    if (editingActivityId !== null) {
        const activity = activities.find(
            item => item.id === editingActivityId
        );

        if (activity) {
            activity.name = name;
            activity.time = time;
            activity.date = date;
            activity.recurrence = recurrence;
            if (recurrence) {
                if (!Array.isArray(activity.doneDates)) activity.doneDates = [];
                delete activity.done;
            } else {
                activity.done = Boolean(activity.done);
                delete activity.doneDates;
            }
        }
    } else {
        const newActivity = {
            id: Date.now(),
            name,
            time,
            date,
            done: false
        };
        if (recurrence) {
            newActivity.recurrence = recurrence;
            newActivity.doneDates = [];
            delete newActivity.done;
        }
        activities.push(newActivity);
    }

    selectedDate = date;

    saveActivities();
    renderWeek();
    renderActivities();

    activityName.value = "";
    activityTime.value = "";
    activityDate.value = "";
    resetActivityRepeatForm();

    editingActivityId = null;
    modal.classList.remove("active");

    modalTitle.textContent = "Nova atividade";
    saveButton.textContent = "Salvar";
});


// =====================================
// MÓDULO DE HÁBITOS
// =====================================

const habitModal = document.createElement("div");
habitModal.id = "habit-modal";

habitModal.innerHTML = `
    <div class="habit-modal-content">

        <h2>Novo hábito</h2>

        <label for="habit-name">Nome do hábito</label>
        <input type="text" id="habit-name"
            placeholder="Ex.: Beber água" maxlength="50">

        <label for="habit-icon">Ícone</label>
        <input type="text" id="habit-icon"
            placeholder="Emoji (ex.: 💧)" maxlength="4">

        <label for="habit-reminder-time">Horário do lembrete</label>
        <input type="time" id="habit-reminder-time" value="09:00">

        <label for="habit-frequency">Frequência</label>
        <select id="habit-frequency">
            <option value="daily">Todos os dias</option>
            <option value="weekdays">Dias úteis</option>
            <option value="weekends">Finais de semana</option>
            <option value="custom">Dias personalizados</option>
        </select>

        <div id="custom-days">
            <span class="habit-field-title">Escolha os dias:</span>

            <div class="custom-days-grid">
                <label><input type="checkbox" value="1"> Seg</label>
                <label><input type="checkbox" value="2"> Ter</label>
                <label><input type="checkbox" value="3"> Qua</label>
                <label><input type="checkbox" value="4"> Qui</label>
                <label><input type="checkbox" value="5"> Sex</label>
                <label><input type="checkbox" value="6"> Sáb</label>
                <label><input type="checkbox" value="0"> Dom</label>
            </div>
        </div>

        <label for="habit-goal">Meta semanal</label>

        <div class="habit-goal-input">
            <input type="number" id="habit-goal"
                min="1" max="7" value="7">

            <span>vezes por semana</span>
        </div>

        <div class="modal-actions">
            <button type="button" id="cancel-habit">Cancelar</button>
            <button type="button" id="save-habit">Salvar</button>
        </div>

    </div>
`;

document.body.appendChild(habitModal);

const habitModalTitle = habitModal.querySelector("h2");
const habitNameInput = document.getElementById("habit-name");
const habitIconInput = document.getElementById("habit-icon");
const habitFrequencyInput = document.getElementById("habit-frequency");
const habitReminderTimeInput = document.getElementById("habit-reminder-time");
const habitGoalInput = document.getElementById("habit-goal");
const customDaysContainer = document.getElementById("custom-days");

const customDayInputs = Array.from(
    customDaysContainer.querySelectorAll('input[type="checkbox"]')
);

const cancelHabitButton = document.getElementById("cancel-habit");
const saveHabitButton = document.getElementById("save-habit");

let editingHabitId = null;


// =====================================
// FREQUÊNCIA DOS HÁBITOS
// =====================================

function getHabitDays(habit) {
    return Array.isArray(habit.daysOfWeek)
        ? habit.daysOfWeek
        : getDaysForFrequency(habit.frequency || "daily");
}

function isHabitScheduled(habit, dateString) {
    const date = new Date(dateString + "T12:00:00");
    return getHabitDays(habit).includes(date.getDay());
}

function getCurrentWeekStart() {
    const today = new Date();
    const dayOfWeek = (today.getDay() + 6) % 7;

    today.setDate(today.getDate() - dayOfWeek);

    return getLocalDate(today);
}

function getWeeklyCompleted(habit) {
    const start = getCurrentWeekStart();
    const end = shiftDate(start, 6);

    return habit.completedDates.filter(date => {
        return date >= start &&
            date <= end &&
            isHabitScheduled(habit, date);
    }).length;
}

function getFrequencyLabel(habit) {
    if (habit.frequency === "weekdays") {
        return "Dias úteis";
    }

    if (habit.frequency === "weekends") {
        return "Finais de semana";
    }

    if (habit.frequency === "custom") {
        const names = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

        return getHabitDays(habit)
            .map(day => names[day])
            .join(", ");
    }

    return "Todos os dias";
}


// =====================================
// SEQUÊNCIA DE CONCLUSÕES
// =====================================

function calculateStreak(habit) {
    let referenceDate = getLocalDate();
    let streak = 0;

    if (!habit.completedDates.includes(referenceDate)) {
        referenceDate = shiftDate(referenceDate, -1);
    }

    for (let i = 0; i < 366; i++) {
        if (isHabitScheduled(habit, referenceDate)) {
            if (habit.completedDates.includes(referenceDate)) {
                streak++;
            } else {
                break;
            }
        }

        referenceDate = shiftDate(referenceDate, -1);
    }

    return streak;
}


// =====================================
// MOSTRAR HÁBITOS
// =====================================

function renderHabits() {
    habitsList.innerHTML = "";

    const today = getLocalDate();

    habitsCount.textContent =
        habits.length === 1
            ? "1 hábito"
            : `${habits.length} hábitos`;

    if (habits.length === 0) {
        const empty = document.createElement("div");
        empty.className = "habits-empty";

        const message = document.createElement("p");
        message.textContent =
            "Você ainda não cadastrou nenhum hábito. Comece adicionando um hábito que deseja desenvolver!";

        empty.appendChild(message);
        habitsList.appendChild(empty);

        return;
    }

    habits.forEach(habit => {
        const completedToday = habit.completedDates.includes(today);
        const scheduledToday = isHabitScheduled(habit, today);
        const streak = calculateStreak(habit);

        const weeklyCompleted = getWeeklyCompleted(habit);
        const weeklyGoal = habit.weeklyGoal || getHabitDays(habit).length;

        const goalPercentage = Math.min(
            100,
            Math.round((weeklyCompleted / weeklyGoal) * 100)
        );

        const card = document.createElement("div");
        card.className = "habit-card";

        const top = document.createElement("div");
        top.className = "habit-top";

        const icon = document.createElement("div");
        icon.className = "habit-icon";
        icon.textContent = habit.icon;

        const info = document.createElement("div");
        info.className = "habit-info";

        const name = document.createElement("h3");
        name.textContent = habit.name;

        const description = document.createElement("span");

        if (!scheduledToday) {
            description.textContent = "Não programado para hoje";
        } else {
            description.textContent = completedToday
                ? "Concluído hoje"
                : "Ainda não concluído hoje";
        }

        info.appendChild(name);
        info.appendChild(description);

        const checkButton = document.createElement("button");
        checkButton.type = "button";
        checkButton.className = "habit-check";
        checkButton.textContent = completedToday ? "✓" : "";

        if (completedToday) {
            checkButton.classList.add("completed");
        }

        checkButton.disabled = !scheduledToday;

        checkButton.setAttribute(
            "aria-label",
            completedToday
                ? "Desmarcar hábito de hoje"
                : "Concluir hábito de hoje"
        );

        checkButton.addEventListener("click", () => {
            toggleHabitCompletion(habit);
        });

        top.appendChild(icon);
        top.appendChild(info);
        top.appendChild(checkButton);

        card.appendChild(top);

        const frequency = document.createElement("span");
        frequency.className = "habit-frequency-label";
        frequency.textContent = getFrequencyLabel(habit);

        card.appendChild(frequency);

        const stats = document.createElement("div");
        stats.className = "habit-stats";

        const streakText = document.createElement("span");
        streakText.className = "habit-streak";
        streakText.textContent = `🔥 ${streak} dias seguidos`;

        const progressText = document.createElement("span");
        progressText.className = "habit-progress-text";
        progressText.textContent =
            `${weeklyCompleted}/${weeklyGoal} na semana`;

        stats.appendChild(streakText);
        stats.appendChild(progressText);

        card.appendChild(stats);

        const goalBar = document.createElement("div");
        goalBar.className = "habit-goal-bar";

        const goalFill = document.createElement("div");
        goalFill.className = "habit-goal-fill";
        goalFill.style.width = goalPercentage + "%";

        goalBar.appendChild(goalFill);
        card.appendChild(goalBar);

        const week = document.createElement("div");
        week.className = "habit-week";

        const monday = getCurrentWeekStart();
        const dayNames = ["S", "T", "Q", "Q", "S", "S", "D"];

        for (let i = 0; i < 7; i++) {
            const date = shiftDate(monday, i);
            const dateObject = new Date(date + "T12:00:00");

            const day = document.createElement("div");
            day.className = "habit-week-day";

            const scheduled = getHabitDays(habit).includes(
                dateObject.getDay()
            );

            if (!scheduled) {
                day.classList.add("not-scheduled");
            }

            if (habit.completedDates.includes(date)) {
                day.classList.add("completed");
            }

            const dayName = document.createElement("span");
            dayName.textContent = dayNames[i];

            const dayNumber = document.createElement("strong");

            dayNumber.textContent =
                habit.completedDates.includes(date)
                    ? "✓"
                    : scheduled
                        ? "·"
                        : "–";

            day.appendChild(dayName);
            day.appendChild(dayNumber);
            week.appendChild(day);
        }

        card.appendChild(week);

        const actions = document.createElement("div");
        actions.className = "habit-actions";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.textContent = "Editar";

        editButton.addEventListener("click", () => {
            openHabitModal(habit);
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-habit";
        deleteButton.textContent = "Excluir";

        deleteButton.addEventListener("click", () => {
            if (!confirm(`Deseja excluir o hábito "${habit.name}"?`)) {
                return;
            }

            habits = habits.filter(item => item.id !== habit.id);

            saveHabits();
            renderHabits();
        });

        actions.appendChild(editButton);
        actions.appendChild(deleteButton);

        card.appendChild(actions);
        habitsList.appendChild(card);
    });
}


// =====================================
// CONCLUIR HÁBITO
// =====================================

function toggleHabitCompletion(habit) {
    const today = getLocalDate();

    if (!isHabitScheduled(habit, today)) {
        return;
    }

    const index = habit.completedDates.indexOf(today);

    if (index >= 0) {
        habit.completedDates.splice(index, 1);
    } else {
        habit.completedDates.push(today);
    }

    saveHabits();
    renderHabits();
}


// =====================================
// ATUALIZAR DIAS PERSONALIZADOS
// =====================================

function updateCustomDaysVisibility() {
    const isCustom = habitFrequencyInput.value === "custom";

    customDaysContainer.style.display = isCustom
        ? "block"
        : "none";
}

function updateGoalForFrequency() {
    let days;

    if (habitFrequencyInput.value === "custom") {
        days = customDayInputs
            .filter(input => input.checked)
            .map(input => Number(input.value));
    } else {
        days = getDaysForFrequency(habitFrequencyInput.value);
    }

    const maximum = Math.max(1, days.length);

    habitGoalInput.max = maximum;

    if (Number(habitGoalInput.value) > maximum) {
        habitGoalInput.value = maximum;
    }

    if (Number(habitGoalInput.value) < 1) {
        habitGoalInput.value = 1;
    }
}

habitFrequencyInput.addEventListener("change", () => {
    updateCustomDaysVisibility();
    updateGoalForFrequency();

    if (habitFrequencyInput.value === "daily") {
        habitGoalInput.value = 7;
    } else if (habitFrequencyInput.value === "weekdays") {
        habitGoalInput.value = 5;
    } else if (habitFrequencyInput.value === "weekends") {
        habitGoalInput.value = 2;
    }
});

customDayInputs.forEach(input => {
    input.addEventListener("change", updateGoalForFrequency);
});


// =====================================
// ABRIR JANELA DE HÁBITOS
// =====================================

function openHabitModal(habit = null) {
    editingHabitId = habit ? habit.id : null;

    if (habit) {
        habitModalTitle.textContent = "Editar hábito";

        habitNameInput.value = habit.name;
        habitIconInput.value = habit.icon || "";
        habitReminderTimeInput.value = habit.reminderTime || "09:00";

        habitFrequencyInput.value = habit.frequency || "daily";

        customDayInputs.forEach(input => {
            input.checked = getHabitDays(habit).includes(
                Number(input.value)
            );
        });

        habitGoalInput.value =
            habit.weeklyGoal || getHabitDays(habit).length;

        saveHabitButton.textContent = "Salvar alterações";
    } else {
        habitModalTitle.textContent = "Novo hábito";

        habitNameInput.value = "";
        habitIconInput.value = "";
        habitReminderTimeInput.value = "09:00";

        habitFrequencyInput.value = "daily";
        habitGoalInput.value = 7;

        customDayInputs.forEach(input => {
            input.checked = false;
        });

        saveHabitButton.textContent = "Salvar";
    }

    updateCustomDaysVisibility();
    updateGoalForFrequency();

    if (habit) {
        habitGoalInput.value =
            habit.weeklyGoal || getHabitDays(habit).length;
    }

    habitModal.classList.add("active");
    habitNameInput.focus();
}


// =====================================
// FECHAR JANELA DE HÁBITOS
// =====================================

function closeHabitModal() {
    habitModal.classList.remove("active");

    editingHabitId = null;

    habitNameInput.value = "";
    habitIconInput.value = "";
    habitReminderTimeInput.value = "09:00";

    habitFrequencyInput.value = "daily";
    habitGoalInput.value = 7;

    customDayInputs.forEach(input => {
        input.checked = false;
    });

    updateCustomDaysVisibility();

    habitModalTitle.textContent = "Novo hábito";
    saveHabitButton.textContent = "Salvar";
}

addHabitButton.addEventListener("click", () => {
    openHabitModal();
});

cancelHabitButton.addEventListener("click", closeHabitModal);

habitModal.addEventListener("click", event => {
    if (event.target === habitModal) {
        closeHabitModal();
    }
});


// =====================================
// SALVAR E EDITAR HÁBITOS
// =====================================

saveHabitButton.addEventListener("click", () => {
    const name = habitNameInput.value.trim();
    const icon = habitIconInput.value.trim() || "⭐";
    const frequency = habitFrequencyInput.value;

    if (!name) {
        alert("Digite o nome do hábito.");
        habitNameInput.focus();
        return;
    }

    let daysOfWeek;

    if (frequency === "custom") {
        daysOfWeek = customDayInputs
            .filter(input => input.checked)
            .map(input => Number(input.value));

        if (daysOfWeek.length === 0) {
            alert("Selecione pelo menos um dia da semana.");
            return;
        }
    } else {
        daysOfWeek = getDaysForFrequency(frequency);
    }

    const weeklyGoal = Number(habitGoalInput.value);

    if (
        !Number.isInteger(weeklyGoal) ||
        weeklyGoal < 1 ||
        weeklyGoal > daysOfWeek.length
    ) {
        alert(
            `A meta deve ser de 1 até ${daysOfWeek.length} vezes por semana.`
        );
        habitGoalInput.focus();
        return;
    }

    if (editingHabitId !== null) {
        const habit = habits.find(
            item => item.id === editingHabitId
        );

        if (habit) {
            habit.name = name;
            habit.icon = icon;
            habit.frequency = frequency;
            habit.daysOfWeek = daysOfWeek;
            habit.weeklyGoal = weeklyGoal;
            habit.reminderTime = habitReminderTimeInput.value || "09:00";
        }
    } else {
        habits.push({
            id: Date.now(),
            name,
            icon,
            frequency,
            daysOfWeek,
            weeklyGoal,
            reminderTime: habitReminderTimeInput.value || "09:00",
            completedDates: []
        });
    }

    saveHabits();
    renderHabits();

    closeHabitModal();
});


// =====================================
// API LOCAL PARA INTEGRAÇÃO COM A ÓRBIA IA
// =====================================

window.OrbiaAppActions = window.OrbiaAppActions || {};

Object.assign(window.OrbiaAppActions, {
    getHabits() {
        return habits.map(habit => ({
            id: habit.id,
            name: habit.name,
            frequency: habit.frequency,
            daysOfWeek: [...getHabitDays(habit)],
            weeklyGoal: habit.weeklyGoal,
            reminderTime: habit.reminderTime || "09:00",
            completedDates: [...habit.completedDates]
        }));
    },

    createHabit(data = {}) {
        const name = String(data.name || "").trim();
        const days = Array.isArray(data.daysOfWeek)
            ? [...new Set(data.daysOfWeek.map(Number))]
            : getDaysForFrequency(data.frequency || "daily");
        const weeklyGoal = Number(data.weeklyGoal || days.length);

        if (!name || name.length > 50) throw new Error("Informe um nome de hábito com até 50 caracteres.");
        if (!days.length || days.some(day => !Number.isInteger(day) || day < 0 || day > 6)) {
            throw new Error("Escolha dias válidos para o hábito.");
        }
        if (!Number.isInteger(weeklyGoal) || weeklyGoal < 1 || weeklyGoal > days.length) {
            throw new Error("A frequência semanal precisa estar entre 1 e o número de dias escolhidos.");
        }

        const frequency = data.frequency === "weekdays" || data.frequency === "weekends" ||
            data.frequency === "daily" ? data.frequency : "custom";
        const habit = {
            id: Date.now(),
            name,
            icon: String(data.icon || "⭐").slice(0, 4),
            frequency,
            daysOfWeek: days,
            weeklyGoal,
            reminderTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(data.reminderTime || "")
                ? data.reminderTime : "09:00",
            completedDates: []
        };
        habits.push(habit);
        saveHabits();
        renderHabits();
        return { id: habit.id, name: habit.name, weeklyGoal: habit.weeklyGoal, daysOfWeek: [...days] };
    },

    completeHabit(name, date = getLocalDate()) {
        const habit = habits.find(item => item.name.toLocaleLowerCase() === String(name || "").trim().toLocaleLowerCase());
        if (!habit) throw new Error("Não encontrei esse hábito.");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isHabitScheduled(habit, date)) {
            throw new Error("Esse hábito não está programado para a data informada.");
        }
        if (!habit.completedDates.includes(date)) habit.completedDates.push(date);
        saveHabits();
        renderHabits();
        return { name: habit.name, date, completed: true };
    },

    getActivities() {
        return activities.map(item => ({ ...item }));
    },

    createActivity(data = {}) {
        const name = String(data.name || "").trim();
        const date = String(data.date || "");
        const time = String(data.time || "");
        if (!name || name.length > 100) throw new Error("Informe o nome da atividade.");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || getLocalDate(new Date(date + "T12:00:00")) !== date) {
            throw new Error("Informe uma data válida no formato AAAA-MM-DD.");
        }
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("Informe um horário válido.");
        const activity = { id: Date.now(), name, time, date, done: false };
        activities.push(activity);
        selectedDate = date;
        saveActivities();
        renderWeek();
        renderActivities();
        return { ...activity };
    },

    getToday() {
        return getLocalDate();
    }
});

// =====================================
// NAVEGAÇÃO PRINCIPAL
// =====================================

const navigationButtons = {
    home: document.getElementById("nav-home"),
    agenda: document.getElementById("nav-agenda"),
    habits: document.getElementById("nav-habits"),
    settings: document.getElementById("nav-settings")
};

const pageSections = {
    home: [
        "daily-progress-section",
        "agenda-section",
        "schedule-section",
        "sleep-section",
        "habits-section"
    ],

    agenda: [
        "agenda-section",
        "schedule-section"
    ],

    habits: [
        "habits-section"
    ],

    settings: [
        "settings-section"
    ],

};

const allPageSections = [
    "daily-progress-section",
    "agenda-section",
    "schedule-section",
    "sleep-section",
    "habits-section",
    "settings-section"
];

function showPage(page) {
    if (!pageSections[page]) {
        return;
    }

    allPageSections.forEach(id => {
        const section = document.getElementById(id);
        section.style.display = "none";
    });

    pageSections[page].forEach(id => {
        const section = document.getElementById(id);
        section.style.display = "";
    });

    Object.entries(navigationButtons).forEach(([name, button]) => {
        button.classList.toggle("active", name === page);
    });

    addButton.style.display =
        page === "home" || page === "agenda" ? "" : "none";

    addHabitButton.style.display =
        page === "home" || page === "habits" ? "" : "none";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

navigationButtons.home.addEventListener("click", () => {
    showPage("home");
});

navigationButtons.agenda.addEventListener("click", () => {
    showPage("agenda");
});

navigationButtons.habits.addEventListener("click", () => {
    showPage("habits");
});

navigationButtons.settings.addEventListener("click", () => {
    showPage("settings");
});


document.getElementById("view-all").addEventListener("click", () => {
    showPage("agenda");
});

document.getElementById("settings-theme-button")
    .addEventListener("click", () => {
        themeButton.click();
    });


// =====================================
// INICIALIZAÇÃO
// =====================================

updateDate();
renderWeek();
renderActivities();
renderHabits();
showPage("home");
