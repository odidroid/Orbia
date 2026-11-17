
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
// PERMISSÃO DE ALARMES EXATOS
// =====================================

let manifest = fs.readFileSync(manifestPath, "utf8");

const permission =
    '    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />';

if (!manifest.includes("android.permission.SCHEDULE_EXACT_ALARM")) {
    manifest = manifest.replace(
        /<application/,
        permission + "\n    <application"
    );
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

            if (found) return found;
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
// PLUGIN NATIVO DE EXPORTAÇÃO DE BACKUP
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
                    resolver.delete(fileUri, null, null);
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

    } else if (/public\s+void\s+onCreate\s*\(/.test(mainActivity)) {

        mainActivity = mainActivity.replace(
            /(public\s+void\s+onCreate\s*\([^)]*\)\s*\{)/,
            "$1\n        registerPlugin(BackupExporterPlugin.class);"
        );

    } else {
        throw new Error(
            "Não foi possível registrar o plugin na MainActivity."
        );
    }

    fs.writeFileSync(mainActivityPath, mainActivity);
}

// =====================================
// PASTAS DE RECURSOS ANDROID
// =====================================

const resRoot = path.join(
    androidRoot,
    "app/src/main/res"
);

const mipmapRoot = path.join(resRoot, "mipmap");
const adaptiveRoot = path.join(resRoot, "mipmap-anydpi-v26");
const drawableRoot = path.join(resRoot, "drawable");
const valuesRoot = path.join(resRoot, "values");
const rawRoot = path.join(resRoot, "raw");

for (const directory of [
    mipmapRoot,
    adaptiveRoot,
    drawableRoot,
    valuesRoot,
    rawRoot
]) {
    fs.mkdirSync(directory, { recursive: true });
}


// =====================================
// SOM DE NOTIFICAÇÃO "ÓRBITA"
// =====================================
// Gera um WAV curto e original durante o build para o canal Android.
function createOrbitaNotificationSound() {
    const sampleRate = 22050;
    const duration = 1.05;
    const totalSamples = Math.floor(sampleRate * duration);
    const dataSize = totalSamples * 2;
    const wav = Buffer.alloc(44 + dataSize);
    wav.write("RIFF", 0);
    wav.writeUInt32LE(36 + dataSize, 4);
    wav.write("WAVE", 8);
    wav.write("fmt ", 12);
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(sampleRate, 24);
    wav.writeUInt32LE(sampleRate * 2, 28);
    wav.writeUInt16LE(2, 32);
    wav.writeUInt16LE(16, 34);
    wav.write("data", 36);
    wav.writeUInt32LE(dataSize, 40);

    const notes = [
        { start: 0.02, duration: 0.30, frequency: 659.25, volume: 0.48 },
        { start: 0.19, duration: 0.38, frequency: 880.00, volume: 0.42 },
        { start: 0.43, duration: 0.52, frequency: 1108.73, volume: 0.34 }
    ];

    for (let i = 0; i < totalSamples; i++) {
        const time = i / sampleRate;
        let sample = 0;
        for (const note of notes) {
            const elapsed = time - note.start;
            if (elapsed < 0 || elapsed > note.duration) continue;
            const attack = Math.min(1, elapsed / 0.025);
            const release = Math.min(1, (note.duration - elapsed) / 0.16);
            const envelope = Math.max(0, Math.min(attack, release));
            const fundamental = Math.sin(2 * Math.PI * note.frequency * elapsed);
            const harmonic = 0.18 * Math.sin(2 * Math.PI * note.frequency * 2 * elapsed);
            sample += note.volume * envelope * (fundamental + harmonic);
        }
        const softLimit = Math.tanh(sample * 0.8);
        wav.writeInt16LE(Math.max(-1, Math.min(1, softLimit)) * 26000, 44 + i * 2);
    }

    fs.writeFileSync(path.join(rawRoot, "orbia_orbita.wav"), wav);
}
createOrbitaNotificationSound();

