
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

(() => {
    "use strict";

    const CHANNEL_ID = "orbia-reminders";
    const TEST_ID = 906202611;

    const isNative = Capacitor.isNativePlatform();

    async function createChannel() {
        if (!isNative) {
            throw new Error("Notificações nativas indisponíveis.");
        }

        await LocalNotifications.createChannel({
            id: CHANNEL_ID,
            name: "Lembretes ORBIA",
            description: "Avisos de hábitos, metas, agenda e sono",
            importance: 5,
            vibration: true
        });
    }

    async function checkPermissions() {
        if (!isNative) {
            return { display: "unavailable" };
        }

        return await LocalNotifications.checkPermissions();
    }

    async function requestPermission() {
        if (!isNative) {
            throw new Error(
                "Esta função precisa da versão Android instalada."
            );
        }

        return await LocalNotifications.requestPermissions();
    }

    async function schedule({
        id,
        title,
        body,
        at,
        category = "general",
        allowWhileIdle = true
    }) {
        if (!isNative) {
            throw new Error("Notificações nativas indisponíveis.");
        }

        if (!Number.isInteger(id) || id < 1 || id > 2147483647) {
            throw new Error("Identificador de notificação inválido.");
        }

        const date = at instanceof Date ? at : new Date(at);

        if (Number.isNaN(date.getTime()) || date <= new Date()) {
            throw new Error("O horário precisa estar no futuro.");
        }

        const permission = await checkPermissions();

        if (permission.display !== "granted") {
            throw new Error("Permissão de notificações não concedida.");
        }

        await createChannel();

        return await LocalNotifications.schedule({
            notifications: [
                {
                    id,
                    title,
                    body,
                    channelId: CHANNEL_ID,
                    schedule: {
                        at: date,
                        allowWhileIdle
                    },
                    isExactNotification: true,
                    isExactMandatory: false,
                    extra: {
                        category
                    }
                }
            ]
        });
    }

    async function cancel(id) {
        if (!isNative) return;

        await LocalNotifications.cancel({
            notifications: [{ id }]
        });
    }

    async function getPending() {
        if (!isNative) {
            return [];
        }

        const result = await LocalNotifications.getPending();

        return result.notifications || [];
    }

    async function scheduleTest() {
        await cancel(TEST_ID);

        const result = await schedule({
            id: TEST_ID,
            title: "ORBIA está funcionando! 🔔",
            body: "Sua central de notificações está pronta para os testes.",
            at: new Date(Date.now() + 15000),
            category: "system"
        });

        return result;
    }

    window.OrbiaNotifications = {
        isAvailable: isNative,
        checkPermissions,
        requestPermission,
        schedule,
        cancel,
        getPending,
        scheduleTest
    };

    function showStatus(message, error = false) {
        const status = document.getElementById(
            "orbia-notification-status"
        );

        if (!status) return;

        status.textContent = message;
        status.style.color = error ? "#D65B5B" : "#35B89A";
    }

    function mountInterface() {
        const settings = document.getElementById("settings-section");

        if (!settings || document.getElementById("orbia-notification-card")) {
            return;
        }

        const card = document.createElement("section");

        card.id = "orbia-notification-card";

        card.style.cssText = `
            margin: 18px 0;
            padding: 18px;
            border-radius: 16px;
            background: var(--card-bg, var(--surface, #fff));
            border: 1px solid var(--border-color, rgba(120,120,120,.15));
        `;

        card.innerHTML = `
            <h2 style="margin-top:0">🔔 Notificações ORBIA</h2>

            <p style="font-size:14px;opacity:.75;line-height:1.5">
                Ative as notificações para receber lembretes de
                hábitos, metas, agenda e sono.
            </p>

            <button
                id="orbia-enable-notifications"
                style="
                    width:100%;
                    padding:13px;
                    border:0;
                    border-radius:12px;
                    background:#263B63;
                    color:white;
                    font-weight:600;
                    margin-bottom:10px;
                "
            >
                Ativar notificações
            </button>

            <button
                id="orbia-test-notification"
                style="
                    width:100%;
                    padding:13px;
                    border:0;
                    border-radius:12px;
                    background:#35B89A;
                    color:white;
                    font-weight:600;
                "
            >
                Enviar notificação de teste
            </button>

            <p
                id="orbia-notification-status"
                style="font-size:13px;line-height:1.5;margin-bottom:0"
            >
                Verificando disponibilidade...
            </p>
        `;

        settings.appendChild(card);

        const enableButton = document.getElementById(
            "orbia-enable-notifications"
        );

        const testButton = document.getElementById(
            "orbia-test-notification"
        );

        if (!isNative) {
            showStatus(
                "As notificações precisam da versão Android instalada.",
                true
            );

            enableButton.disabled = true;
            testButton.disabled = true;
            return;
        }

        enableButton.addEventListener("click", async () => {
            enableButton.disabled = true;

            try {
                const permission = await requestPermission();

                if (permission.display === "granted") {
                    showStatus(
                        "Permissão concedida! Agora você pode testar."
                    );
                } else {
                    showStatus(
                        "Permissão não concedida. Verifique as configurações do Android.",
                        true
                    );
                }
            } catch (error) {
                showStatus(error.message, true);
            } finally {
                enableButton.disabled = false;
            }
        });

        testButton.addEventListener("click", async () => {
            testButton.disabled = true;

            try {
                showStatus("Agendando notificação de teste...");

                const result = await scheduleTest();

                if (result.warning) {
                    showStatus(
                        "Teste agendado, mas o Android não autorizou horário exato: " +
                        result.warning.message,
                        true
                    );
                } else {
                    showStatus(
                        "Teste agendado! Aguarde aproximadamente 15 segundos."
                    );
                }
            } catch (error) {
                showStatus(error.message, true);
            } finally {
                testButton.disabled = false;
            }
        });

        checkPermissions()
            .then(permission => {
                if (permission.display === "granted") {
                    showStatus("Notificações autorizadas neste aparelho.");
                } else {
                    showStatus("As notificações ainda precisam ser autorizadas.");
                }
            })
            .catch(() => {
                showStatus("Não foi possível verificar as permissões.", true);
            });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", mountInterface);
    } else {
        mountInterface();
    }
})();
