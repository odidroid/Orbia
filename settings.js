
// =====================================
// ORBIA — MÓDULO DE AJUSTES
// =====================================

// Remover preferência obsoleta da antiga saudação por voz.
localStorage.removeItem("orbia-voice-settings");

const settingsThemeButton = document.getElementById("settings-theme-button");
const exportBackupButton = document.getElementById("export-backup");
const importBackupButton = document.getElementById("import-backup-button");
const importBackupFile = document.getElementById("import-backup-file");
const backupStatus = document.getElementById("backup-status");

const backupModal = document.getElementById("backup-modal");
const backupJsonContent = document.getElementById("backup-json-content");
const copyBackupButton = document.getElementById("copy-backup-button");
const closeBackupButton = document.getElementById("close-backup-button");
const backupCopyStatus = document.getElementById("backup-copy-status");


// =====================================
// APARÊNCIA
// =====================================

function updateSettingsThemeButton() {
    const isDark = document.body.classList.contains("dark-theme");

    settingsThemeButton.textContent = isDark
        ? "☀ Ativar tema claro"
        : "☾ Ativar tema escuro";
}

themeButton.addEventListener("click", updateSettingsThemeButton);
updateSettingsThemeButton();


// =====================================
// GERAR CONTEÚDO DO BACKUP
// =====================================

function generateBackupContent() {
    const backup = {
        application: "ORBIA",
        version: 1,
        exportedAt: new Date().toISOString(),
        profile: (() => { try { return JSON.parse(localStorage.getItem("orbia-profile") || "null"); } catch { return null; } })(),
        activities: activities,
        habits: habits,
        goals: goals,
        finance: window.OrbiaFinance ? window.OrbiaFinance.getBackupData() : { records: [], budgets: {} },
        sleep: window.OrbiaSleep ? window.OrbiaSleep.getBackupData() : [],
        notificationSettings: window.OrbiaNotifications && window.OrbiaNotifications.getSettings
            ? window.OrbiaNotifications.getSettings()
            : { enabled: false, bedtime: "22:00", waketime: "07:00" }
    };

    return JSON.stringify(backup, null, 2);
}


// =====================================
// NOME DO ARQUIVO
// =====================================

function generateBackupFileName() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    return `orbia-backup-${year}-${month}-${day}-${hours}-${minutes}-${seconds}.json`;
}


// =====================================
// EXPORTAR ARQUIVO
// =====================================

async function saveBackupFile(content) {
    const fileName = generateBackupFileName();

    const blob = new Blob(
        [content],
        { type: "application/json;charset=utf-8" }
    );

    if (blob.size === 0) {
        throw new Error("O backup gerado está vazio.");
    }

    // OPÇÃO 1: SALVAMENTO NATIVO DO ANDROID

    if (
        window.OrbiaBackupExporter &&
        window.OrbiaBackupExporter.isAvailable
    ) {
        const result = await window.OrbiaBackupExporter.save(
            fileName,
            content
        );

        if (!result || result.success !== true) {
            throw new Error(
                "O Android não confirmou o salvamento do backup."
            );
        }

        return "native";
    }

    // OPÇÃO 2: JANELA NATIVA DO NAVEGADOR

    if (typeof window.showSaveFilePicker === "function") {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [{
                    description: "Backup do ORBIA",
                    accept: {
                        "application/json": [".json"]
                    }
                }]
            });

            const writable = await handle.createWritable();

            await writable.write(blob);
            await writable.close();

            return "saved";

        } catch (error) {
            if (error.name === "AbortError") {
                return "cancelled";
            }

            console.warn(
                "Janela de salvamento indisponível:",
                error
            );
        }
    }

    // OPÇÃO 3: DOWNLOAD DO NAVEGADOR

    let downloadUrl = null;

    try {
        downloadUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");

        link.href = downloadUrl;
        link.download = fileName;
        link.type = "application/json";
        link.style.display = "none";

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => {
            URL.revokeObjectURL(downloadUrl);
        }, 60000);

        return "downloaded";

    } catch (error) {
        if (downloadUrl) {
            URL.revokeObjectURL(downloadUrl);
        }

        throw error;
    }
}


