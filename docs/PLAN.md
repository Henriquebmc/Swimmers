## Espelhar Download do Currículo ABMN no App

### Resumo
Implementar um fluxo novo de importação “Buscar da ABMN” dentro do modal atual de upload, mantendo o parser existente de PDF. O app vai espelhar o formulário da ABMN de forma assistida: matrícula salva por atleta, captcha resolvido manualmente no app, sessão do ABMN mantida no servidor e download do PDF feito sob demanda. Não incluir automação de captcha nem importação em lote.

### Mudanças de Implementação
- Adicionar um campo persistido no perfil do atleta para `abmnRegistrationNumber` (string curta, nullable), usado para preencher a matrícula automaticamente.
- Estender o fluxo do modal de upload para ter duas origens:
  - `Arquivo PDF` mantendo o comportamento atual.
  - `Buscar da ABMN` com:
    - matrícula pré-preenchida do perfil, editável;
    - botão para carregar captcha;
    - imagem do captcha exibida no app;
    - campo para resposta do captcha;
    - ação para baixar o currículo e seguir direto para a etapa de revisão já existente.
- Criar um fluxo server-side dedicado para ABMN:
  - `GET /api/abmn/curriculo/session`: requisita `https://www.abmn.org.br/curriculo/`, extrai `token`, `codigocaptcha`, URL da imagem e cookie `PHPSESSID`, persiste isso em uma sessão temporária no banco com expiração curta e retorna `sessionId` + imagem do captcha proxied pelo app.
  - `POST /api/abmn/curriculo/fetch`: recebe `sessionId`, `matricula`, `captchaAnswer` e opcionalmente `saveRegistrationNumber`; reenvia o `POST /curriculo/` com os campos exigidos e a mesma sessão/cookies.
  - O fetch deve tratar dois formatos de sucesso:
    - resposta PDF direta;
    - resposta HTML intermediária contendo link/redirect para o PDF.
  - Em caso de erro de captcha, matrícula inválida ou mudança de markup, retornar erro amigável e já invalidar/renovar a sessão do captcha.
- Reaproveitar o mesmo pipeline do upload atual:
  - o PDF baixado da ABMN deve cair no mesmo extrator usado hoje em `results/upload`;
  - a resposta para o frontend deve manter o mesmo shape da revisão para não duplicar UI nem regras de salvamento.
- Guardar estado temporário da sessão ABMN no banco, não em memória:
  - tabela curta com `userId`, `source`, `phpSessionId`, `token`, `captchaCode`, `expiresAt`;
  - TTL curto, limpeza por expiração no uso;
  - nunca persistir resposta do captcha nem PDF bruto após processamento.
- Manter fallback explícito para upload manual:
  - se o fluxo ABMN falhar, o usuário continua podendo subir o PDF localmente sem bloqueio.

### Interfaces e Contratos
- Novo campo em perfil do atleta:
  - `abmnRegistrationNumber?: string | null`
- Novos endpoints:
  - `GET /api/abmn/curriculo/session`
    - resposta: `sessionId`, `captchaImageUrl` ou imagem proxied, `registrationNumber`
  - `POST /api/abmn/curriculo/fetch`
    - entrada: `sessionId`, `matricula`, `captchaAnswer`, `saveRegistrationNumber?`
    - saída de sucesso: mesmo payload de revisão já usado pelo upload de PDF
    - saída de erro: `{ error, code, refreshCaptcha?: true }`
- Novo estado de UI no modal:
  - `source = local | abmn`
  - `abmnSessionId`, `captchaStatus`, `registrationNumber`

### Testes e Cenários
- Carregar captcha da ABMN cria sessão temporária e exibe imagem válida no app.
- Matrícula salva no perfil aparece pré-preenchida no próximo uso.
- Captcha incorreto retorna erro amigável e exige novo captcha.
- Matrícula inválida retorna erro específico sem quebrar o modal.
- Sucesso com PDF ABMN entra na mesma etapa de revisão do upload manual.
- Fluxo continua funcionando se a ABMN responder com redirect/HTML antes do PDF.
- Upload manual continua igual ao comportamento atual.
- Sessão temporária expira e não pode ser reutilizada após sucesso ou timeout.
- Testes de integração devem mockar a ABMN; não depender do site real no CI.

### Assumptions e Defaults
- O caminho aprovado é `resolver captcha no app` e `salvar matrícula por atleta`.
- Não automatizar OCR/captcha.
- Não implementar busca de currículo de terceiros nem importação em lote nesta versão.
- O uso pressupõe acesso iniciado pelo próprio atleta e compatível com as regras da ABMN.
- Se a estrutura HTML da ABMN mudar, o app deve falhar com mensagem clara e orientar o upload manual como fallback.
