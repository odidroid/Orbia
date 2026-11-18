# ORBIA IA local — arquitetura inicial

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

## Estado da implementação

- Plugin Capacitor Android `OrbiaLocalAI` registrado no projeto gerado pelo workflow.
- Download para `files/orbia-models`, dentro do armazenamento privado do aplicativo.
- Progresso por eventos, pausa, retomada por HTTP Range e remoção do arquivo.
- Validação do cabeçalho GGUF e SHA-256 antes de finalizar a instalação.
- Modelo fixado na revisão `12145bd1d629190a4d44254073650877954d02c9` do repositório oficial.
- Interface de instalação com confirmação explícita, indicação de tamanho e progresso.

## Próximas etapas

1. Integrar llama.cpp via JNI/NDK para carregar o arquivo instalado.
2. Implementar geração incremental, cancelamento e liberação de memória.
3. Adicionar memória local e integração consentida com agenda, hábitos, metas e finanças.
4. Validar compilação e desempenho/estabilidade no Redmi 14C real.

## Limitação atual

O download e a validação do arquivo estão implementados, mas o modelo ainda não é carregado e não gera respostas. `loadModel` e `generate` retornam uma mensagem explícita de runtime pendente. Não existe fallback para inferência remota.
