import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

(() => {
    "use strict";

    const CHANNEL_ID = "orbia-reminders-v2";
    const TEST_ID = 906202611;
    const SLEEP_KEY = "orbia-sleep-reminders";
    const isNative = Capacitor.isNativePlatform();
    let syncTimer = null;
    let syncing = false;

    function sleepSettings() {
        try {
            const value = JSON.parse(localStorage.getItem(SLEEP_KEY) || "{}");
            return {
                enabled: value.enabled === true,
                bedtime: /^([01]\d|2[0-3]):[0-5]\d$/.test(value.bedtime || "") ? value.bedtime : "22:00",
                waketime: /^([01]\d|2[0-3]):[0-5]\d$/.test(value.waketime || "") ? value.waketime : "07:00"
            };
        } catch {
            return { enabled: false, bedtime: "22:00", waketime: "07:00" };
        }
    }

    function localDate(date) {
        return date.getFullYear() + "-" +
            String(date.getMonth() + 1).padStart(2, "0") + "-" +
            String(date.getDate()).padStart(2, "0");
    }

    function dateAt(date, time) {
        return new Date(date + "T" + time + ":00");
    }

    function notificationId(key) {
        let hash = 2166136261;
        for (let i = 0; i < key.length; i++) {
            hash ^= key.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        const id = (hash >>> 0) % 2000000000 + 1;
        return id === TEST_ID ? id - 1 : id;
    }

    async function createChannel() {
        if (!isNative) throw new Error("Notificações disponíveis apenas no aplicativo Android.");
        try {
            await LocalNotifications.createChannel({
                id: CHANNEL_ID,
                name: "Lembretes ORBIA",
                description: "Lembretes de agenda, hábitos, metas e sono",
                sound: "orbia_orbita.wav",
                importance: 5,
                vibration: true
            });
        } catch (error) {
            console.warn("Não foi possível atualizar o canal de notificações:", error);
        }
    }

    async function checkPermissions() {
        if (!isNative) return { display: "unavailable" };
        return LocalNotifications.checkPermissions();
    }

    async function requestPermission() {
        if (!isNative) throw new Error("Instale a versão Android do ORBIA para ativar notificações.");
        const result = await LocalNotifications.requestPermissions();
        if (result.display === "granted") {
            await createChannel();
            try {
                const exact = await LocalNotifications.checkExactNotificationSetting();
                if (exact.exact_alarm !== "granted") {
                    showStatus("Para receber lembretes no horário certo, autorize Alarmes e lembretes na próxima tela do Android.");
                    await LocalNotifications.changeExactNotificationSetting();
                }
            } catch (exactError) {
                console.warn("Não foi possível verificar alarmes exatos:", exactError);
            }
            await syncAll();
        }
        return result;
    }

    function addNotification(queue, key, title, body, at, category) {
        const date = at instanceof Date ? at : new Date(at);
        if (Number.isNaN(date.getTime()) || date <= new Date()) return;
        queue.push({
            id: notificationId(key),
            title,
            body,
            channelId: CHANNEL_ID,
            schedule: { at: date, allowWhileIdle: true },
            isExactNotification: true,
            extra: { category, orbiaManaged: true, orbiaKey: key }
        });
    }

    function buildQueue() {
        const queue = [];
        const now = new Date();
        const activities = safeArray("orbia-activities");
        const habits = safeArray("orbia-habits");
        const goals = safeArray("orbia-goals");
        const sleep = sleepSettings();
        const financeRecords = safeArray("orbia-finance-records");

        function dateDifferenceInDays(startDate, endDate) {
            const start = new Date(startDate + "T12:00:00");
            const end = new Date(endDate + "T12:00:00");
            return Math.round((end - start) / 86400000);
        }

        function isActivityScheduled(item, date, weekday) {
            if (date < item.date) return false;
            const rule = item.recurrence;
            if (!rule) return date === item.date;
            if (rule.until && date > rule.until) return false;

            const elapsedDays = dateDifferenceInDays(item.date, date);
            if (rule.type === "daily") return true;
            if (rule.type === "weekly") {
                return Array.isArray(rule.daysOfWeek) && rule.daysOfWeek.includes(weekday);
            }
            if (rule.type === "interval") {
                const interval = Math.max(1, Number(rule.interval) || 1);
                return elapsedDays >= 0 && elapsedDays % interval === 0;
            }
            return false;
        }

        for (let offset = 0; offset < 7; offset++) {
            const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 12);
            const date = localDate(day);
            const weekday = day.getDay();

            activities.forEach(item => {
                if (!item || !item.date || !item.time) return;
                if (!isActivityScheduled(item, date, weekday)) return;
                if (item.recurrence && Array.isArray(item.doneDates) && item.doneDates.includes(date)) return;
                if (!item.recurrence && item.done) return;

                const at = dateAt(date, item.time);
                const key = item.recurrence
                    ? "activity:" + item.id + ":" + date
                    : "activity:" + item.id;
                addNotification(
                    queue,
                    key,
                    "Sua atividade está começando",
                    item.name || "Confira sua agenda no ORBIA.",
                    new Date(at.getTime() - 5 * 60000),
                    "activity"
                );
            });

            habits.forEach(habit => {
                if (!habit || !Array.isArray(habit.daysOfWeek)) return;
                if (!habit.daysOfWeek.includes(weekday)) return;
                if ((habit.completedDates || []).includes(date)) return;
                const time = habit.reminderTime || "09:00";
                addNotification(queue, "habit:" + habit.id + ":" + date, "Hora de cuidar do seu hábito", habit.name || "Seu hábito está programado para hoje.", dateAt(date, time), "habit");
            });

            if (sleep.enabled) {
                addNotification(queue, "sleep-bed:" + date, "Está chegando a hora de descansar", "Prepare-se para encerrar o dia e cuidar do seu sono.", dateAt(date, sleep.bedtime), "sleep");
                addNotification(queue, "sleep-wake:" + date, "Bom dia! Hora de começar", "Seu horário planejado para acordar chegou.", dateAt(date, sleep.waketime), "sleep");
            }
        }

        goals.forEach(goal => {
            if (!goal || !goal.deadline || Number(goal.current) >= Number(goal.target)) return;
            addNotification(queue, "goal:" + goal.id, "Uma meta está chegando ao prazo", (goal.name || "Sua meta") + " tem prazo hoje. Confira seu progresso.", dateAt(goal.deadline, "09:00"), "goal");
        });

        financeRecords.filter(item => item && item.type === "income" && item.date && item.receivedEarly !== true).forEach(item => {
            const addIncomeReminder = date => {
                if (!date || (Array.isArray(item.receivedDates) && item.receivedDates.includes(date))) return;
                const due = new Date(date + "T09:00:00");
                due.setDate(due.getDate() - 1);
                addNotification(queue, "finance:" + item.id + ":" + date, "Recebimento previsto amanhã", (item.description || "Sua entrada") + " • " + new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(item.amount) || 0), due, "finance");
            };
            if (item.monthlyRecurrence) {
                const start = new Date(item.date + "T12:00:00");
                for (let offset = 0; offset < 12; offset++) {
                    const year = now.getFullYear();
                    const monthIndex = now.getMonth() + offset;
                    const first = new Date(year, monthIndex, 1);
                    const targetYear = first.getFullYear();
                    const targetMonth = first.getMonth();
                    const day = Number(start.getDate());
                    const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
                    const date = targetYear + "-" + String(targetMonth + 1).padStart(2, "0") + "-" + String(Math.min(day, lastDay)).padStart(2, "0");
                    if (date >= item.date) addIncomeReminder(date);
                }
            } else {
                addIncomeReminder(item.date);
            }
        });

        financeRecords.filter(item => item && item.type === "expense" && item.fixedRecurrence && item.date).forEach(item => {
            const start = new Date(item.date + "T12:00:00");
            const addExpenseReminder = (baseDate) => {
                if (Array.isArray(item.paidDates) && item.paidDates.includes(baseDate)) return;
                const override = item.occurrenceOverrides && item.occurrenceOverrides[baseDate];
                const dueDate = override && override.date ? override.date : baseDate;
                const due = new Date(dueDate + "T09:00:00");
                due.setDate(due.getDate() - 1);
                const value = Number(override && override.amount != null ? override.amount : item.amount) || 0;
                addNotification(queue, "finance-expense:" + item.id + ":" + baseDate, "Conta vence amanhã", (item.description || "Sua despesa fixa") + " • " + new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value), due, "finance");
            };
            for (let offset = 0; offset < 12; offset++) {
                const first = new Date(now.getFullYear(), now.getMonth() + offset, 1, 12);
                const year = first.getFullYear(), month = first.getMonth();
                if (item.fixedRecurrence === "monthly") {
                    const day = start.getDate(), last = new Date(year, month + 1, 0).getDate();
                    const date = year + "-" + String(month + 1).padStart(2, "0") + "-" + String(Math.min(day, last)).padStart(2, "0");
                    if (date >= item.date) addExpenseReminder(date);
                } else if (item.fixedRecurrence === "yearly" && month === start.getMonth() && year >= start.getFullYear()) {
                    const last = new Date(year, month + 1, 0).getDate();
                    const date = year + "-" + String(month + 1).padStart(2, "0") + "-" + String(Math.min(start.getDate(), last)).padStart(2, "0");
                    addExpenseReminder(date);
                } else if (item.fixedRecurrence === "weekly") {
                    const days = new Date(year, month + 1, 0).getDate();
                    for (let day = 1; day <= days; day++) {
                        const due = new Date(year, month, day, 12);
                        const date = localDate(due);
                        if (date >= item.date && due.getDay() === start.getDay()) addExpenseReminder(date);
                    }
                }
            }
        });

        return queue.slice(0, 450);
    }

    function safeArray(key) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(value) ? value : [];
        } catch {
            return [];
        }
    }

    async function syncAll() {
        if (!isNative || syncing) return { scheduled: 0 };
        syncing = true;
        try {
            const permission = await checkPermissions();
            if (permission.display !== "granted") return { scheduled: 0, permission: permission.display };
            let exactAlarm = "granted";
            try {
                const exact = await LocalNotifications.checkExactNotificationSetting();
                exactAlarm = exact.exact_alarm || "granted";
            } catch (exactError) {
                console.warn("Não foi possível verificar alarmes exatos:", exactError);
            }
            await createChannel();

            if (exactAlarm !== "granted") {
                // Remove a fila antiga de lembretes de sono, que podia conter
                // até 60 avisos da janela anterior de 30 dias. Preserva os
                // demais lembretes enquanto a permissão especial estiver bloqueada.
                const pendingWithoutExact = await LocalNotifications.getPending();
                const oldSleepReminders = (pendingWithoutExact.notifications || [])
                    .filter(item => item.extra && item.extra.orbiaManaged && item.extra.category === "sleep")
                    .map(item => ({ id: item.id }));
                if (oldSleepReminders.length) {
                    await LocalNotifications.cancel({ notifications: oldSleepReminders });
                }
                return { scheduled: 0, permission: "granted", exactAlarm };
            }

            const pending = await LocalNotifications.getPending();
            const managed = (pending.notifications || [])
                .filter(item => item.extra && item.extra.orbiaManaged)
                .map(item => ({ id: item.id }));

            if (managed.length) {
                await LocalNotifications.cancel({ notifications: managed });
            }

            const queue = buildQueue();
            if (queue.length) {
                await LocalNotifications.schedule({ notifications: queue });
            }
            return { scheduled: queue.length, exactAlarm };
        } finally {
            syncing = false;
        }
    }

    function queueSync() {
        if (syncTimer) clearTimeout(syncTimer);
        syncTimer = setTimeout(() => {
            syncAll().then(result => {
                if (result.permission === "granted" || result.scheduled) {
                    showStatus(result.scheduled + " lembretes programados." + (result.exactAlarm === "denied" ? " Atenção: permita Alarmes e lembretes para maior precisão." : ""));
                }
            }).catch(error => showStatus("Falha ao atualizar lembretes: " + error.message, true));
        }, 450);
    }

    async function scheduleTest() {
        if (!isNative) throw new Error("Notificações nativas indisponíveis.");
        await LocalNotifications.cancel({ notifications: [{ id: TEST_ID }] });
        const permission = await checkPermissions();
        if (permission.display !== "granted") throw new Error("Ative as notificações primeiro.");
        await createChannel();
        return LocalNotifications.schedule({
            notifications: [{
                id: TEST_ID,
                title: "ORBIA está funcionando! 🔔",
                body: "Sua central de lembretes está ativa.",
                sound: "orbia_orbita.wav",
                channelId: CHANNEL_ID,
                schedule: { at: new Date(Date.now() + 15000), allowWhileIdle: true },
                isExactNotification: true,
                extra: { category: "test" }
            }]
        });
    }

    window.OrbiaNotifications = {
        isAvailable: isNative,
        checkPermissions,
        requestPermission,
        scheduleTest,
        syncAll,
        getSettings: sleepSettings,
        restoreSettings: settings => {
            if (!settings || typeof settings.enabled !== "boolean" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(settings.bedtime || "") || !/^([01]\d|2[0-3]):[0-5]\d$/.test(settings.waketime || "")) throw new Error("Preferências de lembretes inválidas.");
            localStorage.setItem(SLEEP_KEY, JSON.stringify({ enabled: settings.enabled, bedtime: settings.bedtime, waketime: settings.waketime }));
            const bedtimeInput = document.getElementById("orbia-sleep-bedtime");
            const waketimeInput = document.getElementById("orbia-sleep-waketime");
            const enabledInput = document.getElementById("orbia-sleep-reminders-enabled");
            if (bedtimeInput) bedtimeInput.value = settings.bedtime;
            if (waketimeInput) waketimeInput.value = settings.waketime;
            if (enabledInput) enabledInput.checked = settings.enabled;
            queueSync();
        },
        getPending: async () => {
            if (!isNative) return [];
            const result = await LocalNotifications.getPending();
            return result.notifications || [];
        }
    };

    function showStatus(message, error = false) {
        const status = document.getElementById("orbia-notification-status");
        if (!status) return;
        status.textContent = message;
        status.style.color = error ? "#D65B5B" : "var(--accent)";
    }

    function mountInterface() {
        const settings = document.getElementById("settings-section");
        const sleepSection = document.getElementById("sleep-section");
        if (!settings || !sleepSection || document.getElementById("orbia-notification-card")) return;

        const saved = sleepSettings();
        const card = document.createElement("section");
        card.id = "orbia-notification-card";
        card.className = "sleep-card";
        card.style.marginBottom = "18px";
        card.innerHTML = `
            <h2>🔔 Lembretes inteligentes</h2>
            <p class="settings-description">O ORBIA programa lembretes para atividades, hábitos e prazos de metas. Os avisos são processados pelo Android e podem chegar mesmo com o aplicativo fechado.</p>
            <button type="button" id="orbia-enable-notifications" class="settings-button">Ativar notificações e alarmes</button>
            <p class="settings-description">Para lembretes fora do aplicativo, o Android precisa permitir notificações e Alarmes e lembretes. Em celulares Redmi/Xiaomi, deixe a bateria do ORBIA como Sem restrições e permita a Inicialização automática.</p>
            <button type="button" id="orbia-sync-notifications" class="settings-button secondary">Atualizar lembretes</button>
            <button type="button" id="orbia-test-notification" class="settings-button secondary">Enviar notificação de teste</button>
            <p id="orbia-notification-status" class="settings-status" aria-live="polite">Verificando notificações...</p>
        `;
        settings.appendChild(card);

        const sleepCard = document.createElement("section");
        sleepCard.id = "orbia-sleep-routine-card";
        sleepCard.className = "sleep-card";
        sleepCard.style.marginTop = "14px";
        sleepCard.innerHTML = `
            <h2>🌙 Minha rotina de sono</h2>
            <p class="settings-description">Defina seus horários para receber um lembrete de dormir e outro de acordar. Os avisos são programados para os próximos 7 dias.</p>
            <label class="settings-description" for="orbia-sleep-bedtime">Horário de dormir</label>
            <input id="orbia-sleep-bedtime" type="time" value="${saved.bedtime}" style="width:100%;min-height:42px;padding:10px;border:1px solid var(--border);border-radius:10px;background:var(--background);color:var(--text)">
            <label class="settings-description" for="orbia-sleep-waketime">Horário de acordar</label>
            <input id="orbia-sleep-waketime" type="time" value="${saved.waketime}" style="width:100%;min-height:42px;padding:10px;border:1px solid var(--border);border-radius:10px;background:var(--background);color:var(--text)">
            <label style="display:flex;align-items:center;gap:9px;margin-top:12px;font-size:13px"><input id="orbia-sleep-reminders-enabled" type="checkbox" ${saved.enabled ? "checked" : ""}> Ativar lembretes de sono</label>
            <button type="button" id="orbia-save-sleep-reminders" class="settings-button secondary">Salvar rotina de sono</button>
        `;
        sleepSection.appendChild(sleepCard);

        const enable = document.getElementById("orbia-enable-notifications");
        const sync = document.getElementById("orbia-sync-notifications");
        const test = document.getElementById("orbia-test-notification");
        const saveSleep = document.getElementById("orbia-save-sleep-reminders");

        saveSleep.addEventListener("click", async () => {
            const settings = {
                enabled: document.getElementById("orbia-sleep-reminders-enabled").checked,
                bedtime: document.getElementById("orbia-sleep-bedtime").value || "22:00",
                waketime: document.getElementById("orbia-sleep-waketime").value || "07:00"
            };
            localStorage.setItem(SLEEP_KEY, JSON.stringify(settings));
            if (!isNative) {
                showStatus("Rotina salva neste dispositivo. As notificações funcionam na versão Android.", false);
                return;
            }
            try {
                const result = await syncAll();
                showStatus("Rotina de sono salva. " + result.scheduled + " lembretes programados.");
            } catch (error) {
                showStatus("Horários salvos, mas não foi possível atualizar: " + error.message, true);
            }
        });

        if (!isNative) {
            showStatus("As notificações precisam da versão Android instalada.", true);
            [enable, sync, test].forEach(button => button.disabled = true);
            return;
        }

        enable.addEventListener("click", async () => {
            enable.disabled = true;
            try {
                const result = await requestPermission();
                if (result.display === "granted") {
                    const exact = await LocalNotifications.checkExactNotificationSetting();
                    if (exact.exact_alarm === "granted") showStatus("Permissões concedidas. Lembretes atualizados.");
                    else showStatus("As notificações estão autorizadas, mas Alarmes e lembretes ainda estão desativados. Ative essa permissão nas configurações do Android.", true);
                }
                else showStatus("Permissão não concedida. Verifique as configurações do Android.", true);
            } catch (error) {
                showStatus(error.message, true);
            } finally {
                enable.disabled = false;
            }
        });

        sync.addEventListener("click", async () => {
            sync.disabled = true;
            try {
                const result = await syncAll();
                showStatus(result.permission && result.permission !== "granted"
                    ? "Permissão pendente. Ative as notificações para programar lembretes."
                    : result.scheduled + " lembretes programados." + (result.exactAlarm === "denied" ? " Ative Alarmes e lembretes no Android." : ""));
            } catch (error) {
                showStatus("Não foi possível atualizar: " + error.message, true);
            } finally {
                sync.disabled = false;
            }
        });

        test.addEventListener("click", async () => {
            test.disabled = true;
            try {
                await scheduleTest();
                showStatus("Teste agendado. Você receberá um aviso em aproximadamente 15 segundos.");
            } catch (error) {
                showStatus(error.message, true);
            } finally {
                test.disabled = false;
            }
        });

        checkPermissions().then(result => {
            if (result.display === "granted") {
                syncAll().then(data => {
                    if (data.exactAlarm === "denied") showStatus("Permissão de notificações concedida. Falta permitir Alarmes e lembretes nas configurações do Android.", true);
                    else showStatus(data.scheduled + " lembretes programados.");
                }).catch(error => showStatus(error.message, true));
            } else {
                showStatus("Ative as notificações para receber lembretes de agenda e hábitos.");
            }
        }).catch(() => showStatus("Não foi possível verificar as permissões.", true));
    }

    // Revalida os lembretes quando o usuário volta ao aplicativo.
    // Isso recupera alterações feitas enquanto o ORBIA estava em segundo plano.
    let lastForegroundSync = 0;

    function refreshWhenForeground() {
        const now = Date.now();
        if (document.visibilityState === "hidden" || now - lastForegroundSync < 5000) {
            return;
        }
        lastForegroundSync = now;
        queueSync();
    }

    document.addEventListener("visibilitychange", refreshWhenForeground);
    window.addEventListener("focus", refreshWhenForeground);
    window.addEventListener("pageshow", refreshWhenForeground);

    window.addEventListener("orbia:data-changed", queueSync);
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", mountInterface, { once: true });
    } else {
        mountInterface();
    }
})();