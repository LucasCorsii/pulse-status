# Diário de coordenação

## 2026-10-07 — Codex

- Criada a fundação local do monorepo, documentação de arquitetura, schema Prisma, configurações de raiz, Docker Compose e workflow de CI na branch `codex/phase-0`.
- Criado o repositório público `LucasCorsii/pulse-status`. A autenticação anterior falhou no sandbox, mas a criação remota funcionou quando executada com acesso de rede aprovado.
- Commit `7007912` publicado em `origin/codex/phase-0`.
- O clone OpenCode foi configurado com o mesmo GitHub em `origin`; o antigo `origin` local foi preservado como `codex-local`. O clone pode buscar a branch Codex por `git fetch origin codex/phase-0`.
- Prettier passa. Lint, testes e build falham porque os diretórios `apps/web` e `apps/api` ainda não possuem os fontes e configurações que pertencem à implementação OpenCode. Não foram adicionados arquivos de produto para contornar esse bloqueio.
- Seguido o protocolo compartilhado fornecido na conversa: branch Codex própria, tarefas delimitadas e coordenação registrada aqui.
- Para OpenCode: implemente as aplicações em `apps/web/**` e `apps/api/**`, incluindo configs necessárias para lint/build e testes próprios; consulte `PLAN.md`. Depois disso a Codex adicionará e rodará integração e testes de componentes.
- Decisões para as dúvidas registradas pela OpenCode: stack e entidades estão em `PLAN.md`; WebSocket no mesmo processo NestJS em `/events`; canais MVP e-mail, webhook e Slack; incidente após 2 falhas consecutivas e resolução na primeira checagem bem-sucedida.
- Próximo passo OpenCode: integrar `codex/phase-0` e continuar sua implementação numa branch `opencode/<assunto>` derivada dela, evitando publicar a branch antiga de histórico independente.

## 2026-10-07 — revisão do PR OpenCode #1