// =====================================
// EXECUTAR EXPORTAÇÃO
// =====================================

async function exportBackup() {
    try {
        backupStatus.textContent = "Preparando backup...";

        const content = generateBackupContent();

        JSON.parse(content);

        const result = await saveBackupFile(content);

        if (result === "native") {
            backupStatus.textContent =
                "Backup salvo com sucesso em Downloads/ORBIA!";

            return;
        }

        if (result === "saved") {
            backupStatus.textContent =
                "Backup salvo com sucesso!";

            return;
        }

        if (result === "downloaded") {
            backupStatus.textContent =
                "Download iniciado! Verifique a pasta Downloads.";

            return;
        }

        if (result === "cancelled") {
            backupStatus.textContent =
                "Salvamento cancelado.";

            return;
        }

    } catch (error) {
        console.error("Erro ao exportar backup:", error);

        backupStatus.textContent =
            "Erro na exportação: " + error.message;
    }
}

exportBackupButton.addEventListener("click", exportBackup);


// =====================================
// COPIAR BACKUP (RECURSO MANUAL)
// =====================================

async function copyBackup() {
    try {
        const content = backupJsonContent.value;

        if (!content) {
            backupCopyStatus.textContent =
                "Não existe conteúdo para copiar.";

            return;
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(content);

                backupCopyStatus.textContent =
                    "Backup copiado com sucesso!";

                return;

            } catch (error) {
                console.warn(
                    "Clipboard API indisponível:",
                    error
                );
            }
        }

        backupJsonContent.focus();
        backupJsonContent.select();

        backupJsonContent.setSelectionRange(
            0,
            backupJsonContent.value.length
        );

        const copied = document.execCommand("copy");

        backupCopyStatus.textContent = copied
            ? "Backup copiado com sucesso!"
            : "Selecione e copie manualmente o conteúdo.";

    } catch (error) {
        console.error("Erro ao copiar:", error);

        backupCopyStatus.textContent =
            "Não foi possível copiar automaticamente.";

        backupJsonContent.focus();
        backupJsonContent.select();
    }
}

copyBackupButton.addEventListener("click", copyBackup);


// =====================================
// FECHAR JANELA
// =====================================

function closeBackupModal() {
    backupModal.classList.remove("active");
}

closeBackupButton.addEventListener("click", closeBackupModal);

backupModal.addEventListener("click", event => {
    if (event.target === backupModal) {
        closeBackupModal();
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeBackupModal();
    }
});


// =====================================
// ABRIR IMPORTAÇÃO
// =====================================

importBackupButton.addEventListener("click", () => {
    importBackupFile.click();
});


// =====================================
// VALIDAR BACKUP
// =====================================

