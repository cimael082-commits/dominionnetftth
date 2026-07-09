
## Objetivo
Substituir o layout atual do carnê PDF (`src/lib/carne-pdf.ts`) pelo modelo visual da imagem enviada: tiras horizontais, cabeçalho azul com logo Dominion Net, campos DOCUMENTO/VENCIMENTO/PARCELA/VALOR à esquerda, dados da empresa à direita, e bloco inferior com NOME / ENDEREÇO / SUPORTE + **dois QR codes Pix idênticos** (um à esquerda com "ESCANEIE O QR CODE para pagar com Pix" e outro à direita ao lado do texto "PAGUE COM PIX").

## Escopo (apenas apresentação/PDF)
Só muda o gerador de PDF. Nenhuma alteração em banco, rotas, fluxos, ou lógica financeira.

## Mudanças

### 1. `src/lib/carne-pdf.ts` — reescrever `desenharBoleto`
Layout de cada tira (aprox. 90mm de altura, 3 por página A4):

```
┌─────────────────────────────────────────────────────────────────────┐
│ DOCUMENTO   VENCIMENTO   │ [LOGO DN]  Dominion Net Telecom 5G Ltd… │
│ [ 66959 ]   [ 30/07/27 ] │            Internet Fibra Óptica…        │
│ PARCELA     VALOR        │            ☎ Telefone: (82) …  Suporte  │
│ [ 03/12 ]   [ 39,99   ]  │                                          │
├─────────────────────────────────────────────────────────────────────┤
│ 👤 NOME                  │              │ 💲 PAGUE COM PIX          │
│    <cliente.nome>        │  [ QR Pix ]  │    Pode fazer o pagamento │
│ 📍 ENDEREÇO              │              │    pelo Pix <chave>       │
│    <cliente.endereco>    │  ESCANEIE O  │    ou QR Codes  [ QR Pix ]│
│ 🟢 SUPORTE               │  QR CODE     │                           │
│    <empresa.telefone>    │ para pagar…  │                           │
└─────────────────────────────────────────────────────────────────────┘
```

Detalhes visuais:
- Borda arredondada azul-marinho (`#0F2847`), linha fina.
- Labels em azul escuro pequenos (7–8pt), valores em caixa branca com borda arredondada.
- **DOCUMENTO**: preenchimento sólido azul-marinho + texto branco (como no modelo).
- Cabeçalho direito: nome da empresa em azul escuro bold + 2 linhas de descrição + linha azul-claro arredondada com telefone/suporte.
- Ícones (usuário / pin / whatsapp / cifrão) desenhados como círculos azuis com glifo branco simples via `doc.circle` + `doc.text` — sem dependência externa.
- Logo: usar o logo Dominion Net existente (se houver em `src/assets`, incorporar como `addImage`; caso não exista, desenhar "dn" estilizado com `doc.text` em azul degradê simulado). *Confirmar se há arquivo de logo — se não houver, uso fallback textual.*
- **Dois QR codes idênticos** gerados a partir do mesmo BR Code Pix (função `gerarPixBRCode` existente), ~26mm cada, um antes do bloco "PAGUE COM PIX" e outro depois.
- Textos "PAGUE COM PIX", "Pode fazer o pagamento pelo Pix `<chave>` ou QR Codes" fixos, pegando a chave de `empresa.pix_chave`.
- Rodapé "ESCANEIE O QR CODE / para pagar com Pix" sob o QR da esquerda.

### 2. Sem outras mudanças
- `pix.ts`, `carnes.tsx`, banco, rotas: intactos.
- Mesma assinatura de `gerarCarnePDF(input)`, mesmos dados de entrada.

## Perguntas antes de implementar
1. Você quer que eu use o **logo Dominion Net como imagem** (se sim, me envie o arquivo ou confirme se posso deixar um placeholder textual estilizado por enquanto)?
2. Manter **3 tiras por página A4** (como hoje) ou você prefere 2 tiras maiores por página, mais próximas do tamanho da imagem?
