import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

(() => {
    "use strict";

    const CHANNEL_ID = "orbia-reminders";
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

        activities.forEach(item => {
            if (!item || item.done || !item.date || !item.time) return;
            const at = dateAt(item.date, item.time);
            addNotification(queue, "activity:" + item.id, "Sua atividade está começando", item.name || "Confira sua agenda no ORBIA.", new Date(at.getTime() - 5 * 60000), "activity");
        });

        for (let offset = 0; offset < 30; offset++) {
            const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 12);
            const date = localDate(day);
            const weekday = day.getDay();

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
            await createChannel();

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
            return { scheduled: queue.length };
        } finally {
            syncing = false;
        }
    }

    function queueSync() {
        if (syncTimer) clearTimeout(syncTimer);
        syncTimer = setTimeout(() => {
            syncAll().then(result => {
                if (result.permission === "granted" || result.scheduled) {
                    showStatus(result.scheduled + " lembretes programados.");
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
                channelId: CHANNEL_ID,
                schedule: { at: new Date(Date.now() + 15000), allowWhileIdle: true },
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
        if (!settings || document.getElementById("orbia-notification-card")) return;

        const saved = sleepSettings();
        const card = document.createElement("section");
        card.id = "orbia-notification-card";
        card.className = "sleep-card";
        card.style.marginBottom = "18px";
        card.innerHTML = `
            <h2>🔔 Lembretes inteligentes</h2>
            <p class="settings-description">O ORBIA programa lembretes para atividades, hábitos e prazos de metas. Os avisos são processados pelo Android e podem chegar mesmo com o aplicativo fechado.</p>
            <button type="button" id="orbia-enable-notifications" class="settings-button">Ativar notificações</button>
            <button type="button" id="orbia-sync-notifications" class="settings-button secondary">Atualizar lembretes</button>
            <div class="settings-divider"></div>
            <strong>Rotina de sono</strong>
            <p class="settings-description">Opcional: receba um aviso no horário de dormir e outro no horário de acordar.</p>
            <label class="settings-description" for="orbia-sleep-bedtime">Lembrete para dormir</label>
            <input id="orbia-sleep-bedtime" type="time" value="${saved.bedtime}" style="width:100%;min-height:42px;padding:10px;border:1px solid var(--border);border-radius:10px;background:var(--background);color:var(--text)">
            <label class="settings-description" for="orbia-sleep-waketime">Lembrete para acordar</label>
            <input id="orbia-sleep-waketime" type="time" value="${saved.waketime}" style="width:100%;min-height:42px;padding:10px;border:1px solid var(--border);border-radius:10px;background:var(--background);color:var(--text)">
            <label style="display:flex;align-items:center;gap:9px;margin-top:12px;font-size:13px"><input id="orbia-sleep-reminders-enabled" type="checkbox" ${saved.enabled ? "checked" : ""}> Ativar lembretes de sono</label>
            <button type="button" id="orbia-save-sleep-reminders" class="settings-button secondary">Salvar horários de sono</button>
            <button type="button" id="orbia-test-notification" class="settings-button secondary">Enviar notificação de teste</button>
            <p id="orbia-notification-status" class="settings-status" aria-live="polite">Verificando notificações...</p>
        `;
        settings.appendChild(card);

        const enable = document.getElementById("orbia-enable-notifications");
        const sync = document.getElementById("orbia-sync-notifications");
        const test = document.getElementById("orbia-test-notification");
        const saveSleep = document.getElementById("orbia-save-sleep-reminders");

        if (!isNative) {
            showStatus("As notificações precisam da versão Android instalada.", true);
            [enable, sync, test, saveSleep].forEach(button => button.disabled = true);
            return;
        }

        enable.addEventListener("click", async () => {
            enable.disabled = true;
            try {
                const result = await requestPermission();
                if (result.display === "granted") showStatus("Permissão concedida. Lembretes atualizados.");
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
                    : result.scheduled + " lembretes programados.");
            } catch (error) {
                showStatus("Não foi possível atualizar: " + error.message, true);
            } finally {
                sync.disabled = false;
            }
        });

        saveSleep.addEventListener("click", async () => {
            const settings = {
                enabled: document.getElementById("orbia-sleep-reminders-enabled").checked,
                bedtime: document.getElementById("orbia-sleep-bedtime").value || "22:00",
                waketime: document.getElementById("orbia-sleep-waketime").value || "07:00"
            };
            localStorage.setItem(SLEEP_KEY, JSON.stringify(settings));
            try {
                const result = await syncAll();
                showStatus("Rotina de sono salva. " + result.scheduled + " lembretes programados.");
            } catch (error) {
                showStatus("Horários salvos, mas não foi possível atualizar: " + error.message, true);
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
                syncAll().then(data => showStatus(data.scheduled + " lembretes programados.")).catch(error => showStatus(error.message, true));
            } else {
                showStatus("Ative as notificações para receber lembretes de agenda e hábitos.");
            }
        }).catch(() => showStatus("Não foi possível verificar as permissões.", true));
    }

    window.addEventListener("orbia:data-changed", queueSync);
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", mountInterface, { once: true });
    } else {
        mountInterface();
    }
})();