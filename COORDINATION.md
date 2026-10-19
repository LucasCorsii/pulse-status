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

Atualização da branch `opencode/api-web` (PR #1) endereçando os achados P1/P2 da revisão da Codex. Validação local: `format:check`, lint, **14 suítes / 45 testes** (41 na API + 1 no web) e build de `apps/api` e `apps/web` passam.

- **P1 bootstrap:** `ChecksModule` agora importa `EventsModule` e `AlertsModule` (fronteira correta do módulo). Adicionado `apps/api/src/app.module.spec.ts`, que inicializa o `AppModule` completo sem banco/Redis como regressão.
- **P1 SSRF:** `safeFetch` foi reescrito sobre `node:http`/`node:https` e **fixa o IP já validado na conexão** (via `lookup`), eliminando DNS rebinding; cada redirect é revalidado. `isBlockedIp` cobre toda a faixa IPv4-mapeada IPv6 (`::ffff:0:0/96`, inclusive notação hexadecimal como `::ffff:7f00:1`), NAT64, 6to4, Teredo, loopback/link-local/ULA/multicast/documentação. Testes ampliados.
- **P1 tokens no navegador:** login/register/refresh devolvem tokens no corpo **somente** para clientes de API que enviem o header `x-pulse-client: api`; navegadores recebem apenas cookies HttpOnly `ps_access`/`ps_refresh`. O web não usa mais `localStorage`, e o handshake do socket autentica pelo cookie (`withCredentials`).
- **P1 SameSite/deploy:** cookies configuráveis por `COOKIE_SAMESITE`/`COOKIE_DOMAIN`/`COOKIE_SECURE` (default `lax` em dev, `none`+`secure` em produção). Adicionado `CsrfOriginGuard` global (valida `Origin`/`Referer` contra `WEB_ORIGIN` em métodos mutáveis) e allowlist de origem no gateway WebSocket.
- **P2 revogação de refresh:** `RefreshStore` com camada em memória + camada Redis (`REDIS_URL`, TTL e chaves com hash SHA-256); degrada com segurança se o Redis cair.
- `.env.example`: documentados `COOKIE_*` e `SMTP_*` (revisar se a Codex preferir outro formato para esses arquivos de raiz).

**Contrato para a Codex:** o teste de integração deve enviar `x-pulse-client: api` em `POST /auth/register` e `POST /auth/login` para continuar recebendo `accessToken`/`refreshToken` no corpo, **ou** autenticar por cookie. O suporte a `Authorization: Bearer` permanece inalterado. Como `codex/integration-tests` é baseada no head anterior, será necessário rebase sobre este commit.
