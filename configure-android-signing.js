const fs = require("node:fs");
const path = require("node:path");

const gradlePath = path.join(__dirname, "android", "app", "build.gradle");
const keystorePath = path.join(
    process.env.HOME || "",
    ".android",
    "debug.keystore"
);

if (!fs.existsSync(gradlePath)) {
    throw new Error("android/app/build.gradle não encontrado.");
}

if (!fs.existsSync(keystorePath)) {
    throw new Error("A chave fixa do ORBIA não foi encontrada em ~/.android/debug.keystore.");
}

let gradle = fs.readFileSync(gradlePath, "utf8");
const marker = "// ORBIA_FIXED_DEBUG_SIGNING";

if (!gradle.includes(marker)) {
    gradle += `

${marker}
android {
    signingConfigs {
        orbiaFixed {
            storeFile file(System.getenv("HOME") + "/.android/debug.keystore")
            storePassword "android"
            keyAlias "androiddebugkey"
            keyPassword "android"
        }
    }

    buildTypes {
        debug {
            signingConfig signingConfigs.orbiaFixed
        }
    }
}
`;
    fs.writeFileSync(gradlePath, gradle);
}

console.log("Gradle configurado explicitamente para assinar o APK com a chave fixa do ORBIA.");
