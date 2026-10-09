# Migração independente — Dominion Net FTTH

## Objetivo
Preparar o Dominion Net FTTH para rodar fora da Lovable, preservando Supabase/login, mapa FTTH e sincronização MikroTik.

## Proteções
- Todo o trabalho fica na branch `migration/independent-hosting-audit`; `main` não foi alterada.
- Não mesclar nem colocar em produção antes de a instalação, o lint, o build e os testes funcionais passarem.
- Nunca versionar `.env`, senhas ou chaves privadas. O `.env` foi removido somente nesta branch; se continha credenciais reais, rotacione-as no serviço correspondente, pois removê-lo do commit atual não apaga o histórico antigo.
- Use apenas a chave publicável do Supabase no navegador; nunca use `service_role`/secret no frontend.
- Restrinja a chave de navegador do Google Maps por domínio e APIs.

## Alterações feitas nesta branch
- Criado `.env.example` sem valores secretos e atualizado `.gitignore`.
- Removido o `.env` versionado nesta branch.
- Removido do cliente Supabase o armazenamento de sessão específico da prévia Lovable.
- Renomeadas as variáveis do Google Maps para `VITE_GOOGLE_MAPS_BROWSER_KEY` e `VITE_GOOGLE_MAPS_TRACKING_ID`.
- Substituída a configuração Vite da Lovable por plugins Vite/TanStack Start, Tailwind, React e Nitro.
- Removida a dependência `@lovable.dev/vite-tanstack-config` do `package.json`; o CI executa `bun install` para atualizar/verificar o lockfile.
- Adicionado comando de inicialização de produção e workflow do GitHub Actions para lint/build.
- Criado `render.yaml` como ponto de partida para hospedagem Render. As variáveis de ambiente devem ser preenchidas no painel do serviço, não no GitHub.

## Ainda precisa validar
1. Aguardar e corrigir os resultados do GitHub Actions: instalação, lint e build.
2. Auditar os arquivos/rotas que usam o gateway de IA Lovable e desativá-los com segurança; não declarar IA desligada até concluir essa auditoria.
3. Testar login, sessão após recarregar, mapa/Google Maps, clientes/CTOs e sincronização MikroTik.
4. Configurar as variáveis do Supabase e Google Maps no host e testar o deploy em ambiente de teste.
5. Só depois considerar merge para `main`.

## Status atual
A configuração de build e o rascunho de hospedagem foram alterados na branch de migração. Ainda não há confirmação de build bem-sucedido, testes funcionais nem deploy ativo. A PR continua em rascunho e não foi mesclada.
