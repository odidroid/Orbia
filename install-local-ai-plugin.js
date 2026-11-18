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
if (!fs.existsSync(templatePath)) throw new Error("Template do plugin ORBIA IA não encontrado.");

const pluginSource = fs.readFileSync(templatePath, "utf8")
    .replace("__PACKAGE__", packageName);
fs.writeFileSync(pluginPath, pluginSource);

const importLine = `import ${packageName}.OrbiaLocalAIPlugin;`;
if (!mainActivity.includes("OrbiaLocalAIPlugin.class")) {
    if (!mainActivity.includes(importLine)) {
        mainActivity = mainActivity.replace(
            packageMatch[0],
            packageMatch[0] + "\\n\\n" + importLine
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
