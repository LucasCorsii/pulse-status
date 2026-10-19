# Checklist de entrega

## Produto

- [x] Monorepo web/API e schema inicial.
- [x] Fluxos de autenticação e gestão de monitores.
- [x] Painel, detalhe de monitor e página pública de status.
- [x] Testes unitários existentes e testes de componentes.
- [x] Teste de integração para autenticação, isolamento de monitores, status público e redação de segredos.
- [ ] Corrigir o bootstrap de `ChecksService` no `ChecksModule` e repetir a integração.
- [ ] Confirmar execução recorrente de verificações com worker BullMQ.
- [ ] Configurar e validar transporte de e-mail e destinos de alertas.

## Operação

- [x] Docker Compose para web, API, PostgreSQL e Redis.
- [x] `.env.example` sem credenciais reais.
- [x] CI para formatação, lint, testes, integração e build.
- [ ] Definir ambiente e provedor de deploy.
- [ ] Configurar segredos, domínio, TLS e CORS de produção.
- [ ] Definir backup, retenção e observabilidade.
- [ ] Gerar screenshot final em execução com dados de demonstração revisados.

## Revisão

- [ ] Resolver achados pendentes do PR de implementação.
- [ ] Rodar toda a suíte em CI após integrar os módulos da API.
- [ ] Revisar documentação de segurança e política de privacidade antes de produção.
- [ ] Definir licença do repositório.
