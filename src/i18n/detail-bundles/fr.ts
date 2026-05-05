import type { LandingFeatureDetailPagesMap } from "./types";

export const FR_DETAIL_PAGES: LandingFeatureDetailPagesMap = {
  "ai-order-concierge": {
    sections: [
      {
        body: "Les messages clients varient en ton, ordre et champs manquants — chaque saisie fait perdre du temps. Le concierge IA lit KakaoTalk, SMS et notes téléphoniques, rédige destinataire, créneau, texte de carte et montants indicatifs pour que l’équipe vérifie plutôt que tout retaper.",
      },
      {
        heading: "Ce qui change en boutique",
        body: "Aux heures de pointe, le goulet est la vérification, pas la frappe. Normaliser d’abord les champs réduit la boucle raccrocher/réouvrir le chat pour copier-coller et accélère la détection des oublis, surtout sur les commandes urgentes.",
      },
      {
        heading: "Pour qui c’est le plus utile",
        body: "Magasins très chat, relais téléphoniques entre collègues ou ressaisies quotidiennes des mêmes champs ; la qualité d’intake reste plus stable quand le volume grimpe.",
      },
    ],
  },
  "shop-sync": {
    sections: [
      {
        body: "Si Naver, Cafe24 et la boutique sont déconnectés, l’équipe jongle entre écrans et ressaisit. La synchro relie création, paiement et livraison sur une même frise et limite les oublis.",
      },
      {
        heading: "Flux opérationnel",
        body: "Nouvelle commande → file production → dispatch/retrait → livré s’enchaîne seul ; chaque étape laisse une trace pour voir qui tient quoi avec les mêmes règles.",
      },
      {
        heading: "Impact attendu",
        body: "Même avec plus de canaux, source, statut et backlog restent lisibles ; moins de rush de clôture et plus de sérénité week-ends et pics saisonniers.",
      },
    ],
  },
  "smart-print-bridge": {
    sections: [
      {
        heading: "Au-delà de l’A4 : banderoles longues",
        body: "Les jetables grand public ne visent pas les très longues bandes. Le streaming Floxync repousse la limite matérielle pour des bannières multi-mètres sans ruptures grossières.",
      },
      {
        heading: "Contrôle fin du ruban thermique",
        body: "Chaleur et tension du ruban sont exigeantes depuis le navigateur. Floxync pilote le matériel thermique immédiatement et préserve la finesse propre au ruban.",
      },
      {
        heading: "XPrint : le navigateur pilote le matériel",
        body: "Marre des pilotes fragiles ? XPrint unifie les appareils sur le web, synchronise les imprimantes en un clic et vise une sortie fidèle à l’aperçu.",
      },
    ],
    ctaLinks: [
      {
        label: "Demande d’achat",
        href: `mailto:admin@floxync.com?subject=${encodeURIComponent("[Floxync] Demande d’achat Smart Print Bridge")}`,
      },
      {
        label: "Devenir testeur",
        href: "/#test-user-apply",
      },
    ],
  },
  "ai-expense-magic": {
    sections: [
      {
        heading: "Dépenses en une photo",
        body: "Classer les tickets est pénible. L’OCR lit même froissé et flou, sépare enseigne, date, totaux et TVA puis écrit des lignes structurées dans le livre des dépenses.",
      },
      {
        heading: "Classement contextuel",
        body: "Ce n’est pas que de l’OCR : le modèle rattache fournisseurs et lignes à vos catégories — matières, livraison, consommables ; le gérant photographie, l’IA classe.",
      },
      {
        heading: "Lien moteur de règlement",
        body: "La dépense synchronise tout de suite le moteur financier pour voir la marge réelle après coûts ; moins de stress fiscal avec des piles de tickets.",
      },
    ],
    ctaLinks: [
      {
        label: "Devenir testeur",
        href: "/#test-user-apply",
      },
      {
        label: "Nous contacter",
        href: `mailto:admin@floxync.com?subject=${encodeURIComponent("[Floxync] Question assistant dépenses IA")}`,
      },
    ],
  },
  "settlement-engine": {
    sections: [
      {
        body: "Le chiffre monte et la marge stagne quand commissions, coût, livraison et TVA sont calculés séparément. Le moteur fige des règles pour que la même commande se résolve toujours pareil, avec moins de dérive en fin de mois.",
      },
      {
        heading: "Transparence",
        body: "Chaque commande décompose « vente-coût-commission-livraison-taxe » pour expliquer où la marge a fui ; moins de débats entre dirigeant et terrain.",
      },
      {
        heading: "Reporting",
        body: "Synthèses jour/semaine/mois et comparaisons par canal montrent quels types de commande paient ; ajustez prix et promos avec des données.",
      },
    ],
  },
  "mobile-premium": {
    sections: [
      {
        body: "Mobile Center Premium (Android) est en construction. Nous priorisons les usages terrain : consulter commandes, statut et validations légères hors comptoir.",
      },
      {
        heading: "Calendrier de sortie",
        body: "Inscrivez-vous testeur ou écrivez-nous pour une invitation bêta prioritaire ; nous préciserons la compatibilité matérielle.",
      },
      {
        heading: "Feuille de route",
        body: "Après stabilisation du cœur, nous déploierons notifications, validations, checklists terrain et guides d’adoption par vagues.",
      },
    ],
    ctaLinks: [
      {
        label: "Devenir testeur",
        href: "/#test-user-apply",
      },
      {
        label: "Nous contacter",
        href: `mailto:admin@floxync.com?subject=${encodeURIComponent("[Floxync] Question lancement app Android")}`,
      },
    ],
  },
};
