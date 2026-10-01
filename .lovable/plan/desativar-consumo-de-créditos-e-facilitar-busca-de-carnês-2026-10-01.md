# Desativar consumo de créditos e facilitar busca de carnês

## Resultado esperado
- Manter como consumo externo somente o necessário para o mapa e sua geocodificação.
- Preservar login, banco de dados, sincronização MikroTik e todas as informações existentes.
- Garantir que Assistente IA, voz e transcrição continuem bloqueados, inclusive por acesso direto.
- Adicionar pesquisa por nome na emissão de carnês para localizar clientes rapidamente.

## Alterações
1. Revisar os pontos restantes de IA e automações para confirmar que não existe chamada paga ativa; remover somente código/dependências de IA que estejam sem uso e não afetem outras funções.
2. Manter intactos Google Maps, geocodificação, autenticação, banco, Realtime necessário e sincronização MikroTik.
3. Na tela de carnês, adicionar um campo “Pesquisar cliente por nome” e filtrar a lista de seleção sem alterar a geração do PDF ou o lançamento das parcelas.
4. Manter a seleção atual quando houver pesquisa e mostrar um estado claro quando nenhum cliente for encontrado.
5. Validar a tela de carnês e confirmar que os endpoints de IA permanecem incapazes de gerar consumo.

## Detalhes técnicos
- Backups manuais, atualizações por evento e timers apenas visuais não consomem créditos de IA e serão preservados.
- A sincronização MikroTik será mantida porque alimenta o status dos clientes e os marcadores do mapa.
- Nenhuma chave, configuração do mapa, conta de acesso, tabela ou registro será alterado.
