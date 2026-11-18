# Assinatura fixa dos APKs Android do ORBIA

O ORBIA usa o identificador de aplicativo `com.orbia.app`. Para o Android aceitar uma atualização por cima da instalação existente, cada APK precisa manter esse identificador e ser assinado com o mesmo certificado.

O workflow do GitHub Actions usa a mesma chave de depuração em todas as compilações. A chave privada fica somente em um segredo do GitHub; ela não deve ser enviada ao repositório.

## Configuração necessária (uma única vez)

Faça esta configuração em um computador confiável com o Java JDK instalado.

1. Gere uma chave dedicada ao ORBIA. Guarde o arquivo `orbia-debug.keystore` em local seguro e mantenha uma cópia de segurança. Não o envie ao GitHub como arquivo do repositório.

```bash
keytool -genkeypair -v \
  -keystore orbia-debug.keystore \
  -storepass android \
  -alias androiddebugkey \
  -keypass android \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=ORBIA, OU=Mobile, O=ORBIA, L=Manaus, ST=AM, C=BR"
```

2. Converta o arquivo para Base64.

Linux:
```bash
base64 -w 0 orbia-debug.keystore
```

macOS:
```bash
base64 < orbia-debug.keystore | tr -d '\\n'
```

Windows PowerShell:
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("orbia-debug.keystore"))
```

3. No GitHub, abra **Settings → Secrets and variables → Actions → New repository secret**.
4. Crie o segredo com o nome exato `ORBIA_DEBUG_KEYSTORE_BASE64` e cole nele todo o texto Base64 gerado.
5. Salve. Não compartilhe o conteúdo desse segredo em mensagens, comentários ou arquivos do repositório.

O workflow valida a chave e falha com uma mensagem clara se o segredo ainda não estiver configurado. Depois de configurado, cada APK gerado pelo workflow usa a mesma chave.

## Importante sobre a primeira troca

Os APKs gerados anteriormente no GitHub Actions usavam a chave de depuração temporária do próprio executor. Como cada executor é descartado após a compilação, essa chave não era preservada e os APKs de compilações diferentes podiam ter assinaturas diferentes.

Por isso, o Android não consegue atualizar por cima um APK antigo assinado com aquela chave temporária usando a nova chave fixa. **Na primeira instalação desta versão com assinatura persistente, pode ser necessário desinstalar a versão antiga uma última vez.** Isso apaga os dados privados do aplicativo; exporte um backup do ORBIA antes, se ainda houver dados importantes no aparelho.

Depois dessa troca inicial, mantenha o segredo e o arquivo original da chave guardados. Não gere outra chave nem substitua o segredo: os APKs futuros poderão ser instalados por cima, desde que o identificador do pacote continue sendo `com.orbia.app`.

## Segurança

Esta chave dedicada é para distribuir os APKs de teste/debug deste projeto. O arquivo da chave privada não deve ser commitado no repositório público. Quem perder a chave não conseguirá assinar atualizações compatíveis com as instalações feitas usando o certificado anterior.
