# Dominion  Net  MAPA

Projeto Dominion Net – Sistema Completo de Gerenciamento FTTH
Descrição do Projeto

O projeto Dominion Net é um sistema completo para gerenciamento de provedores de internet FTTH (Fibra Óptica até a residência).

O objetivo é reunir em uma única plataforma todos os setores do provedor, incluindo cadastro de clientes, gerenciamento da rede de fibra óptica, financeiro, carnês, mapa da rede e futuras integrações com MikroTik e sistemas de pagamento.

O sistema deve ser moderno, rápido, intuitivo e totalmente integrado.

Módulos do Sistema
Dashboard

Tela inicial com indicadores importantes:

Clientes ativos
Clientes bloqueados
Clientes cancelados
Clientes inadimplentes
Receita do mês
Quantidade de CTOs
Controle de Clientes
Cadastro completo contendo:

Nome
CPF/CNPJ
Telefone
WhatsApp
E-mail
Endereço completo
Bairro
Cidade
CEP
Localização GPS
Plano contratado
Valor da mensalidade
Data de vencimento
Login PPPoE
Nome da rede Wi-Fi (SSID)
Senha do Wi-Fi
Status do cliente
Observações

Cada cliente deve possuir uma página própria contendo todo o seu histórico.

Gerenciamento da Rede FTTH

Este é um dos principais módulos do sistema.

O sistema deverá possuir um mapa interativo onde será possível visualizar toda a infraestrutura da rede.

Recursos

Desenhar rotas da fibra diretamente no mapa.

Cadastrar:

Cabos
CTOs
Caixas de emenda
CEOs
Splitters

Cada cabo deverá possuir:

Nome
Quantidade de fibras
Cor
Status
Quilometragem

Ao clicar em um cabo deverá mostrar:

Quantidade total de fibras
Fibras livres
Fibras utilizadas
Clientes conectados
CTOs

Cadastrar CTO diretamente no mapa.

Cada CTO deverá possuir:

Nome
Código
Endereço
Coordenadas GPS
Quantidade de portas

Cada porta deverá possuir status:

Livre
Ocupada
Reservada
Defeito

Ao clicar na CTO será possível visualizar todos os clientes ligados nela.

Clientes no Mapa

Cada cliente deverá aparecer exatamente na localização da residência.

Ao clicar no cliente será possível visualizar:

Nome
Plano
Valor
PPPoE
Wi-Fi
CTO utilizada
Porta utilizada
Status financeiro
Histórico
Financeiro

O financeiro deverá ser totalmente integrado ao cadastro dos clientes.

Cada cliente possuirá um histórico financeiro próprio.

Exemplo:

Janeiro — Pago

Fevereiro — Pago

Março — Vencido

Abril — Pendente

O operador apenas marcará quando o cliente pagar.

O sistema deverá atualizar automaticamente o status para:

🟢 Pago

🟡 Pendente

🔴 Vencido

⚫ Cancelado

Carnês

Criar um módulo exclusivo para emissão de carnês.

O sistema deverá gerar automaticamente:

6 parcelas
12 parcelas
24 parcelas

Cada parcela deverá conter:

Nome do cliente
Valor
Data
Número da parcela
QR Code Pix
Dados da empresa

O PDF deverá ser profissional e pronto para impressão.

QR Code Pix

Utilizar a chave Pix da empresa para gerar automaticamente um QR Code em todas as parcelas do carnê.

Cada QR Code deverá conter:
pix é alexandrejosecicero561@gmail.com
Valor
Identificação da cobrança
Nome do cliente

O sistema deverá utilizar cores para facilitar a identificação.

🟢 Cliente em dia

🟡 Próximo do vencimento

🔴 Cliente inadimplente

🔵 Cliente bloqueado

⚫ Cliente cancelado

Pesquisa

Pesquisar rapidamente por:

Cliente
Telefone
CPF
Rua
Bairro
CTO
Cabo
Caixa de emenda

O mapa deverá localizar automaticamente o resultado.

Relatórios

Gerar relatórios em PDF e Excel.

Exemplos:

Clientes ativos
Clientes inadimplentes
Receita mensal
Fluxo de caixa
Rede FTTH
CTOs
Cabos
Carnês emitidos
Integrações Futuras

Preparar o sistema para integração com:

MikroTik

O objetivo é criar um sistema completo de gerenciamento para provedores FTTH, onde toda a operação da Dominion Net seja administrada em uma única plataforma.

O sistema deverá integrar cadastro de clientes, gerenciamento da rede de fibra óptica, mapa interativo, controle financeiro, emissão de carnês, contratos, ordens de serviço e futuras integrações com equipamentos de rede e meios de pagamento.

O foco é oferecer uma plataforma moderna, organizada, intuitiva e escalável, capaz de controlar desde a infraestrutura da rede até o relacionamento financeiro com os clientes, facilitando o crescimento e a gestão eficiente do provedor.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://dominionnetftth.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9a0c0357-3bfe-4786-b54d-fdb2bb1e39a3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
