
const fs = require("node:fs");
const path = require("node:path");
const esbuild = require("esbuild");

async function build() {
    const source = __dirname;
    const output = path.join(source, "www");

    const files = [
        "index.html",
        "style.css",
        "script.js",
        "settings.js",
        "goals.js",
        "sleep.js",
        "finance.js",
        "splash.css",
        "splash.js",
        "sounds.js"
    ];

    fs.mkdirSync(output, { recursive: true });

    for (const file of files) {
        const original = path.join(source, file);

        if (!fs.existsSync(original)) {
            throw new Error(
                `Arquivo obrigatório não encontrado: ${file}`
            );
        }

        fs.copyFileSync(
            original,
            path.join(output, file)
        );
    }

    const indexPath = path.join(output, "index.html");

    let html = fs.readFileSync(indexPath, "utf8");

    // =====================================
    // ATIVAR BLOQUEIO ANTES DA INTERFACE
    // =====================================

    const startupScript =
        '<script>document.documentElement.classList.add("orbia-loading");</script>';

    if (!html.includes('classList.add("orbia-loading")')) {
        if (!html.match(/<\/head>/i)) {
            throw new Error(
                "Não foi encontrada a tag de fechamento head."
            );
        }

        html = html.replace(
            /<\/head>/i,
            `    ${startupScript}\n</head>`
        );
    }

    // =====================================
    // ADICIONAR CSS DA INICIALIZAÇÃO
    // =====================================

    if (!html.includes('href="splash.css"')) {
        html = html.replace(
            /<\/head>/i,
            '    <link rel="stylesheet" href="splash.css">\n</head>'
        );
    }

    // =====================================
    // ADICIONAR SCRIPTS
    // =====================================

    const scripts = [
        "notifications.js",
        "backup-exporter.js",
        "splash.js",
        "sounds.js"
    ];

    for (const script of scripts) {
        if (!html.includes(`src="${script}"`)) {
            if (!html.match(/<\/body>/i)) {
                throw new Error(
                    "Não foi encontrada a tag de fechamento body."
                );
            }

            html = html.replace(
                /<\/body>/i,
                `    <script src="${script}"></script>\n</body>`
            );
        }
    }

    fs.writeFileSync(indexPath, html);

    // =====================================
    // COMPILAR NOTIFICAÇÕES
    // =====================================

    await esbuild.build({
        entryPoints: [
            path.join(source, "notifications.js")
        ],
        bundle: true,
        platform: "browser",
        format: "iife",
        target: ["es2022"],
        outfile: path.join(output, "notifications.js")
    });

    // =====================================
    // COMPILAR EXPORTADOR DE BACKUP
    // =====================================

    await esbuild.build({
        entryPoints: [
            path.join(source, "backup-exporter.js")
        ],
        bundle: true,
        platform: "browser",
        format: "iife",
        target: ["es2022"],
        outfile: path.join(output, "backup-exporter.js")
    });

    console.log(
        "ORBIA preparado com inicialização prioritária!"
    );
}

build().catch(error => {
    console.error(
        "Erro na preparação do ORBIA:",
        error
    );

    process.exit(1);
});
