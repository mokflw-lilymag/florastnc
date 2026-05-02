export type LandingMessages = {
  navbar: {
    solutions: string;
    technology: string;
    network: string;
    documentation: string;
    testApply: string;
    manual: string;
    login: string;
    getStarted: string;
    mobileApp: string;
    dashboardNow: string;
    languageLabel: string;
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
    businessColumn: string;
    partnerProgram: string;
    contactSales: string;
    contactLabel: string;
    printBridge: string;
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

export type LegalDocMessages = {
  backHome: string;
  effectiveDatePrefix: string;
  draftPart1: string;
  draftEmphasis1: string;
  draftPart2: string;
  draftEmphasis2: string;
  draftPart3: string;
  privacyMetaTitle: string;
  privacyMetaDescription: string;
  termsMetaTitle: string;
  termsMetaDescription: string;
  lastUpdatedDisplay: string;
};

export type LoginMessages = {
  logoAlt: string;
  tabLogin: string;
  tabRegister: string;
  titleLogin: string;
  titleRegister: string;
  email: string;
  password: string;
  forgotPassword: string;
  signingIn: string;
  signInSubmit: string;
  socialDivider: string;
  continueGoogle: string;
  mobileWarnBefore: string;
  mobileWarnBold: string;
  mobileWarnAfter: string;
  shopName: string;
  shopPlaceholder: string;
  ownerEmail: string;
  creatingAccount: string;
  registerSubmit: string;
  continueGoogleSignup: string;
  resetTitle: string;
  resetDescLine1: string;
  resetDescLine2: string;
  resetEmailLabel: string;
  resetHintLine1: string;
  resetHintAdmin: string;
  resetHintAfter: string;
  cancel: string;
  sendResetLink: string;
  toastResetEmailRequired: string;
  toastResetSent: string;
  toastResetSentDesc: string;
  toastSendFailed: string;
  errGoogleProvider: string;
  errGoogleRedirect: string;
  errGoogleSignInFailed: string;
  toastWelcome: string;
  toastWelcomeDesc: string;
  errInvalidCreds: string;
  errEmailNotConfirmed: string;
  errLoginFailed: string;
  toastSignupOk: string;
  toastSignupOkDesc: string;
  errSignupFailed: string;
  metaTitle: string;
  metaDescription: string;
};

/** Android Capacitor bottom nav + “More” sheet (all marketing locales). */
export type AndroidChromeMessages = {
  navAriaLabel: string;
  home: string;
  orders: string;
  delivery: string;
  customers: string;
  more: string;
  fabNewOrderAria: string;
  sheetTitle: string;
  sheetDescriptionSr: string;
  adminDesktopHint: string;
  tenant: {
    orgBoard: string;
    newOrder: string;
    reports: string;
    analytics: string;
    expenses: string;
    tax: string;
    inventory: string;
    products: string;
    externalOrders: string;
    marketing: string;
    designStudio: string;
    pos: string;
    settings: string;
    subscription: string;
  };
  admin: {
    newOrder: string;
    staff: string;
    checklist: string;
    tenants: string;
    billing: string;
    announcements: string;
    faqAi: string;
    platformMarketing: string;
    designTemplates: string;
    globalSettings: string;
    storeSettings: string;
  };
};

export type DashboardHeaderMessages = {
  displayLanguageAria: string;
  manualTitle: string;
  manualOpenAria: string;
  hqManualTitle: string;
};

export type RenewalReminderMessages = {
  title: string;
  bodyBefore: string;
  bodyAfter: string;
  close: string;
  viewSubscription: string;
};

/** Dashboard shell: header chrome + sidebar nav (all locales; es/pt/fr/de/ru may mirror en in JSON). */
export type DashboardCommonMessages = {
  header: {
    localeChanged: string;
    logoutSuccess: string;
    profile: string;
    settings: string;
    logout: string;
    admin: string;
    partner: string;
    hqAccount: string;
    subscriptionTitle: string;
    subscriptionMissing: string;
    subscriptionExpired: string;
    subscriptionRenew: string;
    subscriptionToday: string;
    /** Plan badge label, end date, days left — use {{label}}, {{date}}, {{days}} */
    subscriptionActiveCountdown: string;
  };
  /** Compact labels for mobile/desktop quick nav strip */
  quickNav: {
    home: string;
    newOrder: string;
    orders: string;
    ribbon: string;
    deliveryPickup: string;
    reports: string;
    expenses: string;
    inventory: string;
  };
  sidebar: {
    logout: string;
    menuOpen: string;
    menu: string;
    hqWorkMode: string;
    altStoreLogo: string;
    altBrandLogo: string;
    badgeAdmin: string;
    badgeHq: string;
    badgePartner: string;
    support: string;
    membershipUpgrade: string;
    getBenefits: string;
    checkPlan: string;
    groups: {
      adminOverview: string;
      adminOps: string;
      adminContent: string;
      adminSystem: string;
      hq: string;
      tenantHome: string;
      tenantOps: string;
      tenantMake: string;
      tenantGrowth: string;
      tenantStore: string;
    };
    hints: {
      adminOverview: string;
      hq: string;
      tenantHome: string;
      tenantOps: string;
      tenantMake: string;
      tenantStore: string;
    };
    links: {
      systemDashboard: string;
      staff: string;
      checklist: string;
      tenants: string;
      seed: string;
      organizations: string;
      billing: string;
      announcements: string;
      faq: string;
      promoMaster: string;
      templates: string;
      globalSettings: string;
      storeSettings: string;
      hqOverview: string;
      sharedProducts: string;
      branchExpenses: string;
      hqMaterials: string;
      hqBoard: string;
      home: string;
      newOrder: string;
      orders: string;
      delivery: string;
      crm: string;
      externalOrders: string;
      products: string;
      inventory: string;
      branchMaterials: string;
      suppliers: string;
      purchases: string;
      reports: string;
      analytics: string;
      expenses: string;
      tax: string;
      printer: string;
      designStudio: string;
      marketing: string;
      pos: string;
      settings: string;
      subscription: string;
    };
  };
};

export type ManualDrawerStep1 = {
  title: string;
  intro: string;
  item1Heading: string;
  item1Body: string;
  item2Heading: string;
  bridgeBefore: string;
  bridgeAfter: string;
};

export type ManualDrawerStep2 = {
  title: string;
  quote: string;
  taskHeading: string;
  taskBody: string;
  categoryTitle: string;
  categoryDesc: string;
  expenseTitle: string;
  expenseDesc: string;
};

export type ManualDrawerStep3 = {
  title: string;
  excelLine1: string;
  excelLine2: string;
  tableCol1: string;
  tableCol2: string;
  productRow: string;
  productMethod: string;
  accountRow: string;
  accountMethod: string;
};

export type ManualDrawerStep4 = {
  title: string;
  o1Label: string;
  o1Title: string;
  o1Desc: string;
  o2Label: string;
  o2Title: string;
  o2Desc: string;
  o3Label: string;
  o3Title: string;
  o3Desc: string;
};

export type ManualDrawerMessages = {
  triggerTitle: string;
  triggerShort: string;
  dialogLine1: string;
  dialogLine2: string;
  searchPlaceholder: string;
  quickStore: string;
  quickTask: string;
  quickExcel: string;
  step1: ManualDrawerStep1;
  step2: ManualDrawerStep2;
  step3: ManualDrawerStep3;
  step4: ManualDrawerStep4;
};

/** Ribbon printer + card design studio (ko/en bundles; other locales use English bundle in getMessages). */
export type DashboardMessages = {
  ribbon: Record<string, string>;
  designStudio: Record<string, string>;
};

/** Auto-generated flat keys (f00001…) for dashboard 주문·배송·CRM·외부발주 copy; vi–ru may mirror en. */
export type TenantFlowMessages = Record<string, string>;

export type AppMessages = {
  localeLabel: string;
  localeNames: Record<string, string>;
  legalDoc: LegalDocMessages;
  login: LoginMessages;
  androidChrome: AndroidChromeMessages;
  dashboardHeader: DashboardHeaderMessages;
  renewalReminder: RenewalReminderMessages;
  manualDrawer: ManualDrawerMessages;
  dashboardCommon: DashboardCommonMessages;
  tenantFlows: TenantFlowMessages;
  landing: LandingMessages;
  dashboard: DashboardMessages;
};
