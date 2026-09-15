# Plano — Teste de Internet na Central do Cliente

## O que será feito

- Adicionar **Teste de Internet** ao menu “Mais” da Central do Cliente, mantendo a navegação principal compacta no celular.
- Criar a página protegida `/cliente/teste-internet`, acessível somente após o login do cliente.
- Incorporar exatamente o teste existente em `https://maceivelocidade.lovable.app`, sem recriar ou alterar seu funcionamento.
- Ajustar a área incorporada para ocupar a largura disponível e ter altura adequada em celular e computador.
- Incluir título e descrição próprios da página para acessibilidade e identificação.

## Validação

- Confirmar que a página externa permite incorporação e carrega dentro da Central.
- Testar navegação autenticada, renderização em computador e celular, ausência de sobreposição com o menu inferior e erros no navegador.
- Verificar que os controles do teste ficam acessíveis e que a medição pode ser iniciada dentro da página incorporada.

## Limite da integração

A medição continuará sendo executada pela página original. Se o serviço externo bloquear incorporação, sensores ou rede no navegador, será necessário ajustar essa página original; nenhum teste alternativo será criado.
