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
