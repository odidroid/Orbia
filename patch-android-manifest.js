
const fs = require("node:fs");

const manifestPath =
    "android/app/src/main/AndroidManifest.xml";

const permission =
    '    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />';

if (!fs.existsSync(manifestPath)) {
    throw new Error("AndroidManifest.xml não encontrado.");
}

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

console.log("Permissão de alarmes exatos configurada.");
