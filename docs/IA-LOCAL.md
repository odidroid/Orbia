# ORBIA IA local — documentação histórica

> **Arquivo arquivado (19/11/2026):** a IA foi temporariamente retirada do aplicativo. A interface e a integração nativa Android não fazem mais parte da versão atual. Este documento e `orbia-ai.js` foram mantidos apenas como referência para uma possível retomada futura. As instruções abaixo descrevem a implementação anterior e não representam funcionalidades disponíveis na versão atual.

## Objetivo

Executar a conversa no próprio Android, sem API de inferência remota e sem enviar mensagens do usuário para servidores.

## Dispositivo de referência

Redmi 14C, 4 GB de RAM, MediaTek Helio G81-Ultra. O aparelho tem memória limitada; a disponibilidade real para o modelo depende do Android, dos aplicativos em segundo plano e da variante do aparelho.

## Modelo inicial para validação

- Família: Qwen2.5-0.5B-Instruct
- Formato: GGUF
- Quantização candidata: Q4_0
- Tamanho publicado pelo repositório oficial: aproximadamente 429 MB
- Repositório: https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF
- Arquivo: qwen2.5-0.5b-instruct-q4_0.gguf

O tamanho do arquivo não representa o pico de RAM. O runtime, o contexto KV, buffers e o próprio Android também consomem memória. A configuração inicial deve usar contexto curto (1.024–2.048 tokens), geração limitada e CPU, medindo estabilidade antes de aumentar limites. Se houver encerramentos por falta de memória, testar uma quantização menor.

## Runtime

Usar llama.cpp via integração Android nativa (JNI/NDK), expondo uma API Capacitor para a camada JavaScript. Não executar o GGUF dentro do WebView e não usar serviço remoto como fallback silencioso.

A integração deve oferecer, no mínimo:
- verificar suporte e estado do runtime;
- consultar modelo instalado;
- baixar para diretório privado do aplicativo com progresso e validação;
- cancelar, retomar quando possível e remover o modelo;
- carregar/descarregar modelo;
- gerar resposta incremental (stream de tokens);
- interromper geração e liberar recursos.

## Privacidade e segurança

- Download do modelo é a única operação que exige internet.
- Conversas e memória permanecem no armazenamento local do app.
- Não registrar prompts ou respostas em logs.
- Mostrar claramente quando o modelo não está instalado ou quando o aparelho não tem memória suficiente.
- Não iniciar downloads sem consentimento; preferir Wi-Fi e informar tamanho aproximado.
- Validar tamanho e checksum quando houver hash oficial confiável.

## Estado histórico da implementação

- Plugin Capacitor Android `OrbiaLocalAI` registrado automaticamente no projeto gerado pelo workflow.
- Download privado com pausa, retomada HTTP Range, progresso e verificação SHA-256.
- Build nativo ARM64 via Android NDK/CMake, usando `llama.cpp` fixado no commit `2cbfc3cf34f94c8ada67eb8766efe7374a3d2db6`.
- Ponte JNI para carregar o GGUF, preparar prompt com o chat template do modelo e gerar tokens localmente.
- Contexto inicial limitado a 1.024 tokens, máximo configurável de 2.048, lote 128 e CPU; limite de 192 tokens por resposta na interface.
- Eventos de tokens para exibição incremental no WebView e ação para interromper a geração.
- Controles para carregar/descarregar o modelo e conversa local sem enviar prompts para serviços remotos.
- O instalador configura `externalNativeBuild` no Gradle e restringe o APK a `arm64-v8a`, arquitetura esperada no Redmi 14C.

## Situação atual

A implementação descrita acima foi desativada e removida do aplicativo em novembro de 2026. O arquivo JavaScript da IA (`orbia-ai.js`) e esta documentação permanecem no repositório como histórico. Eles não são carregados pelo `index.html` nem copiados pelo `build.js`. O plugin Android, a ponte JNI e os arquivos de compilação nativa foram removidos. Nenhuma inferência de IA está disponível na versão atual do ORBIA.

Para retomar esse trabalho no futuro, será necessário revisar a arquitetura e compatibilidade com a versão vigente do aplicativo; este documento é uma referência histórica, não um guia de instalação pronto para uso.
