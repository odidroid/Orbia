
const fs = require("node:fs");
const path = require("node:path");

const androidRoot = path.join(__dirname, "android");

const manifestPath = path.join(
    androidRoot,
    "app/src/main/AndroidManifest.xml"
);

if (!fs.existsSync(manifestPath)) {
    throw new Error("AndroidManifest.xml não encontrado.");
}

// =====================================
// PERMISSÃO DE NOTIFICAÇÕES
// =====================================

const permission =
    '    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />';

let manifest = fs.readFileSync(manifestPath, "utf8");

if (!manifest.includes("android.permission.SCHEDULE_EXACT_ALARM")) {
    if (!manifest.includes("<application")) {
        throw new Error("Tag application não encontrada no manifesto.");
    }

    manifest = manifest.replace(
        /<application/,
        permission + "\n    <application"
    );

    fs.writeFileSync(manifestPath, manifest);
}

// =====================================
// LOCALIZAR MAINACTIVITY
// =====================================

function findFile(directory, fileName) {
    const entries = fs.readdirSync(directory, {
        withFileTypes: true
    });

    for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            const found = findFile(fullPath, fileName);

            if (found) {
                return found;
            }
        } else if (entry.name === fileName) {
            return fullPath;
        }
    }

    return null;
}

const javaRoot = path.join(
    androidRoot,
    "app/src/main/java"
);

const mainActivityPath = findFile(
    javaRoot,
    "MainActivity.java"
);

if (!mainActivityPath) {
    throw new Error("MainActivity.java não encontrada.");
}

let mainActivity = fs.readFileSync(
    mainActivityPath,
    "utf8"
);

const packageMatch = mainActivity.match(
    /^\s*package\s+([a-zA-Z0-9_.]+)\s*;/m
);

if (!packageMatch) {
    throw new Error("Não foi possível identificar o pacote Java.");
}

const packageName = packageMatch[1];

const pluginPath = path.join(
    path.dirname(mainActivityPath),
    "BackupExporterPlugin.java"
);

// =====================================
// CRIAR PLUGIN NATIVO DE EXPORTAÇÃO
// =====================================

const pluginCode = `package ${packageName};

import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.JSObject;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "BackupExporter")
public class BackupExporterPlugin extends Plugin {

    @PluginMethod
    public void save(PluginCall call) {
        String fileName = call.getString("fileName");
        String content = call.getString("content");

        if (fileName == null || content == null) {
            call.reject("Nome ou conteúdo do backup não informado.");
            return;
        }

        fileName = fileName.replaceAll("[^a-zA-Z0-9._-]", "_");

        if (!fileName.toLowerCase().endsWith(".json")) {
            fileName += ".json";
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            call.reject(
                "A exportação direta para Downloads requer Android 10 ou superior."
            );
            return;
        }

        ContentResolver resolver =
            getContext().getContentResolver();

        Uri fileUri = null;

        try {
            ContentValues values = new ContentValues();

            values.put(
                MediaStore.MediaColumns.DISPLAY_NAME,
                fileName
            );

            values.put(
                MediaStore.MediaColumns.MIME_TYPE,
                "application/json"
            );

            values.put(
                MediaStore.MediaColumns.RELATIVE_PATH,
                Environment.DIRECTORY_DOWNLOADS + "/ORBIA"
            );

            values.put(
                MediaStore.MediaColumns.IS_PENDING,
                1
            );

            fileUri = resolver.insert(
                MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                values
            );

            if (fileUri == null) {
                throw new Exception(
                    "O Android não conseguiu criar o arquivo."
                );
            }

            try (OutputStream output =
                    resolver.openOutputStream(fileUri)) {

                if (output == null) {
                    throw new Exception(
                        "Não foi possível abrir o arquivo para gravação."
                    );
                }

                output.write(
                    content.getBytes(StandardCharsets.UTF_8)
                );

                output.flush();
            }

            ContentValues completed = new ContentValues();

            completed.put(
                MediaStore.MediaColumns.IS_PENDING,
                0
            );

            resolver.update(
                fileUri,
                completed,
                null,
                null
            );

            JSObject result = new JSObject();

            result.put("success", true);
            result.put("fileName", fileName);
            result.put("location", "Downloads/ORBIA");
            result.put("uri", fileUri.toString());

            call.resolve(result);

        } catch (Exception error) {

            if (fileUri != null) {
                try {
                    resolver.delete(
                        fileUri,
                        null,
                        null
                    );
                } catch (Exception ignored) {
                }
            }

            call.reject(
                "Falha ao salvar backup: " + error.getMessage(),
                error
            );
        }
    }
}
`;

fs.writeFileSync(pluginPath, pluginCode);

// =====================================
// REGISTRAR PLUGIN NA MAINACTIVITY
// =====================================

if (!mainActivity.includes("BackupExporterPlugin.class")) {

    const importLine =
        `import ${packageName}.BackupExporterPlugin;`;

    if (!mainActivity.includes(importLine)) {
        const packageLine = new RegExp(
            `(package\\s+${packageName.replace(/\./g, "\\.")}\\s*;)`
        );

        mainActivity = mainActivity.replace(
            packageLine,
            `$1\n\n${importLine}`
        );
    }

    const emptyActivity =
        /public\s+class\s+MainActivity\s+extends\s+BridgeActivity\s*\{\s*\}/;

    if (emptyActivity.test(mainActivity)) {

        mainActivity = mainActivity.replace(
            emptyActivity,
            `public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(BackupExporterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}`
        );

    } else if (
        /public\s+void\s+onCreate\s*\(/.test(mainActivity)
    ) {

        mainActivity = mainActivity.replace(
            /(public\s+void\s+onCreate\s*\([^)]*\)\s*\{)/,
            "$1\n        registerPlugin(BackupExporterPlugin.class);"
        );

    } else {
        throw new Error(
            "Não foi possível registrar o plugin na MainActivity."
        );
    }

    fs.writeFileSync(
        mainActivityPath,
        mainActivity
    );
}

console.log("Permissão de alarmes exatos configurada.");
console.log("Plugin nativo de backup criado e registrado.");
