import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, stepCountIs, tool, type UIMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider, getLovableAiGatewayRunId } from "@/lib/ai-gateway.server";
import { verificarAdmin } from "@/lib/assistente/auth.server";

/** Data/hora local do provedor (Brasil) para o contexto do modelo. */
function agoraBR() {
  return new Date().toLocaleString("pt-BR", { timeZone: "America/Maceio" });
}

const SISTEMA = `Você é o Assistente IA do Dominion Net, um provedor de internet FTTH.
Você conversa com o ADMINISTRADOR do provedor em português do Brasil.

Regras:
- Sempre consulte as ferramentas antes de responder qualquer pergunta sobre dados. Nunca invente números, nomes ou valores.
- Responda de forma curta, direta e falada — o texto também é lido em voz alta. Evite tabelas gigantes; prefira listas de até 10 itens e diga o total quando houver mais.
- Valores sempre em reais no formato R$ 1.234,56 e datas em dd/mm/aaaa.
- Quando o administrador pedir para abrir, filtrar, editar, ligar no WhatsApp ou gerar algo, chame a ferramenta "acao_no_sistema" para criar o botão de atalho, e diga em uma frase o que ele deve clicar.
- Quando faltar informação (por exemplo OLT, ONU e sinal óptico, que ainda não existem neste sistema), diga isso com clareza em vez de estimar.
- Data e hora atuais: ${agoraBR()}.`;

export const Route = createFileRoute("/api/assistente/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sessao = await verificarAdmin(request);
        if (!sessao) return new Response("Não autorizado", { status: 401 });

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("LOVABLE_API_KEY não configurada", { status: 500 });

        let messages: UIMessage[];
        try {
          const body = (await request.json()) as { messages?: unknown };
          if (!Array.isArray(body.messages)) return new Response("messages é obrigatório", { status: 400 });
          messages = body.messages as UIMessage[];
        } catch {
          return new Response("Corpo inválido", { status: 400 });
        }

        const c = await import("@/lib/assistente/consultas.server");

        const tools = {
          status_conexao: tool({
            description:
              "Situação de conexão dos clientes no MikroTik: quem está online, offline, e há quanto tempo sem conexão.",
            inputSchema: z.object({
              estado: z.enum(["online", "offline", "todos"]).optional(),
              minutosSemConexao: z.number().optional().describe("Só clientes offline há mais que N minutos"),
              limite: z.number().optional(),
            }),
            execute: async (args) => c.statusConexao(args),
          }),
          buscar_clientes: tool({
            description:
              "Busca clientes por nome, CPF/CNPJ, telefone, endereço, rua, bairro, cidade, login PPPoE ou plano. Retorna também o id do cliente, usado nas ações.",
            inputSchema: z.object({
              termo: z.string().optional(),
              status: z.string().optional().describe("ativo, bloqueado, cancelado ou inadimplente"),
              plano: z.string().optional(),
              limite: z.number().optional(),
            }),
            execute: async (args) => c.buscarClientes(args),
          }),
          parcelas_em_aberto: tool({
            description:
              "Mensalidades pendentes ou vencidas. Use periodo 'hoje' para vencimentos do dia e 'mes' para o mês atual.",
            inputSchema: z.object({
              periodo: z.enum(["hoje", "mes", "todas"]).optional(),
              incluirPagas: z.boolean().optional(),
              limite: z.number().optional(),
            }),
            execute: async (args) => c.parcelasEmAberto(args),
          }),
          inadimplentes: tool({
            description:
              "Clientes com mensalidades vencidas, agrupados, com quantidade de parcelas em atraso e total devido.",
            inputSchema: z.object({
              minimoParcelas: z.number().optional().describe("Ex.: 2 para quem tem mais de uma mensalidade atrasada"),
              limite: z.number().optional(),
            }),
            execute: async (args) => c.inadimplentes(args),
          }),
          resumo_financeiro: tool({
            description: "Faturamento recebido, a receber e em atraso de um mês (padrão: mês atual).",
            inputSchema: z.object({ ano: z.number().optional(), mes: z.number().optional() }),
            execute: async (args) => c.resumoFinanceiro(args),
          }),
          chamados: tool({
            description: "Chamados de suporte abertos, em andamento ou fechados, com totais por status.",
            inputSchema: z.object({ status: z.string().optional(), limite: z.number().optional() }),
            execute: async (args) => c.chamados(args),
          }),
          resumo_planos: tool({
            description: "Assinantes por plano, por status, ativações do mês e cancelamentos.",
            inputSchema: z.object({}),
            execute: async () => c.resumoPlanos(),
          }),
          resumo_rede: tool({
            description:
              "Infraestrutura FTTH: roteadores MikroTik conectados, CTOs com portas ocupadas e livres, e rotas de fibra.",
            inputSchema: z.object({}),
            execute: async () => c.resumoRede(),
          }),
          eventos_conexao: tool({
            description: "Histórico de quedas e reconexões vindas do MikroTik.",
            inputSchema: z.object({ clienteId: z.string().optional(), limite: z.number().optional() }),
            execute: async (args) => c.eventosConexao(args),
          }),
          acao_no_sistema: tool({
            description:
              "Cria um botão de atalho para o administrador executar uma ação na interface: abrir ficha, editar cadastro, abrir WhatsApp, ver no mapa, gerar carnê/2ª via, filtrar offline ou inadimplentes.",
            inputSchema: z.object({
              tipo: z.enum([
                "abrir_ficha",
                "editar_cliente",
                "whatsapp",
                "mapa",
                "segunda_via",
                "filtrar_offline",
                "filtrar_inadimplentes",
                "relatorio_inadimplencia",
              ]),
              clienteId: z.string().optional().describe("Obrigatório para ações de um cliente específico"),
              rotulo: z.string().describe("Texto curto do botão, ex.: 'Abrir ficha de João'"),
            }),
            execute: async (args) => ({ acao: args }),
          }),
        };

        const initialRunId = getLovableAiGatewayRunId(request);
        const gateway = createLovableAiGatewayProvider(apiKey, initialRunId);

        const result = streamText({
          model: gateway("google/gemini-3.6-flash"),
          system: SISTEMA,
          messages: await convertToModelMessages(messages),
          tools,
          stopWhen: stepCountIs(50),
        });

        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});
