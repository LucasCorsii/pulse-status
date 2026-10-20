# Checklist de entrega

## Produto

- [x] Monorepo web/API e schema inicial.
- [x] Fluxos de autenticação e gestão de monitores.
- [x] Painel, detalhe de monitor e página pública de status.
- [x] Testes unitários existentes e testes de componentes.
- [x] Teste de integração para autenticação, isolamento de monitores, status público e redação de segredos.
- [x] Corrigir o bootstrap de `ChecksService` no `ChecksModule` e repetir a integração.
- [x] Versionar a migração inicial do Prisma e validar `migrate deploy` em banco vazio.
- [ ] Confirmar execução recorrente de verificações com worker BullMQ.
- [ ] Configurar e validar transporte de e-mail e destinos de alertas.

## Operação

- [x] Docker Compose para web, API, PostgreSQL e Redis.
- [x] `.env.example` sem credenciais reais.
- [x] CI para formatação, lint, testes, integração e build.
- [x] Executar migrações Prisma no CI com PostgreSQL antes da integração.
- [x] Instalar OpenSSL na imagem Alpine da API para o engine Prisma.
- [x] Validar localmente formatação, lint, testes unitários, integração, builds e build da imagem API após rebase sobre `196be07`.
- [ ] Publicar branch Codex e confirmar o CI do GitHub nela (o CI verde atual pertence ao PR #1 em `196be07`).
- [ ] Definir ambiente e provedor de deploy.
- [ ] Configurar segredos, domínio, TLS e CORS de produção.
- [ ] Definir backup, retenção e observabilidade.
- [ ] Gerar screenshot final em execução com dados de demonstração revisados.

## Revisão

- [x] Corrigir os achados P1/P2 registrados na revisão inicial do PR de implementação (`a9445f7`).
- [x] Revisar o PR de implementação em `196be07`; CI do GitHub verde e estado `CLEAN`.
- [ ] Revisar documentação de segurança e política de privacidade antes de produção.
- [ ] Definir licença do repositório.
