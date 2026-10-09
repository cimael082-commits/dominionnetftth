# Migração independente — Dominion Net FTTH

## Objetivo
Preparar o app para ser compilado e hospedado sem depender da plataforma Lovable, preservando o Supabase, login, mapa FTTH/Google Maps e sincronização MikroTik.

## Regras de segurança
- Trabalhar nesta branch: `migration/independent-hosting-audit`.
- Não alterar `main` nem mesclar sem compilar e testar.
- Nunca versionar `.env`, tokens, senhas ou chaves privadas.
- Chaves Supabase publishable e Google Maps de navegador são expostas ao cliente por natureza; restringir a chave do Maps por domínio e APIs. Nunca usar uma chave Supabase secret/service_role no navegador.
- Manter endpoints de IA desativados até confirmar que não fazem chamadas ao Lovable AI Gateway.
- Não alterar esquema nem dados do Supabase sem backup e validação.

## Descobertas iniciais
- Aplicação React + TypeScript + Vite/TanStack Start.
- Supabase JS está integrado; existem migrações SQL versionadas.
- O build ainda importa `@lovable.dev/vite-tanstack-config`.
- O carregador do Google Maps usa variáveis com prefixo `VITE_LOVABLE_CONNECTOR_`.
- O cliente Supabase importa armazenamento de sessão específico da prévia Lovable.
- Há arquivos do gateway de IA Lovable; revisar todas as rotas que os importam antes de removê-los.
- O arquivo `.env` estava versionado. Foi removido nesta branch e substituído por um modelo vazio `.env.example`; valores existentes não foram copiados.

## Próximas etapas
1. Substituir configuração de build da Lovable por configuração Vite/TanStack oficial e validar dependências.
2. Migrar autenticação para armazenamento padrão do navegador fora da prévia Lovable.
3. Renomear variáveis do Google Maps e atualizar os usos sem interromper o mapa.
4. Auditar e manter todas as rotas/endpoints de IA desativados.
5. Confirmar integração MikroTik, mapa, clientes, caixas/CTOs e histórico.
6. Rodar instalação limpa, lint e build; corrigir falhas.
7. Configurar hospedagem independente e variáveis de ambiente fora do repositório.
8. Só então abrir PR e avaliar deploy. A branch `main` permanece intacta.

## Status
Auditoria inicial iniciada. Ainda não afirmar que a migração ou o deploy estão concluídos.
