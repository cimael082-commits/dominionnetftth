# Otimização de créditos e recursos

## Resultado esperado
- Desativar o Assistente IA, voz e transcrição para impedir consumo de créditos de IA.
- Manter intactos login, banco de dados, Google Maps, geocodificação e dados existentes.
- Manter a sincronização MikroTik, pois ela atualiza clientes e marcadores do mapa.
- Preservar backup manual e restauração; não existe agendamento automático ativo para desligar.
- Remover consultas periódicas redundantes das telas, mantendo atualizações por eventos em tempo real e atualização manual.

## Alterações
1. Remover a entrada do Assistente IA do menu e bloquear suas três APIs antes de qualquer chamada paga.
2. Substituir as consultas repetidas a cada 30 segundos por atualizações em tempo real já disponíveis.
3. Não alterar chaves, login, API do mapa, tabelas, registros ou o endpoint de sincronização MikroTik.
4. Validar compilação e comportamento das telas afetadas.

## Detalhes técnicos
- O `LOVABLE_API_KEY` continuará disponível porque a geocodificação do Google Maps usa o gateway de conectores; somente endpoints de modelos de IA serão bloqueados.
- Timers puramente visuais, como rotação de banners e ajuste do menu lateral, não fazem chamadas externas e serão mantidos.
- Realtime só permanece ativo enquanto a respectiva tela está aberta e é necessário para preservar o comportamento atual.
