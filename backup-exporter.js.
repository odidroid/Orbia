
import { Capacitor, registerPlugin } from "@capacitor/core";

const BackupExporter = registerPlugin("BackupExporter");

window.OrbiaBackupExporter = {
    isAvailable: Capacitor.isNativePlatform(),

    async save(fileName, content) {
        if (!Capacitor.isNativePlatform()) {
            throw new Error(
                "A exportação nativa está disponível somente no aplicativo Android."
            );
        }

        if (!fileName || !content) {
            throw new Error("Nome ou conteúdo do backup inválido.");
        }

        return await BackupExporter.save({
            fileName,
            content
        });
    }
};
