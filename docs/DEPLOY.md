# Deploy de produção

Esta configuração prepara a API no Render e a aplicação Next.js na Vercel. Ela não cria serviços nem configura contas. O `render.yaml` declara serviços gerenciados e pode gerar cobrança quando aplicado; revise os planos e limites na conta antes de confirmar a criação.

## Domínio e cookies

Use dois subdomínios do mesmo domínio registrado, por exemplo `app.seudominio.com` e `api.seudominio.com`. Os domínios padrão `*.vercel.app` e `*.onrender.com` são cross-site; a sessão depende de cookies e pode falhar quando o navegador bloqueia cookies de terceiros.

Com os subdomínios próprios, configure no Render:

- `WEB_ORIGIN=https://app.seudominio.com`
- `COOKIE_SAMESITE=lax`
- `COOKIE_SECURE=1`
- `COOKIE_DOMAIN` vazio para manter os cookies limitados ao host da API.

Adicione `api.seudominio.com` ao serviço da API no Render e `app.seudominio.com` ao projeto web na Vercel. Configure os registros DNS indicados nos respectivos painéis e espere a validação TLS antes de testar login. O `WEB_ORIGIN` também controla CORS, CSRF e a allowlist do WebSocket.

## API, PostgreSQL e Redis no Render

1. Conecte o repositório `LucasCorsii/pulse-status` ao Render e crie um Blueprint apontando para `render.yaml` na branch `codex/phase-0`.
2. Revise os planos declarados (`0.5c-512mb` para API, `0.1c-256mb` para Postgres e `256mb` para Key Value) e a região `virginia` antes de aplicar. São recursos gerenciados que podem gerar cobrança. A configuração do Redis mantém persistência e bloqueia conexões externas; o Postgres também bloqueia conexões externas.
3. Preencha `WEB_ORIGIN` com a origem web final. O Render gera valores independentes para `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET`.
4. O deploy usa a imagem de produção em `apps/api/Dockerfile`, executa `prisma migrate deploy` no pre-deploy e verifica `GET /api/v1/health`.
5. Ative deploy automático após os checks do CI. O blueprint acompanha `codex/phase-0`.

Os registros `DATABASE_URL` e `REDIS_URL` são conectados aos serviços internos do Render pelo Blueprint. Não copie URLs internas para o navegador ou para o Git.

## Web na Vercel

Crie um projeto Vercel para o mesmo repositório e defina **Root Directory** como `apps/web`. Use o framework Next.js detectado pela Vercel. Configure estas variáveis no ambiente **Production**:

```text
NEXT_PUBLIC_API_URL=https://api.seudominio.com
API_INTERNAL_URL=https://api.seudominio.com
```

`NEXT_PUBLIC_API_URL` é incorporada ao JavaScript do navegador; defina-a antes do build de produção. Adicione o domínio `app.seudominio.com` ao projeto Vercel e configure os DNS conforme o painel indicar.

Pré-visualizações da Vercel não estão autorizadas pela API por padrão. Para testá-las, use uma API de staging e inclua a origem exata dessa prévia em `WEB_ORIGIN`; não use curingas para abrir a proteção CSRF.

## Segredos e alertas

O Blueprint gera os dois segredos JWT e liga o Postgres e Redis. Depois de escolher o domínio, informe `WEB_ORIGIN` no Render. Configure `SMTP_URL` e `SMTP_FROM` no painel Render apenas quando houver um transporte SMTP pronto; sem eles, alertas por e-mail não serão enviados.

Não coloque credenciais em `render.yaml`, `vercel.json`, `.env.example` ou no Git. Use os painéis de ambiente/segredos dos provedores.

## Validação após o primeiro deploy

- `https://api.seudominio.com/api/v1/health` responde com status 200.
- A migration `20261019000000_init` aparece aplicada no banco novo.
- Criar conta e fazer login em `https://app.seudominio.com` grava `ps_access` e `ps_refresh` como cookies HttpOnly/Secure; `SameSite=Lax`.
- Criar um monitor público, observar ao menos três ciclos de sucesso e confirmar as atualizações no painel e no WebSocket.
- Apontar um monitor de teste para um endpoint que responda 404; confirmar incidente aberto após duas falhas e resolvido após o sucesso seguinte.
- Validar envio real de SMTP e webhook/Slack com destinos de teste.
- Configurar alertas operacionais e retenção dos logs. O Render oferece recuperação PITR em Postgres pago; defina também exportação externa/retida conforme a política do projeto.

O endpoint atual de saúde confirma que o processo HTTP está respondendo; não testa Postgres nem Redis. Antes de escalar, implementar readiness que verifique dependências e testar restauração do banco. O Render oferece PITR para bancos pagos; no plano Hobby a janela indicada é de três dias, e no Pro ou superior, sete dias. Backups lógicos exportados pelo painel ficam retidos por sete dias, então faça cópias externas para retenção longa.

## Bloqueio de segurança antes de expor a produção

Em 2026-10-21, `npm audit --omit=dev` apontou avisos críticos para o Next.js atualmente resolvido no lockfile (`14.2.35`) e altos em `@nestjs/platform-express`/Multer. No workspace da API, o audit apontou 2 altos; no lockfile de produção agregado, 1 crítico e 3 altos. O npm sugere atualizações principais para algumas correções. Revisar e atualizar essas dependências, coordenando a mudança do Next/Nest com o mantenedor OpenCode, antes de expor o app publicamente. Não aplicar `npm audit fix --force` sem migração e validação.

## Referências dos provedores

- [Render Blueprint spec](https://render.com/docs/blueprint-spec) — Docker context, auto-deploy após CI, pre-deploy, serviços e variáveis.
- [Render health checks](https://render.com/docs/health-checks) — configuração e comportamento do endpoint HTTP de saúde.
- [Render Postgres backups](https://render.com/docs/postgresql-backups) — PITR, exportações lógicas e retenção.
- [Vercel monorepos](https://vercel.com/docs/monorepos) — configuração do Root Directory `apps/web`.
- [Next.js upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-15) e [avisos do npm](https://github.com/advisories/GHSA-3x4c-7xq6-9pq8) — revisar o salto de versão do framework antes do deploy.
