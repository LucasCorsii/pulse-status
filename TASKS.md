# Tarefas

Status: `todo`, `doing`, `done`, `blocked`.

## Fase 0 — fundação (Codex)

- [x] Definir arquitetura, modelo, endpoints e donos (`PLAN.md`).
- [x] Criar monorepo, convenções e configuração compartilhada.
- [x] Modelar schema Prisma inicial.
- [x] Criar Docker Compose, exemplo de ambiente e CI.
- [x] Criar repositório GitHub público e publicar `codex/phase-0` para revisão.
- [x] Definir GitHub como remote compartilhado nos dois clones; manter o caminho local OpenCode como `codex-local`.
- [x] Validar lint, testes unitários e build após a implementação OpenCode (passaram na branch OpenCode).

## Próximas fases

- [x] OpenCode: implementar API NestJS e aplicação Next.js conforme `PLAN.md` (PR #1; correções revisadas em `196be07`).
- [x] Codex: testes de integração da API e testes dos componentes principais; CI usa PostgreSQL e executa as migrações (`codex/integration-tests`).
- [x] Codex: adicionar OpenSSL à imagem API e criar migração Prisma inicial com `migrate deploy` no Compose/CI.
- [x] Codex: revisão final do PR #1 (`196be07`); CI do PR no GitHub passou (2 checks `validate`) e estado está limpo para merge.
- [ ] Codex: publicar `codex/integration-tests` e confirmar CI dos testes, migração e Dockerfile nessa branch.
- [ ] Codex: configurar deploy web/API após definição do ambiente e segredos.
- [x] Codex: README, screenshot de referência, diagrama de arquitetura e checklist de entrega (`README.md`, `docs/`). Screenshot atual é uma imagem de referência do painel; substituir por captura final após revisão visual.