function validateBackup(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        return false;
    }

    if (data.application !== "ORBIA") {
        return false;
    }

    if (!Array.isArray(data.activities)) {
        return false;
    }

    if (!Array.isArray(data.habits)) {
        return false;
    }

    // Compatibilidade com backups antigos.
    if (
        data.goals !== undefined &&
        !Array.isArray(data.goals)
    ) {
        return false;
    }

    const validActivities = data.activities.every(activity => {
        return (
            activity &&
            typeof activity === "object" &&
            activity.id !== undefined &&
            typeof activity.name === "string" &&
            typeof activity.time === "string" &&
            typeof activity.date === "string"
        );
    });

    const validHabits = data.habits.every(habit => {
        return (
            habit &&
            typeof habit === "object" &&
            habit.id !== undefined &&
            typeof habit.name === "string"
        );
    });

    if (data.finance !== undefined) {
        if (!data.finance || typeof data.finance !== "object" ||
            !Array.isArray(data.finance.records) || !data.finance.budgets ||
            typeof data.finance.budgets !== "object" || Array.isArray(data.finance.budgets)) return false;
        const validFinanceRecords = data.finance.records.every(record =>
            record && typeof record === "object" && record.id !== undefined &&
            typeof record.description === "string" &&
            Number.isFinite(Number(record.amount)) && Number(record.amount) > 0 &&
            typeof record.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(record.date) &&
            ["income", "expense"].includes(record.type) && typeof record.category === "string"
        );
        const validBudgets = Object.values(data.finance.budgets).every(value =>
            Number.isFinite(Number(value)) && Number(value) >= 0
        );
        if (!validFinanceRecords || !validBudgets) return false;
    }

    if (data.sleep !== undefined) {
        const validTime = value => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
        if (!Array.isArray(data.sleep) || !data.sleep.every(record =>
            record && typeof record === "object" && record.id !== undefined &&
            typeof record.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(record.date) &&
            validTime(record.bedtime) && validTime(record.waketime)
        )) return false;
    }

    if (data.profile !== undefined && data.profile !== null) {
        const profile = data.profile;
        const validTime = value => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
        if (!profile || typeof profile !== "object" || typeof profile.name !== "string" || !profile.name.trim() || typeof profile.birthDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(profile.birthDate) || !validTime(profile.bedtime) || !validTime(profile.waketime)) return false;
    }

    if (data.notificationSettings !== undefined) {
        const settings = data.notificationSettings;
        if (!settings || typeof settings !== "object" || typeof settings.enabled !== "boolean" ||
            typeof settings.bedtime !== "string" || typeof settings.waketime !== "string" ||
            !/^([01]\d|2[0-3]):[0-5]\d$/.test(settings.bedtime) ||
            !/^([01]\d|2[0-3]):[0-5]\d$/.test(settings.waketime)) return false;
    }

    const validGoals = (data.goals || []).every(goal => {
        return (
            goal &&
            typeof goal === "object" &&
            goal.id !== undefined &&
            typeof goal.name === "string" &&
            Number.isFinite(Number(goal.target)) &&
            Number(goal.target) > 0 &&
            Number.isFinite(Number(goal.current)) &&
            Number(goal.current) >= 0
        );
    });

    return validActivities && validHabits && validGoals;
}


// =====================================
// NORMALIZAR HÁBITOS
// =====================================

function normalizeImportedHabits(importedHabits) {
    return importedHabits.map(habit => {
        const frequency = habit.frequency || "daily";

        let defaultDays = [0, 1, 2, 3, 4, 5, 6];

        if (frequency === "weekdays") {
            defaultDays = [1, 2, 3, 4, 5];
        }

        if (frequency === "weekends") {
            defaultDays = [0, 6];
        }

        const daysOfWeek = Array.isArray(habit.daysOfWeek)
            ? habit.daysOfWeek
            : defaultDays;

        return {
            ...habit,
            icon: habit.icon || "⭐",
            frequency,

            daysOfWeek: daysOfWeek.length
                ? daysOfWeek
                : defaultDays,

            weeklyGoal: habit.weeklyGoal ||
                (daysOfWeek.length || defaultDays.length),

            completedDates: Array.isArray(habit.completedDates)
                ? habit.completedDates
                : []
        };
    });
}


// =====================================
// NORMALIZAR METAS
// =====================================

function normalizeImportedGoals(importedGoals) {
    return importedGoals.map(goal => ({
        ...goal,
        description: goal.description || "",
        target: Number(goal.target),
        current: Number(goal.current) || 0,
        unit: goal.unit || "unidades",
        deadline: goal.deadline || ""
    }));
}


// =====================================
// LER ARQUIVO
// =====================================

async function readBackupFile(file) {
    if (typeof file.text === "function") {
        try {
            const content = await file.text();

            if (content && content.trim()) {
                return content;
            }

            console.warn("file.text() retornou conteúdo vazio.");

        } catch (error) {
            console.warn("Falha em file.text():", error);
        }
    }

    return await new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            const content = String(reader.result || "");

            if (!content.trim()) {
                reject(
                    new Error("O navegador recebeu um arquivo vazio.")
                );

                return;
            }

            resolve(content);
        };

        reader.onerror = () => {
            reject(
                new Error("O navegador não conseguiu ler o arquivo.")
            );
        };

        reader.onabort = () => {
            reject(
                new Error("A leitura do arquivo foi interrompida.")
            );
        };

        reader.readAsText(file, "UTF-8");
    });
}


