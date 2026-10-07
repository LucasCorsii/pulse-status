# Pulse Status — plano do projeto

## Objetivo

Plataforma full stack para monitorar disponibilidade de sites e serviços, registrar verificações, expor páginas públicas de status e enviar alertas de incidentes.

## Arquitetura

- `apps/web`: Next.js, TypeScript e Tailwind; interface autenticada e páginas públicas.
- `apps/api`: Node.js, TypeScript e NestJS; API REST, autenticação e gateway WebSocket.
- `packages/database/prisma`: schema Prisma e migrações do PostgreSQL.
- PostgreSQL guarda contas, monitores, verificações, incidentes e canais de alerta.
- Redis e BullMQ coordenam verificações agendadas e processamento de alertas.
- Docker Compose oferece dependências e aplicações em desenvolvimento local.
- GitHub Actions valida lint, testes e builds em pull requests e pushes.

## Fluxo de monitoramento

1. O usuário cadastra um monitor pela API.
2. A API persiste a configuração e agenda jobs recorrentes no BullMQ.
3. Workers executam checagens HTTP, persistem resultados e atualizam incidentes.
4. Mudanças de estado publicam eventos no WebSocket e disparam canais de alerta ativos.
5. A web consulta a API para dashboards e páginas públicas de status.

## Regras iniciais de incidentes e eventos

- Abrir incidente após duas falhas consecutivas do mesmo monitor; resolver após uma checagem bem-sucedida.
- O gateway WebSocket roda no mesmo processo da API NestJS, no namespace `/events`.
- Canais do MVP: e-mail, webhook genérico e Slack. Tokens/URLs secretos não devem ser expostos em respostas ou logs.

## Modelo de dados inicial

- `User`: identidade, e-mail único e senha armazenada como hash.
- `Monitor`: proprietário, nome, URL, intervalo, timeout, estado e timestamps.
- `Check`: monitor, resultado, status HTTP, latência, erro e data da verificação.
- `Incident`: monitor, início, resolução, causa e estado.
- `AlertChannel`: proprietário, tipo, configuração protegida e estado de ativação.

Os detalhes de índices, exclusão em cascata e enums estão no schema Prisma. Configurações de canal devem ser tratadas como segredos pela aplicação; não registrar valores em logs.

## Endpoints planejados

Prefixo `/api/v1`:

- `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- `GET /users/me`
- `GET|POST /monitors`, `GET|PATCH|DELETE /monitors/:id`
- `GET /monitors/:id/checks`, `GET /monitors/:id/incidents`
- `GET|POST /alert-channels`, `PATCH|DELETE /alert-channels/:id`
- `GET /status/:slug` (público; no MVP, `:slug` recebe o ID do monitor e não há coluna slug no schema)
- WebSocket `/events` para mudanças de estado autorizadas

IDs de recursos privados devem ser sempre escopados ao usuário autenticado. A API deve validar payloads e aplicar limites de taxa aos endpoints de autenticação.

## Responsabilidade por pastas

- **OpenCode**: `apps/web/**`, `apps/api/**` (implementação de produto e seus testes unitários).
- **Codex**: `PLAN.md`, `TASKS.md`, `COORDINATION.md`, `README.md`, `.github/**`, arquivos de raiz (`package.json`, configs, Docker, env) e testes de integração/contratos cross-app.
- Compartilhado: `packages/database/prisma/**`; mudanças de modelo devem ser registradas em `COORDINATION.md` para revisão cruzada.

## Decisões e limites

- Monorepo npm workspaces com TypeScript estrito.
- Prisma como camada de acesso ao PostgreSQL; Redis/BullMQ para trabalhos assíncronos.
- Segredos vêm do ambiente; `.env.example` contém somente valores ilustrativos não sensíveis.
- Não colocar credenciais reais em imagens, compose, logs ou repositório.
- Deploy alvo: Vercel para web e serviço gerenciado (Render, Railway ou Fly.io) para API; decisão final será registrada após comparar requisitos de workers e WebSocket.
