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
- [x] Codex: testes de integração da API e testes dos componentes principais (branch `codex/integration-tests`; rebase sobre `196be07` em andamento).
- [ ] Codex: revisão final do PR #1 e confirmação do CI do GitHub após publicação.
- [ ] Codex: configurar deploy web/API após definição do ambiente e segredos.
- [ ] Codex: README final, screenshot, diagrama e checklist de entrega.