// =====================================
// IMPORTAR BACKUP
// =====================================

importBackupFile.addEventListener("change", async event => {
    const file = event.target.files[0];

    if (!file) {
        return;
    }

    try {
        backupStatus.textContent =
            `Lendo backup (${file.size} bytes)...`;

        if (file.size === 0) {
            throw new Error("O arquivo selecionado está vazio.");
        }

        const rawContent = await readBackupFile(file);

        const content = rawContent
            .replace(/^\uFEFF/, "")
            .trim();

        if (!content) {
            throw new Error("O conteúdo recebido está vazio.");
        }

        let backup;

        try {
            backup = JSON.parse(content);

        } catch (error) {
            console.error("Conteúdo recebido:", rawContent);

            throw new Error(
                "O JSON recebido está incompleto ou inválido. " +
                "Arquivo: " + file.size + " bytes; " +
                "texto recebido: " + content.length + " caracteres. " +
                error.message
            );
        }

        if (!validateBackup(backup)) {
            throw new Error(
                "O arquivo não possui a estrutura esperada pelo ORBIA."
            );
        }

        const confirmed = confirm(
            "Importar este backup substituirá os dados das categorias presentes nele. " +
            "Categorias ausentes em backups antigos serão preservadas.\n\n" +
            "Deseja continuar?"
        );

        if (!confirmed) {
            backupStatus.textContent = "Importação cancelada.";
            return;
        }

        const storageKeys = [
            "orbia-activities", "orbia-habits", "orbia-goals",
            "orbia-finance-records", "orbia-finance-budgets",
            "orbia-sleep", "orbia-sleep-reminders", "orbia-profile"
        ];
        const previousStorage = Object.fromEntries(storageKeys.map(key => [key, localStorage.getItem(key)]));
        const previousState = { activities, habits, goals };
        const previousFinance = window.OrbiaFinance ? window.OrbiaFinance.getBackupData() : null;
        const previousSleep = window.OrbiaSleep ? window.OrbiaSleep.getBackupData() : null;
        const previousNotifications = window.OrbiaNotifications && window.OrbiaNotifications.getSettings
            ? window.OrbiaNotifications.getSettings()
            : null;

        try {
            activities = backup.activities.map(activity => ({
                ...activity,
                done: Boolean(activity.done)
            }));
            habits = normalizeImportedHabits(backup.habits);

            if (Array.isArray(backup.goals)) {
                goals = normalizeImportedGoals(backup.goals);
                saveGoals();
            }

            saveActivities();
            saveHabits();

            if (window.OrbiaFinance && backup.finance) window.OrbiaFinance.restoreData(backup.finance);
            if (window.OrbiaSleep && Array.isArray(backup.sleep)) window.OrbiaSleep.restoreData(backup.sleep);
            if (backup.profile) localStorage.setItem("orbia-profile", JSON.stringify(backup.profile));
            if (window.OrbiaNotifications && backup.notificationSettings && window.OrbiaNotifications.restoreSettings) {
                window.OrbiaNotifications.restoreSettings(backup.notificationSettings);
            }

            renderActivities();
            renderHabits();
            renderWeek();
            renderGoals();
            if (window.OrbiaProfile && window.OrbiaProfile.refresh) window.OrbiaProfile.refresh();
            backupStatus.textContent = "Backup importado com sucesso! Dados disponíveis foram restaurados.";
        } catch (restoreError) {
            activities = previousState.activities;
            habits = previousState.habits;
            goals = previousState.goals;

            for (const key of storageKeys) {
                try {
                    const previousValue = previousStorage[key];
                    if (previousValue === null) localStorage.removeItem(key);
                    else localStorage.setItem(key, previousValue);
                } catch (rollbackError) {
                    console.error("Falha ao reverter " + key + ":", rollbackError);
                }
            }

            try {
                if (previousFinance && window.OrbiaFinance) window.OrbiaFinance.restoreData(previousFinance);
                if (previousSleep && window.OrbiaSleep) window.OrbiaSleep.restoreData(previousSleep);
                if (previousNotifications && window.OrbiaNotifications) window.OrbiaNotifications.restoreSettings(previousNotifications);
            } catch (rollbackError) {
                console.error("Falha ao reverter módulos do backup:", rollbackError);
            }

            renderActivities();
            renderHabits();
            renderWeek();
            renderGoals();
            throw new Error("A importação foi revertida para proteger seus dados: " + restoreError.message);
        }

    } catch (error) {
        console.error("Erro ao importar backup:", error);

        backupStatus.textContent =
            "Erro ao importar: " + error.message;

    } finally {
        importBackupFile.value = "";
    }
});


