import type { LandingFeatureDetailPagesMap } from "./types";

export const PT_DETAIL_PAGES: LandingFeatureDetailPagesMap = {
  "ai-order-concierge": {
    sections: [
      {
        body: "Mensagens de pedido variam em tom, ordem e campos faltando — cada entrada consome tempo. O concierge de IA lê KakaoTalk, SMS e anotações telefônicas, rascunha destinatário, janela de entrega, texto do cartão e valores sugeridos para revisão em vez de digitar do zero.",
      },
      {
        heading: "O que muda na loja",
        body: "No pico, o gargalo é conferir, não digitar. Padronizar campos primeiro reduz o ciclo de desligar e reabrir o chat para copiar e acha erros mais rápido, especialmente em pedidos urgentes.",
      },
      {
        heading: "Quem mais ganha",
        body: "Lojas com muito chat, repasse telefônico entre funcionários ou reentrada diária dos mesmos campos; mantém qualidade de intake quando o volume sobe.",
      },
    ],
  },
  "shop-sync": {
    sections: [
      {
        body: "Se Naver, Cafe24 e a loja ficam isolados, a equipe salta telas e duplica dados. A sincronização liga criação, pagamento e envio numa linha do tempo e reduz falhas.",
      },
      {
        heading: "Fluxo operacional",
        body: "Pedido novo → fila de produção → despacho/retirada → entregue encadeia sozinho; cada etapa registra quem segura o quê com as mesmas regras.",
      },
      {
        heading: "Impacto esperado",
        body: "Mesmo com mais canais, origem, status e backlog ficam visíveis; menos correria no fechamento e mais calma em fins de semana e datas especiais.",
      },
    ],
  },
  "smart-print-bridge": {
    sections: [
      {
        heading: "Além do A4: faixas longas",
        body: "Jatos domésticos não nasceram para bobinas longas. O streaming Floxync empurra o limite do hardware para banners de vários metros sem emendas grosseiras.",
      },
      {
        heading: "Controle fino de ribbon térmico",
        body: "Calor e tensão do ribbon são difíceis no navegador. A Floxync liga hardware térmico na hora e preserva a precisão típica de ribbon.",
      },
      {
        heading: "XPrint: o navegador comanda o hardware",
        body: "Cansado de drivers frágeis? O XPrint unifica aparelhos na web, sincroniza impressoras com um clique e busca saída fiel à prévia.",
      },
    ],
    ctaLinks: [
      {
        label: "Consulta de compra",
        href: `mailto:admin@floxync.com?subject=${encodeURIComponent("[Floxync] Consulta compra Smart Print Bridge")}`,
      },
      {
        label: "Quero ser testador",
        href: "/#test-user-apply",
      },
    ],
  },
  "ai-expense-magic": {
    sections: [
      {
        heading: "Despesas com um clique na foto",
        body: "Organizar recibos é chato. O OCR lê até amassados e borrados, separa loja, data, totais e IVA e grava linhas estruturadas no livro de despesas.",
      },
      {
        heading: "Classificação com contexto",
        body: "Não é só OCR: o modelo encaixa fornecedor e itens nas suas categorias — insumos florais, frete, consumíveis; o dono fotografa e a IA classifica.",
      },
      {
        heading: "Ligação ao motor de liquidação",
        body: "O gasto sincroniza na hora com o motor financeiro para ver margem real após custos; menos dor no imposto com pilhas de papel.",
      },
    ],
    ctaLinks: [
      {
        label: "Quero ser testador",
        href: "/#test-user-apply",
      },
      {
        label: "Fale conosco",
        href: `mailto:admin@floxync.com?subject=${encodeURIComponent("[Floxync] Consulta assistente de despesas IA")}`,
      },
    ],
  },
  "settlement-engine": {
    sections: [
      {
        body: "A receita sobe e o lucro não quando taxas, custo, frete e imposto são calculados separados. O motor fixa regras para que o mesmo pedido sempre feche igual, com menos oscilação no fim do mês.",
      },
      {
        heading: "Transparência",
        body: "Cada pedido decompõe “venda-custo-taxa-frete-imposto” para explicar onde a margem vazou; menos discussão entre dono e operações.",
      },
      {
        heading: "Relatórios",
        body: "Resumos dia/semana/mês e comparação por canal mostram quais tipos de pedido pagam; ajuste preço e promo com dados.",
      },
    ],
  },
  "mobile-premium": {
    sections: [
      {
        body: "Mobile Center Premium (Android) está em construção. Priorizamos fluxos de campo: checar pedidos, status e aprovações leves fora do balcão.",
      },
      {
        heading: "Plano de lançamento",
        body: "Inscreva-se como tester ou envie dúvidas para convite beta prioritário; avisaremos compatibilidade de aparelhos.",
      },
      {
        heading: "Roadmap",
        body: "Depois de estabilizar o núcleo, liberaremos notificações, aprovações, checklists de campo e guias de adoção em fases.",
      },
    ],
    ctaLinks: [
      {
        label: "Quero ser testador",
        href: "/#test-user-apply",
      },
      {
        label: "Fale conosco",
        href: `mailto:admin@floxync.com?subject=${encodeURIComponent("[Floxync] Consulta lançamento app Android")}`,
      },
    ],
  },
};