// Ícone monocromático para a barra de status Android.
const notificationIcon = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path android:fillColor="#FFFFFFFF" android:pathData="M12,3 A9,9 0,1 0 12,21 A9,9 0,1 0 12,3 Z" />
    <path android:fillColor="#FF000000" android:pathData="M12,6 A6,6 0,1 1 12,18 A6,6 0,1 1 12,6 Z" />
    <path android:fillColor="#FFFFFFFF" android:pathData="M4,17 C8,9 15,5 21,7 L20,9 C15,8 9,12 6,18 Z" />
    <path android:fillColor="#FFFFFFFF" android:pathData="M17,4 A1.7,1.7 0,1 0 17,7.4 A1.7,1.7 0,1 0 17,4 Z" />
</vector>`;
fs.writeFileSync(path.join(drawableRoot, "ic_stat_orbia.xml"), notificationIcon);

// =====================================
// COR DE FUNDO
// =====================================

const colorsPath = path.join(valuesRoot, "colors.xml");

let colorsXml = fs.existsSync(colorsPath)
    ? fs.readFileSync(colorsPath, "utf8")
    : `<?xml version="1.0" encoding="utf-8"?>
<resources>
</resources>`;

if (!colorsXml.includes('name="orbia_icon_background"')) {
    colorsXml = colorsXml.replace(
        "</resources>",
        '    <color name="orbia_icon_background">#263B63</color>\n</resources>'
    );
}

fs.writeFileSync(colorsPath, colorsXml);

// =====================================
// SILHUETA LATERAL MINIMALISTA
// =====================================

const orbit = `
    <path
        android:fillColor="#00000000"
        android:strokeColor="#8EAFFF"
        android:strokeWidth="5"
        android:strokeLineCap="round"
        android:pathData="M54,19 C76,19 91,34 91,54 C91,74 76,89 54,89 C32,89 17,74 17,54 C17,34 32,19 54,19 Z" />
    <path
        android:fillColor="#00000000"
        android:strokeColor="#45D6B1"
        android:strokeWidth="4.5"
        android:strokeLineCap="round"
        android:pathData="M25,78 C35,55 61,31 84,30" />
    <path
        android:fillColor="#45D6B1"
        android:pathData="M80,24 A6,6 0,1 0 80,36 A6,6 0,1 0 80,24 Z" />
    <path
        android:fillColor="#DDFBF4"
        android:pathData="M54,39 A15,15 0,1 0 54,69 A15,15 0,1 0 54,39 Z" />
    <path
        android:fillColor="#45D6B1"
        android:pathData="M54,45 A9,9 0,1 0 54,63 A9,9 0,1 0 54,45 Z" />
`;

const dot = `
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M54,49 A5,5 0,1 0 54,59 A5,5 0,1 0 54,49 Z" />
`;

// =====================================
// ÍCONE VETORIAL LEGADO
// =====================================

const legacyIcon = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">

    <path
        android:fillColor="#263B63"
        android:pathData="M0,0 H108 V108 H0 Z" />

    ${orbit}
    ${dot}

</vector>`;

fs.writeFileSync(
    path.join(mipmapRoot, "ic_launcher.xml"),
    legacyIcon
);

fs.writeFileSync(
    path.join(mipmapRoot, "ic_launcher_round.xml"),
    legacyIcon
);

// =====================================
// ÍCONE ADAPTÁVEL
// =====================================

const foregroundIcon = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">

    ${orbit}
    ${dot}

</vector>`;

fs.writeFileSync(
    path.join(drawableRoot, "orbia_icon_foreground.xml"),
    foregroundIcon
);

const adaptiveIcon = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/orbia_icon_background" />
    <foreground android:drawable="@drawable/orbia_icon_foreground" />
</adaptive-icon>`;

fs.writeFileSync(
    path.join(adaptiveRoot, "ic_launcher.xml"),
    adaptiveIcon
);

fs.writeFileSync(
    path.join(adaptiveRoot, "ic_launcher_round.xml"),
    adaptiveIcon
);

// =====================================
// CONFIGURAR ÍCONE NO MANIFESTO
// =====================================

manifest = manifest.replace(
    /<application\b([^>]*)>/,
    (match, attributes) => {
        const updated = attributes
            .replace(/\s+android:icon="[^"]*"/g, "")
            .replace(/\s+android:roundIcon="[^"]*"/g, "");

        return `<application${updated}
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round">`;
    }
);

fs.writeFileSync(manifestPath, manifest);

console.log("Permissão de alarmes exatos configurada.");
console.log("Plugin nativo de backup criado e registrado.");
console.log("Ícones ORBIA atualizados com identidade orbital.");