// =====================================
// ACESSIBILIDADE — TAMANHO DO TEXTO
// =====================================
(() => {
    const key = "orbia-accessibility";
    const modes = document.querySelectorAll('input[name="orbia-text-mode"]');
    const panel = document.getElementById("orbia-custom-text-size");
    const slider = document.getElementById("orbia-text-size");
    const output = document.getElementById("orbia-text-size-value");
    const status = document.getElementById("orbia-text-size-status");
    if (!modes.length || !panel || !slider || !output) return;

    let prefs = { mode: "default", customScale: 100 };
    try {
        const saved = JSON.parse(localStorage.getItem(key) || "null");
        if (saved && ["default", "system", "custom"].includes(saved.mode)) {
            prefs = { mode: saved.mode, customScale: Math.min(160, Math.max(100, Number(saved.customScale) || 100)) };
        }
    } catch (error) { console.warn("Falha ao ler acessibilidade:", error); }

    const apply = scale => {
        const value = Math.min(1.8, Math.max(0.85, Number(scale) || 1));
        document.documentElement.style.setProperty("--orbia-interface-scale", String(value));
    };
    const save = () => {
        try { localStorage.setItem(key, JSON.stringify(prefs)); }
        catch (error) { console.warn("Falha ao salvar acessibilidade:", error); }
    };
    async function applySystemScale() {
        try {
            if (window.OrbiaFontScale && window.OrbiaFontScale.isAvailable) {
                const result = await window.OrbiaFontScale.getSystemFontScale();
                if (result && Number.isFinite(Number(result.scale))) {
                    apply(result.scale);
                    status.textContent = "Sincronizado com a escala de fonte do Android.";
                    return;
                }
            }
        } catch (error) { console.warn("Falha ao consultar fonte do Android:", error); }
        apply(1);
        status.textContent = "Não foi possível ler a escala do Android; o tamanho padrão está ativo.";
    }
    function render() {
        modes.forEach(input => { input.checked = input.value === prefs.mode; });
        panel.hidden = prefs.mode !== "custom";
        slider.value = String(prefs.customScale);
        output.value = prefs.customScale + "%";
        output.textContent = prefs.customScale + "%";
        if (prefs.mode === "custom") {
            apply(prefs.customScale / 100);
            status.textContent = "Ajuste aplicado imediatamente.";
        } else if (prefs.mode === "system") {
            applySystemScale();
        } else {
            apply(1);
            status.textContent = "";
        }
    }
    modes.forEach(input => input.addEventListener("change", () => {
        prefs.mode = input.value; save(); render();
    }));
    slider.addEventListener("input", () => {
        prefs.mode = "custom";
        prefs.customScale = Math.min(160, Math.max(100, Number(slider.value) || 100));
        save(); render();
    });
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden && prefs.mode === "system") applySystemScale();
    });
    window.addEventListener("focus", () => {
        if (prefs.mode === "system") applySystemScale();
    });
    render();
})();
