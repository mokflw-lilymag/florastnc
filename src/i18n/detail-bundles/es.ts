import type { LandingFeatureDetailPagesMap } from "./types";

export const ES_DETAIL_PAGES: LandingFeatureDetailPagesMap = {
  "ai-order-concierge": {
    sections: [
      {
        body: "Los mensajes de pedido cambian en tono, orden y campos faltantes; cada alta consume tiempo. El conserje IA lee KakaoTalk, SMS y notas telefónicas, redacta destinatario, ventana de entrega, texto de tarjeta e importes sugeridos para que el equipo revise en lugar de teclear desde cero.",
      },
      {
        heading: "Qué cambia en tienda",
        body: "En pico, el cuello de botella es verificar, no escribir. Al normalizar campos primero, se reduce el bucle de colgar y reabrir el chat para copiar y se detectan errores antes, sobre todo en pedidos urgentes.",
      },
      {
        heading: "Para quién encaja",
        body: "Tiendas con mucho chat, relevos telefónicos entre staff o reingreso diario de los mismos campos; mantiene calidad de intake al subir volumen.",
      },
    ],
  },
  "shop-sync": {
    sections: [
      {
        body: "Si Naver, Cafe24 y la tienda van desconectados, el personal salta entre pantallas y duplica datos. La sincronización une creación, pago y envío en una línea de tiempo y reduce fallos.",
      },
      {
        heading: "Flujo operativo",
        body: "Pedido nuevo → cola de producción → reparto/recogida → entregado se encadena solo; cada paso deja registro para ver quién lleva qué con las mismas reglas.",
      },
      {
        heading: "Impacto esperado",
        body: "Aunque crezcan los canales, origen, estado y pendientes se ven claros; menos apuro de cierre y más calma en fines de semana y picos festivos.",
      },
    ],
  },
  "smart-print-bridge": {
    sections: [
      {
        heading: "Más allá del A4: banners largos",
        body: "Las tintas domésticas no están pensadas para rollos largos. El streaming de Floxync empuja el límite del hardware para banners de varios metros sin cortes visibles.",
      },
      {
        heading: "Control fino de ribbon térmico",
        body: "Calor y tensión del ribbon son difíciles desde el navegador. Floxync arranca hardware térmico al instante y preserva la precisión propia del ribbon.",
      },
      {
        heading: "XPrint: el navegador manda en el hardware",
        body: "¿Cansado de drivers frágiles? XPrint unifica dispositivos en la web, sincroniza impresoras con un clic y busca salida fiel a la vista previa.",
      },
    ],
    ctaLinks: [
      {
        label: "Consulta de compra",
        href: `mailto:admin@floxync.com?subject=${encodeURIComponent("[Floxync] Consulta compra Smart Print Bridge")}`,
      },
      {
        label: "Solicitar beta tester",
        href: "/#test-user-apply",
      },
    ],
  },
  "ai-expense-magic": {
    sections: [
      {
        heading: "Gastos con una foto",
        body: "Ordenar tickets es tedioso. El OCR lee incluso arrugas y letras borrosas, separa comercio, fecha, totales e IVA y escribe líneas estructuradas en el libro de gastos.",
      },
      {
        heading: "Clasificación con contexto",
        body: "No es solo texto: el modelo asigna proveedores y partidas a tus categorías — materiales, envío, consumibles; el dueño fotografía y la IA archiva.",
      },
      {
        heading: "Enlace al motor de liquidación",
        body: "El gasto capturado se sincroniza al instante con el motor financiero para ver margen real tras costes; menos estrés fiscal acumulando papel.",
      },
    ],
    ctaLinks: [
      {
        label: "Solicitar beta tester",
        href: "/#test-user-apply",
      },
      {
        label: "Contacto",
        href: `mailto:admin@floxync.com?subject=${encodeURIComponent("[Floxync] Consulta asistente de gastos IA")}`,
      },
    ],
  },
  "settlement-engine": {
    sections: [
      {
        body: "Los ingresos suben y el beneficio no cuando comisiones, coste, envío e impuesto se calculan sueltos. El motor fija reglas para que el mismo pedido siempre cierre igual y haya menos deriva mensual.",
      },
      {
        heading: "Transparencia",
        body: "Cada pedido desglosa “venta-coste-comisión-envío-impuesto” para explicar dónde se fue el margen; menos debates entre dueño y operaciones.",
      },
      {
        heading: "Informes",
        body: "Resúmenes día/semana/mes y comparación por canal muestran qué tipos de pedido dejan margen; ajusta precios y promos con datos.",
      },
    ],
  },
  "mobile-premium": {
    sections: [
      {
        body: "Mobile Center Premium (Android) está en desarrollo. Priorizamos flujos de campo: revisar pedidos, estado y aprobaciones ligeras fuera del mostrador.",
      },
      {
        heading: "Plan de lanzamiento",
        body: "Apúntate como tester o escríbenos para invitación beta prioritaria; compartiremos compatibilidad de dispositivos.",
      },
      {
        heading: "Hoja de ruta",
        body: "Tras estabilizar el núcleo, añadiremos notificaciones, aprobaciones, listas de campo y guías de adopción por fases.",
      },
    ],
    ctaLinks: [
      {
        label: "Solicitar beta tester",
        href: "/#test-user-apply",
      },
      {
        label: "Contacto",
        href: `mailto:admin@floxync.com?subject=${encodeURIComponent("[Floxync] Consulta lanzamiento app Android")}`,
      },
    ],
  },
};
