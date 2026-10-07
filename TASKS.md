# Tarefas

Status: `todo`, `doing`, `done`, `blocked`.

## Fase 0 — fundação (Codex)

- [x] Definir arquitetura, modelo, endpoints e donos (`PLAN.md`).
- [x] Criar monorepo, convenções e configuração compartilhada.
- [x] Modelar schema Prisma inicial.
- [x] Criar Docker Compose, exemplo de ambiente e CI.
- [x] Criar repositório GitHub público; publicar branch Codex para revisão — remoto criado; push ainda pendente.
- [ ] Validar lint, testes e build após os pacotes OpenCode estarem implementados — **blocked**: `apps/web` e `apps/api` ainda não têm código/configuração de aplicação.

## Próximas fases

- [ ] OpenCode: implementar API NestJS e aplicação Next.js conforme `PLAN.md`.
- [ ] Codex: testes de integração da API e testes dos componentes principais após implementação OpenCode.
- [ ] Codex: revisar PRs do OpenCode.
- [ ] Codex: configurar deploy web/API após definição do ambiente e segredos.
- [ ] Codex: README final, screenshot, diagrama e checklist de entrega.
