ALTER TABLE public.configuracoes_empresa
  ADD COLUMN IF NOT EXISTS portal_promo_ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS portal_promo_titulo text NOT NULL DEFAULT '🚀 Chegou a internet que conecta você ao melhor da tecnologia! 🚀',
  ADD COLUMN IF NOT EXISTS portal_promo_texto text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS portal_suporte_whatsapp text NOT NULL DEFAULT '5582993823246',
  ADD COLUMN IF NOT EXISTS portal_promo_rodape text NOT NULL DEFAULT 'Conectando você ao mundo com velocidade e qualidade!';

UPDATE public.configuracoes_empresa
   SET portal_promo_texto = '🌐 Dominion Net 5G — internet rápida, estável e feita para sua casa.

Confira nossos planos:
⚡ Plano Internet 50 Mega — 💰 R$ 49,90/mês
🎬 Internet + Netflix — 💰 R$ 70,00/mês
🍿 Filmes e Séries — 💰 R$ 90,00/mês
📺 TV por Assinatura — 💰 R$ 130,00/mês

✅ Internet rápida
✅ Estabilidade para todos os dispositivos
✅ Atendimento especializado

🕒 Horários:
Segunda a sexta: 08:00 às 20:00
Sábado: 08:00 às 17:00
Domingo: 09:00 às 12:00'
 WHERE coalesce(portal_promo_texto, '') = '';