export type LandingMessages = {
  navbar: {
    solutions: string;
    technology: string;
    network: string;
    testApply: string;
    manual: string;
    login: string;
    getStarted: string;
    mobileApp: string;
    dashboardNow: string;
    logoAlt: string;
  };
  hero: {
    status: string;
    line1: string;
    line2: string;
    line3: string;
    description: string;
    start: string;
    demo: string;
    manual: string;
    statStudios: string;
    statDaily: string;
    statRealtime: string;
    statStability: string;
    altBackground: string;
    altDashboard: string;
  };
  features: {
    badge: string;
    title: string;
    subtitle1: string;
    subtitle2: string;
    viewDetail: string;
    comingSoon: string;
    integratedBadge: string;
    integratedTitleLeft: string;
    integratedTitleHighlight: string;
    integratedDescription: string;
    integratedItem1: string;
    integratedItem2: string;
    integratedItem3: string;
  };
  testApply: {
    title: string;
    description: string;
    sectionUser: string;
    sectionOps: string;
    userLine1: string;
    userLine2: string;
    userLine3: string;
    userLine4: string;
    opsBody: string;
    successSub: string;
    name: string;
    business: string;
    contact: string;
    email: string;
    reason: string;
    notes: string;
    submit: string;
    sending: string;
    mailSend: string;
    policy: string;
    reasonPlaceholder: string;
    notesPlaceholder: string;
  };
  footer: {
    line1: string;
    line2: string;
    supportLine: string;
    officialMail: string;
    architecture: string;
    ecosystem: string;
    legal: string;
    coreEngine: string;
    aiModules: string;
    cloudPrinting: string;
    ribbonSupply: string;
    inkToners: string;
    hardwarePartner: string;
    terms: string;
    privacy: string;
    rights: string;
    securityStatus: string;
    apiStatus: string;
  };
  featureDetail: {
    back: string;
    capability: string;
    comingSoon: string;
    startFree: string;
    viewOthers: string;
  };
};

/** Ribbon printer + card design studio (ko/en bundles; other locales use English bundle in getMessages). */
export type DashboardMessages = {
  ribbon: Record<string, string>;
  designStudio: Record<string, string>;
};

export type AppMessages = {
  localeLabel: string;
  localeNames: Record<string, string>;
  landing: LandingMessages;
  dashboard: DashboardMessages;
};