- A branch `opencode/api-web` foi enviada ao GitHub e o PR [#1](https://github.com/LucasCorsii/pulse-status/pull/1) foi aberto contra `codex/phase-0`. O `package-lock.json` foi atualizado pelo OpenCode como efeito das dependências; `:slug` usa o ID do monitor, sem coluna nova no Prisma.
- Verificações no clone OpenCode: `npm run format:check`, `npm run lint`, `npm test` (6 suítes / 10 testes) e `npm run build` passaram.
- Revisão encontrou cinco pontos para corrigir antes de merge: SSRF nos fetches de monitor/webhook; WebSocket sem autenticação e com broadcast global; segredo JWT fallback previsível; logout sem revogação de refresh token (e tokens no localStorage); canal EMAIL só registra log, sem entregar e-mail.
- O GitHub recusou review formal `REQUEST_CHANGES` porque a mesma conta é autora da PR; achados foram publicados como comentário de revisão no PR.
- Próximo passo Codex: aguardar correções e re-revisar; depois adicionar os testes de integração da API e testes dos componentes conforme a responsabilidade da Codex.

## 2026-10-19 — OpenCode (correções da revisão do PR #1)

Atualização da branch `opencode/api-web` (PR #1) endereçando os achados P1/P2 da revisão da Codex. Validação local: `format:check`, lint, **15 suítes / 48 testes** (47 na API + 1 no web) e build de `apps/api` e `apps/web` passam.

- **P1 bootstrap:** `ChecksModule` agora importa `EventsModule` e `AlertsModule` (fronteira correta do módulo). Adicionado `apps/api/src/app.module.spec.ts`, que inicializa o `AppModule` completo sem banco/Redis como regressão.
- **P1 SSRF:** `safeFetch` foi reescrito sobre `node:http`/`node:https` e **fixa o IP já validado na conexão** (via `lookup`), eliminando DNS rebinding; cada redirect é revalidado. `isBlockedIp` cobre toda a faixa IPv4-mapeada IPv6 (`::ffff:0:0/96`, inclusive notação hexadecimal como `::ffff:7f00:1`), NAT64, 6to4, Teredo, loopback/link-local/ULA/multicast/documentação. Testes ampliados.
- **P1 tokens no navegador:** login/register/refresh devolvem tokens no corpo **somente** para clientes de API que enviem o header `x-pulse-client: api`; navegadores recebem apenas cookies HttpOnly `ps_access`/`ps_refresh`. O web não usa mais `localStorage`, e o handshake do socket autentica pelo cookie (`withCredentials`).
- **P1 SameSite/deploy:** cookies configuráveis por `COOKIE_SAMESITE`/`COOKIE_DOMAIN`/`COOKIE_SECURE` (default `lax` em dev, `none`+`secure` em produção). Adicionado `CsrfOriginGuard` global (valida `Origin`/`Referer` contra `WEB_ORIGIN` em métodos mutáveis) e allowlist de origem no gateway WebSocket.
- **P2 revogação de refresh:** `RefreshStore` com camada em memória + camada Redis (`REDIS_URL`, TTL e chaves com hash SHA-256); degrada com segurança se o Redis cair.
- `.env.example`: documentados `COOKIE_*` e `SMTP_*` (revisar se a Codex preferir outro formato para esses arquivos de raiz).

**Rodada extra de auditoria (mesma data):**

- Revisão do PR: `origin/codex/phase-0` avançou com documentação; merge incorporado e conflito de `COORDINATION.md` resolvido, deixando o PR mesclável.
- **Endurecimento da entrega de tokens:** o opt-in `x-pulse-client: api` só vale para requisições **sem `Origin`** (navegadores nunca recebem tokens no corpo) e o refresh autenticado por cookie **nunca** devolve tokens — fecha a exfiltração via XSS mesmo forçando o header.
- **BullMQ:** troca de `queue.add({repeat})` por `upsertJobScheduler` com remoção de schedulers de monitores pausados/apagados; evita agendamentos duplicados ao mudar o intervalo e jobs órfãos. Validado no Redis local.
- **Web:** a página de detalhe do monitor usava `status="UP"` fixo; agora busca o monitor real e exibe nome/URL/status corretos.
- **API:** `UpdateMonitorDto` aceita `status` (permite pausar/retomar via `PATCH /monitors/:id`), e `main.ts` normaliza a lista de `WEB_ORIGIN`.

**Contrato para a Codex:** enviar `x-pulse-client: api` sem `Origin` em `POST /auth/register` e `POST /auth/login` para receber tokens no corpo. O refresh por cookie permanece somente em cookie. `Authorization: Bearer` continua aceito.

## 2026-10-19 — Codex, testes de integração e componentes

- Adicionados testes de integração de auth, autorização/isolamento por usuário, endpoint público de status e redação de segredos, além de testes de renderização para `StatusBadge` e `LatencyChart`. CI prepara um PostgreSQL efêmero e aplica migrações versionadas antes desses testes.
- O teste de integração envia `x-pulse-client: api` sem header `Origin` nas rotas de registro e login; os testes privados continuam usando `Authorization: Bearer`.
- O workflow de CI usa PostgreSQL efêmero e aplica as migrações versionadas com `prisma migrate deploy` antes de `npm run test:codex`.
- Criada a migração inicial `20261019000000_init`; Compose aplica migrações ao iniciar a API. A imagem Alpine instala OpenSSL antes do `npm install` para o engine Prisma.
- O `npm install` acrescentou `hasInstallScript` ao lockfile para registrar o `postinstall` Prisma já definido pelo OpenCode.
- A branch foi rebaseada sobre `196be07`, incluindo o endurecimento do contrato de tokens e os schedulers BullMQ.

## 2026-10-19 — Codex, documentação e nova execução de integração

- Adicionados README de execução e API, diagrama Mermaid e checklist de entrega. A imagem em `docs/assets` é uma referência visual existente e ainda precisa ser substituída por uma captura final revisada.
- Após o rebase sobre `196be07`, `migrate deploy` e `npm run test:codex` passaram usando banco descartável: 2 suítes e 3 testes passaram (integração da API e componentes).
- No head do PR #1 (`196be07`), GitHub Actions reporta os dois checks `validate` como sucesso e o PR está aberto/limpo para merge.
- Na branch Codex, `format:check`, lint, testes unitários, integração, build e `docker compose build api` passaram após o rebase; a revisão local não encontrou bloqueador adicional. A branch foi publicada e o PR #2, com base `opencode/api-web`, contém somente os arquivos da Codex e tem CI verde.

## 2026-10-21 — OpenCode, validação do worker em execução

- **Bug crítico corrigido:** o `lookup` fixado do `safeFetch` ignorava `options.all`; no Node 20 (`autoSelectFamily`) toda checagem HTTPS falhava com `ERR_INVALID_IP_ADDRESS`. Agora ele responde com array no modo `all` e com string/family no modo simples, e há teste unitário para os dois. Isso afetava monitores **e** webhooks/Slack.
- **Agendamento imediato:** `MonitorsService` chama `syncSchedules()` após criar/editar/excluir monitor, em vez de esperar até 60s pelo próximo ciclo.
- **Testes de alertas:** `alerts.service.spec.ts` cobre payload de webhook/Slack, canal sem destino e falha de canal sem derrubar a checagem.
- **Validação ponta a ponta (Docker):** monitor em `https://example.com` → 3× SUCCESS (HTTP 200, ~19–56ms); monitor com URL 404 → 3× FAILURE, incidente `OPEN` após 2 falhas; ao corrigir a URL → status `UP` e incidente `RESOLVED` na primeira checagem. Schedulers criados/removidos no Redis conforme pausa/exclusão.
- Validação: format, lint, **16 suítes / 52 testes** e builds. PR #1 segue `CLEAN`/`MERGEABLE`.

## 2026-10-21 — OpenCode → Codex: handoff de deploy

O PR #1 foi mesclado em `codex/phase-0` (`2a36b8a`) e o PR #2 já está integrado. A parte de produto (OpenCode) está concluída e o CI da branch padrão está verde. **Falta o deploy, que é da Codex.** Itens para assumir:

**Bloqueiam o lançamento**

1. **Dockerfile de produção da API:** o atual (`apps/api/Dockerfile`) roda `npm run dev` e mantém devDependencies. Precisa de build (`npm run build`) + start (`node dist/main.js`), usuário non-root e imagem final enxuta.
2. **Configs de deploy:** `render.yaml`/`fly.toml` (API) e `vercel.json` (web), com healthcheck, comando de migração (`prisma migrate deploy`) e redeploy automático a partir de `codex/phase-0` (ou `main`).
3. **Segredos de produção:** `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (≥32 chars), `WEB_ORIGIN`, `SMTP_*` e `COOKIE_*`.
4. **Domínio + TLS + CORS:** preferir subdomínios do mesmo site (`app.*` + `api.*`) com `COOKIE_SAMESITE=lax`; se for cross-site, `none` + `secure` e validar bloqueio de cookies de terceiros. Ajustar `WEB_ORIGIN` e a allowlist do WebSocket.
5. **Banco/Redis gerenciados:** rodar `migrate deploy` no banco novo, validar o endpoint de saúde e o worker BullMQ consumindo jobs.
6. **Backup/retenção e observabilidade mínima:** logs da API/worker, alerta se API ou worker cair, política de retenção de checagens/incidentes.

**Pendências do checklist que dependem de infra**

- Validar entrega real de e-mail (SMTP) e de webhook/Slack com destino público.
- Screenshot final com dados de demonstração revisados.
- Política de privacidade/segurança e licença do repositório.

**Observação:** a checagem recorrente do BullMQ foi validada em 2026-10-21 (3 ciclos em `https://example.com`, incidente abre após 2 falhas e resolve no primeiro sucesso), então esse item do checklist pode ser marcado como concluído.

**Decisões pendentes do usuário:** provedor (Vercel para web; Render/Railway/Fly para API; Postgres/Redis gerenciados), domínio e segredos.

**Do lado OpenCode (backlog opcional, não bloqueia deploy):** telas de canais de alerta e histórico de incidentes, editar/excluir/pausar monitor, redirect para `/login`, readiness de Postgres/Redis, normalização de e-mail e E2E do web.

Codex: pode assumir o pacote de deploy e responder aqui com o que precisar do usuário (contas, domínio, segredos).

## 2026-10-21 — Codex, preparação do deploy

- Criado o Dockerfile multi-stage de produção da API: build NestJS, OpenSSL, dependências de produção e execução como usuário `node`. O Prisma CLI passa a ser dependência de runtime para `migrate deploy`; Compose segue usando `apps/api/Dockerfile.dev`.
- Adicionado `render.yaml` para API, PostgreSQL e Key Value na região Virginia, com migração pre-deploy, health check, secrets JWT gerados e auto-deploy após CI na branch `codex/phase-0`. Os planos estão explícitos no arquivo; revisar custos antes de aplicar.
- Adicionado `apps/web/vercel.json` e `docs/DEPLOY.md` com setup de domínio, cookies, variáveis e validação pós-deploy.
- A imagem `pulse-status-api:prod` construiu localmente com sucesso. `render.yaml` passou pelo parser YAML e o Prettier foi aplicado.
- Não foram criados serviços nem configuradas contas. Faltam acesso às contas do usuário, escolha/posse de domínio e confirmação dos custos; depois disso preencher `WEB_ORIGIN`, configurar DNS, aplicar Blueprint e projeto Vercel, e validar saúde, cookies e worker em produção.
- `npm audit --omit=dev` no lockfile agregado apontou 1 crítico e 3 altos; no workspace API, 2 altos (Nest platform-express/Multer). O Next resolvido é `14.2.35`; as correções recomendadas envolvem majors. Revisar com OpenCode antes de exposição pública, sem upgrades forçados automáticos.

## 2026-10-21 — reescrita de histórico (autoria)

- Todo o histórico foi reescrito para autor/committer `LucasCorsii <141085443+LucasCorsii@users.noreply.github.com>`, eliminando as identidades OpenCode/Codex dos commits.
- As branches `codex/phase-0`, `opencode/api-web` e `codex/integration-tests` foram force-pushadas e agora têm novos SHAs. Os PRs #1 e #2 continuam `MERGED`.
- **Codex:** antes de continuar, atualize o clone com `git fetch origin` e `git reset --hard origin/<branch>`; não faça merge do histórico antigo.
- Backup do histórico anterior (local, não versionado): `/tmp/opencode/pulse-status-pre-rewrite.bundle`.
