# Plano — Área do Cliente Dominion Net

Este pedido é grande demais para uma única entrega. Vou dividir em fases, começando pela **Área do Cliente Web** (que também servirá de base para o app Android via Capacitor no futuro) e pelo backend compartilhado. Tudo usa o mesmo banco e a mesma API já existentes — nada de duplicar dados.

## Fase 1 — Backend compartilhado (esta entrega)

**Migrations:**
- `clientes`: adicionar `cpf_cnpj_norm` (só dígitos, único parcial), `senha_cliente_hash`, `wifi_ssid`, `wifi_senha`, `google_sub`, `facebook_id` (uniques), `linked_at`.
- Nova tabela `avisos`: título, mensagem, tipo (info/manutencao/promocao/aviso), destino (`all` ou `cliente_id`), created_at.
- Nova tabela `aviso_leituras`: (aviso_id, cliente_id, lido_em) — para central de notificações por cliente.
- Nova tabela `notificacoes`: gerada automaticamente (vencimento 5d/2d/hoje/atraso/pagamento confirmado/novo carnê). Campos: cliente_id, tipo, título, corpo, parcela_id, lido, created_at.
- Cron diário (`pg_cron` + endpoint público) para materializar lembretes de vencimento.
- Seed opcional: campo `senha_cliente_hash` recebe hash de "123" para todos os clientes (conforme pedido).

**RLS:**
- Todas as novas tabelas com RLS.
- Sessão do cliente **não** usa `auth.users` — usa JWT customizado assinado pela API (evita misturar operadores/admins com clientes). Endpoints públicos em `/api/public/cliente/*` validam esse JWT.

**Endpoints REST (`src/routes/api/public/cliente/*`):**
- `POST /auth/login` — body `{ identificador, senha }`. Identificador aceita CPF (só dígitos) **ou** login_pppoe. Senha "123" para todos. Retorna JWT.
- `POST /auth/google` — recebe id_token Google. Se `google_sub` já vinculado → login direto. Se não → retorna `needs_link: true`, cliente informa CPF/PPPoE + senha em fluxo seguinte (`POST /auth/link`) que grava `google_sub`.
- `POST /auth/facebook` — mesmo esquema com `facebook_id`.
- `POST /auth/forgot` — placeholder (envia registro; e-mail real fica pra Fase 3).
- `GET /me` — dados do cliente logado (nome, CPF mascarado, endereço, telefone, plano, mensalidade, dia_vencimento, online, uptime, ip, wifi_ssid, wifi_senha).
- `GET /financeiro` — todas parcelas do cliente (aberto/pago/vencido) com PIX QR + copia-e-cola + valor + vencimento.
- `GET /financeiro/:parcelaId/pdf` — devolve carnê individual em PDF.
- `GET /financeiro/:parcelaId/comprovante` — só quando pago; PDF do recibo.
- `GET /avisos` — avisos globais + do cliente.
- `POST /avisos/:id/ler` — marca lido.
- `GET /notificacoes` — central de notificações.

## Fase 2 — Área do Cliente Web (esta entrega)

Rotas públicas separadas do painel admin, prefixo `/cliente/*`, layout próprio (mobile-first, mesma identidade azul corporativa) — vai ficar visualmente igual ao que o app Android vai renderizar depois.

- `/cliente/login` — CPF/PPPoE + senha, botão Google, botão Facebook, "Esqueci senha", "Permanecer conectado" (persiste JWT).
- `/cliente` (home) — saudação, plano, mensalidade, vencimento, status conexão (verde/vermelho), status financeiro (em dia/atrasado).
- `/cliente/financeiro` — lista de parcelas com abas Abertas / Pagas / Vencidas + próxima. Cada item: valor, vencimento, QR Code PIX (canvas), botão copiar PIX, baixar PDF, compartilhar (Web Share API).
- `/cliente/pagamentos` — histórico com recibos baixáveis.
- `/cliente/conexao` — plano, status, tempo conectado, IP.
- `/cliente/wifi` — SSID e senha (somente leitura, botão copiar).
- `/cliente/avisos` — central de avisos + notificações, marca como lido.
- `/cliente/atendimento` — botão WhatsApp `wa.me/5582993823246`.
- `/cliente/perfil` — dados cadastrais completos (somente leitura).

## Fase 3 — Painel admin: envio de avisos e comprovantes (esta entrega, leve)

- Nova página `/avisos` no painel admin: form (título, mensagem, tipo, destino `todos` ou seletor de cliente) e listagem.
- Quando parcela vira `pago` no painel, sistema já grava `data_pagamento` — vou adicionar `forma_pagamento` (pix/boleto/dinheiro) para o comprovante.

## Fase 4 — Não incluído nesta entrega (fica para depois)

- **App Android nativo/Capacitor + Google Play**: envolvo depois usando a mesma Área do Cliente Web dentro de shell Capacitor. Preciso confirmar se você quer TWA (mais simples, requer domínio) ou Capacitor híbrido.
- **Push notifications reais (FCM)**: exige projeto Firebase seu + credencial. Fase 3 real. Por enquanto as notificações aparecem na Central dentro do app/web.
- **OAuth Google/Facebook produção**: precisa das credenciais OAuth do provedor apontando para o domínio publicado. Vou deixar a arquitetura pronta e um botão funcional, mas a habilitação final exige suas credenciais.
- **E-mail de recuperação de senha**: exige conexão de e-mail (Resend/GatewayAPI) — configuramos depois.
- **iOS/App Store**: fora do escopo agora.

## Detalhes técnicos

- Auth do cliente = JWT HS256 assinado com secret novo `CLIENTE_JWT_SECRET` (gerado via `generate_secret`). Guardado em `localStorage` se "permanecer conectado", senão `sessionStorage`.
- Hash de senha do cliente: `bcrypt` no server (Worker-compatível: `bcryptjs`).
- PIX QR e PDF reutilizam `src/lib/pix.ts` e `src/lib/carne-pdf.ts` já existentes.
- Realtime: mesma subscription Supabase já usada no mapa, agora escutando `clientes` e `parcelas` do próprio cliente.
- Zero mudança na estrutura atual de clientes/parcelas — só colunas novas.

## Confirmação antes de codar

Responde só com **OK** para eu executar as Fases 1–3 acima nesta entrega, ou me diga o que remover/priorizar. Quer que eu já deixe o botão do Google visível mesmo sem credenciais OAuth reais configuradas (ele vai mostrar aviso "configure credenciais"), ou escondo até você conectar?
