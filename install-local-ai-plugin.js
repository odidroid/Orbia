const fs = require("node:fs");
const path = require("node:path");

const androidRoot = path.join(__dirname, "android");
const javaRoot = path.join(androidRoot, "app/src/main/java");

function findFile(directory, fileName) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            const found = findFile(fullPath, fileName);
            if (found) return found;
        } else if (entry.name === fileName) return fullPath;
    }
    return null;
}

const mainActivityPath = findFile(javaRoot, "MainActivity.java");
if (!mainActivityPath) throw new Error("MainActivity.java não encontrada.");

let mainActivity = fs.readFileSync(mainActivityPath, "utf8");
const packageMatch = mainActivity.match(/^\s*package\s+([a-zA-Z0-9_.]+)\s*;/m);
if (!packageMatch) throw new Error("Pacote Java não identificado.");

const packageName = packageMatch[1];
const pluginPath = path.join(path.dirname(mainActivityPath), "OrbiaLocalAIPlugin.java");
const templatePath = path.join(__dirname, "native", "OrbiaLocalAIPlugin.java.template");
const cmakeTemplatePath = path.join(__dirname, "native", "CMakeLists.txt");
const cppTemplatePath = path.join(__dirname, "native", "orbia_llama.cpp.template");
if (![templatePath, cmakeTemplatePath, cppTemplatePath].every(fs.existsSync)) {
    throw new Error("Templates do plugin ou do runtime llama.cpp não encontrados.");
}

const pluginSource = fs.readFileSync(templatePath, "utf8")
    .replace("__PACKAGE__", packageName);
fs.writeFileSync(pluginPath, pluginSource);

const packageJni = packageName.split(".").map(part => part.replace(/_/g, "_1")).join("_");
const cppDirectory = path.join(androidRoot, "app/src/main/cpp");
fs.mkdirSync(cppDirectory, { recursive: true });
fs.copyFileSync(cmakeTemplatePath, path.join(cppDirectory, "CMakeLists.txt"));
const cppSource = fs.readFileSync(cppTemplatePath, "utf8")
    .replaceAll("__PACKAGE_UNDERSCORES__", packageJni);
fs.writeFileSync(path.join(cppDirectory, "orbia_llama.cpp"), cppSource);

const appGradlePath = path.join(androidRoot, "app/build.gradle");
if (!fs.existsSync(appGradlePath)) throw new Error("android/app/build.gradle não encontrado.");
let appGradle = fs.readFileSync(appGradlePath, "utf8");
if (!appGradle.includes("src/main/cpp/CMakeLists.txt")) {
    appGradle += `

// ORBIA IA local: compila llama.cpp para a arquitetura ARM64 do aparelho.
android {
    defaultConfig {
        ndk {
            abiFilters 'arm64-v8a'
        }
    }
    externalNativeBuild {
        cmake {
            path file('src/main/cpp/CMakeLists.txt')
            version '3.22.1'
        }
    }
}
`;
    fs.writeFileSync(appGradlePath, appGradle);
}

const importLine = `import ${packageName}.OrbiaLocalAIPlugin;`;
if (!mainActivity.includes("OrbiaLocalAIPlugin.class")) {
    if (!mainActivity.includes(importLine)) {
        mainActivity = mainActivity.replace(
            packageMatch[0],
            packageMatch[0] + "\n\n" + importLine
        );
    }

    if (/public\s+void\s+onCreate\s*\(/.test(mainActivity)) {
        mainActivity = mainActivity.replace(
            /(public\s+void\s+onCreate\s*\([^)]*\)\s*\{)/,
            "$1\n        registerPlugin(OrbiaLocalAIPlugin.class);"
        );
    } else {
        const emptyActivity = /public\s+class\s+MainActivity\s+extends\s+BridgeActivity\s*\{\s*\}/;
        if (!emptyActivity.test(mainActivity)) {
            throw new Error("Não foi possível registrar o plugin na MainActivity.");
        }
        mainActivity = mainActivity.replace(
            emptyActivity,
            `public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(OrbiaLocalAIPlugin.class);
        super.onCreate(savedInstanceState);
    }
}`
        );
    }
    fs.writeFileSync(mainActivityPath, mainActivity);
}
console.log("Plugin nativo ORBIA IA instalado (download local; inferência ainda pendente).");
