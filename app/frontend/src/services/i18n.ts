import { useState, useEffect } from "react";

export type ClientLanguage = "fr" | "ar";

export const clientTranslations = {
  fr: {
    // Navigation
    nav_home: "Accueil",
    nav_search: "Recherche",
    nav_atelier: "Atelier",
    nav_orders: "Commandes",
    nav_profile: "Profil",

    // Common & Actions
    app_name: "MAALEM",
    app_tagline: "L'Artisanat Marocain d'Exception",
    loading: "Chargement...",
    see_all: "Tout voir",
    explore: "Explorer",
    back: "Retour",
    close: "Fermer",
    confirm: "Confirmer",
    cancel: "Annuler",
    save: "Enregistrer",
    currency_mad: "MAD",
    currency_dh: "DH",

    // Home
    home_search_placeholder: "Rechercher des créations, artisans, matières...",
    home_hero_tag: "HÉRITAGE & LUXE",
    home_hero_ai_selection: "✦ AI Selection",
    home_hero_explore: "Explorer",
    home_score_max: "Score Max",
    home_tags_count: "Tags",
    home_mode: "Mode",
    home_swift_refresh: "Swift Refresh",
    home_recalc_ai: "Recalcul IA...",
    home_for_you: "✨ Pour vous",
    home_for_you_sub: "Sélection personnalisée selon vos goûts",
    home_discover_craft: "Découvrez l'artisanat marocain",
    home_discover_craft_sub: "Une immersion dans nos ateliers de création",
    home_trending: "Tendances actuelles",
    home_trending_sub: "Les pièces les plus convoitées en ce moment",
    home_limited_editions: "Éditions Limitées & Pièces Uniques",
    home_limited_editions_sub: "Des œuvres rares façonnées en petite série",
    home_limited_badge: "Édition Limitée",
    home_by_occasion: "Par Occasion",
    home_by_occasion_sub: "Trouvez la création idéale selon l'instant",
    home_tab_gifts: "Cadeaux",
    home_tab_home: "Maison",
    home_tab_cuisine: "Cuisine",
    home_soul_craft: "L'âme de l'artisanat marocain",
    home_fes_treasures: "Les trésors de Fès",
    home_city_honored: "Ville mise à l'honneur cette semaine",
    home_region_honored: "Région mise à l'honneur",
    home_explore_fes: "Explorer Fès",
    home_artisan_month: "Artisan du Mois",
    home_artisan_month_sub: "Rencontre avec nos maîtres créateurs",
    home_artisan_badge: "✦ Artisan d'Art",
    home_years_craft: "ans de métier",
    home_discover_atelier: "Découvrir son atelier",
    home_quote_inspire: "« Découvrez les créations qui font vivre le savoir-faire marocain. »",
    home_promo_ends: "Se termine dans",

    // Products & Cards
    product_on_demand: "Sur demande",
    product_order: "Commander",
    product_view: "Voir",
    product_in_your_style: "Dans votre style",
    product_ai_pick: "Sélection IA",
    product_add_favorite: "Ajouter aux favoris",
    product_remove_favorite: "Retirer des favoris",

    // Profile & Settings
    profile_title: "Mon Espace Client",
    profile_client_privilege: "Client Vork Privilège",
    profile_buyer_verified: "Compte Acheteur Vérifié",
    profile_wallet_title: "Mon Wallet Client Vork",
    profile_wallet_sub: "Solde disponible :",
    profile_wallet_badge: "Wallet Vork",
    profile_orders_count_badge: "Commandes",
    profile_favorites_count_badge: "Favoris",
    profile_orders: "Mes Commandes & Retours",
    profile_orders_sub: "Suivi Sendit, annulations et réclamations (15j)",
    profile_favorites: "Mes Créations Favorites",
    profile_favorites_sub_single: "article artisanal enregistré",
    profile_favorites_sub_multi: "articles artisanaux enregistrés",
    profile_addresses: "Adresses de Livraison",
    profile_addresses_sub: "Casablanca - Oasis · Maroc",
    profile_cmi: "Paiement & Sécurité CMI",
    profile_cmi_sub: "Certifié 3D Secure 2.0",
    profile_preferences_title: "Préférences & Langue",
    profile_language: "Langue de l'application",
    profile_lang_toggle_btn: "Français ⇄ العربية",
    profile_notifications: "Notifications push",
    profile_security: "Sécurité & Mot de passe",
    profile_logout: "Se Déconnecter",
    profile_login: "Se Connecter",

    // Orders & Tracking
    order_timeline_title: "Suivi de Commande",
    order_status_active: "Commandes en Cours",
    order_status_history: "Historique & Terminées",
    order_empty: "Aucune commande trouvée dans cet onglet.",
    order_number: "Commande N°",
    order_step_created: "Paiement",
    order_step_accepted: "Atelier",
    order_step_prep: "Fabrication",
    order_step_shipped: "Livraison",
    order_step_delivered: "Remis",
    order_workshop_heading: "🏺 État de l'Atelier & Parcours de Livraison",
    order_prep_photos_title: "Preuves de Préparation en Atelier (Art. 8.1)",
    order_prep_photos_subtitle: "Photos vérifiées prises par l'artisan avant expédition du colis.",
    order_sendit_tracking: "Numéro de suivi Sendit",
    order_view_waybill: "Voir BL",
    order_parcel_delivered: "✅ Colis remis au destinataire",
    order_parcel_delivered_sub: "La livraison a été confirmée. Utilisez les boutons pour valider la réception sous 24h ou signaler un incident.",
    order_action_confirm_reception: "✍️ Confirmer la Réception & Signer (Art. 11)",
    order_action_dispute: "⚖️ Ouvrir une Contestation / Vice Caché (Art. 15)",
    order_action_return: "📦 Demander un Retour (Délai légal 7 jours)",
    order_action_extension: "⏱️ Demander un Délai Supplémentaire (24h)",
    order_confirm_prompt: "Signature numérique du client attestant de la bonne réception du colis",

    // Wallet
    wallet_title: "Mon Wallet Vork",
    wallet_balance_label: "Solde disponible",
    wallet_pending_label: "En attente de virement",
    wallet_withdraw_btn: "Demander un virement RIB",
    wallet_transactions_title: "Dernières opérations",
    wallet_no_transactions: "Aucune transaction pour le moment",
    wallet_guarantee_title: "Protection Garantie Vork",
    wallet_guarantee_sub: "Fonds séquestrés et débloqués uniquement après votre entière validation (Art. 13).",

    // Search & Explore
    search_title: "Explorer le Savoir-Faire",
    search_recent: "Recherches récentes",
    search_by_craft: "Explorer par métier",
    search_collections: "Collections d'exception",
    search_results_title: "Résultats",
    search_no_results: "Aucun résultat trouvé pour votre recherche.",
    search_filter_all: "Tous les métiers",
    search_filters_btn: "Filtres",
    search_filter_reset: "Réinitialiser",
    search_filter_apply: "Appliquer",

    // Favorites
    favorites_title: "Mes Inspirations",
    favorites_count_single: "création sauvegardée",
    favorites_count_multi: "créations sauvegardées",
    favorites_empty_title: "Votre galerie est vide",
    favorites_empty_sub: "Parcourez les collections de nos Maâlems et cliquez sur le cœur pour ajouter une création.",
    favorites_explore_btn: "Découvrir des créations",

    // Notifications
    notif_title: "Centre de Notifications",
    notif_empty: "Aucune notification pour le moment.",
    notif_mark_all_read: "Tout marquer comme lu",

    // Auth
    auth_welcome_title: "MAALEM",
    auth_welcome_sub: "L'Artisanat Marocain d'Exception",
    auth_login_tab: "Connexion",
    auth_register_tab: "Inscription",
    auth_email_label: "Adresse Email",
    auth_password_label: "Mot de passe",
    auth_fullname_label: "Nom complet",
    auth_submit_login: "Se connecter",
    auth_submit_register: "Créer un compte",

    // Atelier
    atelier_title: "Artisanat Marocain Connecté",
    atelier_virtual_title: "L'Artisanat Virtuel",
    atelier_virtual_sub: "Associez l'élégance de la géométrie traditionnelle marocaine au raffinement de l'IA pour générer vos motifs uniques.",
    atelier_simulate_title: "Simuler une génération",
  },
  ar: {
    // Navigation
    nav_home: "الرئيسية",
    nav_search: "بحث",
    nav_atelier: "الورشة",
    nav_orders: "طلباتي",
    nav_profile: "حسابي",

    // Common & Actions
    app_name: "معلم",
    app_tagline: "فخامة وأصالة الصناعة التقليدية المغربية",
    loading: "جاري التحميل...",
    see_all: "عرض الكل",
    explore: "استكشاف",
    back: "رجوع",
    close: "إغلاق",
    confirm: "تأكيد",
    cancel: "إلغاء",
    save: "حفظ",
    currency_mad: "د.م",
    currency_dh: "د.م",

    // Home
    home_search_placeholder: "ابحث عن زربية، مجوهرات، فخار، نحاسيات...",
    home_hero_tag: "الأصالة المغربية الفاخرة",
    home_hero_ai_selection: "✦ مختارات الذكاء الاصطناعي",
    home_hero_explore: "استكشف المجموعة",
    home_score_max: "أعلى تقييم",
    home_tags_count: "الوسوم",
    home_mode: "النمط",
    home_swift_refresh: "تحديث فوري",
    home_recalc_ai: "إعادة احتساب الذكاء الاصطناعي...",
    home_for_you: "✨ خصيصاً لك",
    home_for_you_sub: "تشكيلة مفصلة وفق ذوقك واهتماماتك",
    home_discover_craft: "اكتشف روعة الحرف اليدوية المغربية",
    home_discover_craft_sub: "رحلة ملهمة عبر ورشات الإبداع والتراث الأصيل",
    home_trending: "القطع الأكثر طلباً ورواجاً",
    home_trending_sub: "روائع حرفية تلقى إقبالاً كبيراً في الوقت الحالي",
    home_limited_editions: "إصدارات محدودة وقطع فريدة",
    home_limited_editions_sub: "تحف نادرة مصاغة بإتقان في مجموعات صغيرة",
    home_limited_badge: "إصدار حصري محدود",
    home_by_occasion: "حسب المناسبة",
    home_by_occasion_sub: "اختر التحفة المغربية المثالية لكل لحظة ومناسبة",
    home_tab_gifts: "هدايا فاخرة",
    home_tab_home: "ديكور المنزل",
    home_tab_cuisine: "المائدة والضيافة",
    home_soul_craft: "روح وعراقة الصناعة التقليدية المغربية",
    home_fes_treasures: "كنوز ورموز مدينة فاس العريقة",
    home_city_honored: "المدينة المحتفى بها هذا الأسبوع",
    home_region_honored: "جهة تحت المجهر",
    home_explore_fes: "استكشاف فاس",
    home_artisan_month: "معلم الشهر المتميز",
    home_artisan_month_sub: "لقاء خاص مع كبار أساتذة الحرفة والإتقان",
    home_artisan_badge: "✦ صانع تقليدي معتمد",
    home_years_craft: "سنوات من الحرفة والإتقان",
    home_discover_atelier: "زيارة ورشة الصانع",
    home_quote_inspire: "« اكتشف إبداعات حية تجسد عراقة ومهارة الصانع المغربي الأصيل. »",
    home_promo_ends: "ينتهي العرض خلال",

    // Products & Cards
    product_on_demand: "عند الطلب",
    product_order: "طلب فوري",
    product_view: "عرض",
    product_in_your_style: "على ذوقك",
    product_ai_pick: "مختارات الذكاء الاصطناعي",
    product_add_favorite: "إضافة إلى المفضلة",
    product_remove_favorite: "إزالة من المفضلة",

    // Profile & Settings
    profile_title: "حساب الزبون",
    profile_client_privilege: "زبون مميز لدى ڤورك",
    profile_buyer_verified: "حساب مشترٍ موثق ورسمي",
    profile_wallet_title: "محفظتي المالية في ڤورك",
    profile_wallet_sub: "الرصيد المتاح :",
    profile_wallet_badge: "محفظة ڤورك",
    profile_orders_count_badge: "الطلبات",
    profile_favorites_count_badge: "المفضلة",
    profile_orders: "قائمة طلباتي والإرجاع",
    profile_orders_sub: "تتبع سينديت، الإلغاء وحماية المشتري (١٥ يوماً)",
    profile_favorites: "مختاراتي وقطعي المفضلة",
    profile_favorites_sub_single: "تحفة حرفية محفوظة",
    profile_favorites_sub_multi: "تحف حرفية محفوظة",
    profile_addresses: "عناوين التوصيل",
    profile_addresses_sub: "الدار البيضاء - الواحة · المغرب",
    profile_cmi: "الأداء وأمان مركز النقديات",
    profile_cmi_sub: "معتمد ومحمي بنظام 3D Secure 2.0",
    profile_preferences_title: "الإعدادات واللغة",
    profile_language: "لغة التطبيق (Langue)",
    profile_lang_toggle_btn: "العربية الفصحى ⇄ FR",
    profile_notifications: "الإشعارات والتنبيهات الفورية",
    profile_security: "الأمان وكلمة المرور",
    profile_logout: "تسجيل الخروج",
    profile_login: "تسجيل الدخول",

    // Orders & Tracking
    order_timeline_title: "مراحل إنجاز وتوصيل الطلب",
    order_status_active: "الطلبات الجارية",
    order_status_history: "سجل الطلبات المكتملة",
    order_empty: "لا توجد أي طلبات حالياً في هذا القسم.",
    order_number: "طلب رقم",
    order_step_created: "الأداء",
    order_step_accepted: "الورشة",
    order_step_prep: "الصنع",
    order_step_shipped: "الشحن",
    order_step_delivered: "التسليم",
    order_workshop_heading: "🏺 حالة الورشة ومسار التوصيل",
    order_prep_photos_title: "توثيق الصنع بالورشة قبل الشحن (المادة ٨.١)",
    order_prep_photos_subtitle: "صور حقيقية التقطها المعلم في ورشته توثق سلامة وجودة القطعة قبل التغليف.",
    order_sendit_tracking: "رقم التتبع لدى سينديت",
    order_view_waybill: "عرض بوليصة الشحن",
    order_parcel_delivered: "✅ تم تسليم الشحنة للزبون",
    order_parcel_delivered_sub: "تم تسجيل التسليم بنجاح. يرجى معاينة الشحنة وتأكيد الاستلام والتوقيع خلال ٢٤ ساعة.",
    order_action_confirm_reception: "✍️ تأكيد الاستلام والتوقيع الرقمي (المادة ١١)",
    order_action_dispute: "⚖️ فتح شكوى أو عيب خفي (المادة ١٥)",
    order_action_return: "📦 طلب إرجاع القطعة (مهلة ٧ أيام القانونية)",
    order_action_extension: "⏱️ طلب مهلة إضافية للمعاينة (٢٤ ساعة)",
    order_confirm_prompt: "التوقيع الرقمي للزبون تأكيداً لاستلام الشحنة بحالة ممتازة",

    // Wallet
    wallet_title: "محفظتي المالية في ڤورك",
    wallet_balance_label: "الرصيد المتوفر حالياً",
    wallet_pending_label: "في انتظار التحويل البنكي",
    wallet_withdraw_btn: "طلب تحويل إلى الحساب البنكي (RIB)",
    wallet_transactions_title: "سجل العمليات والمعاملات",
    wallet_no_transactions: "لا توجد معاملات مسجلة حتى الآن",
    wallet_guarantee_title: "ضمان حماية المشتري مع ڤورك",
    wallet_guarantee_sub: "أموالك محفوظة في حساب ضمان مؤمن ولا تُحوّل للصانع إلا بعد موافقتك الصريحة (المادة ١٣).",

    // Search & Explore
    search_title: "استكشاف إبداعات الحرف اليدوية",
    search_recent: "عمليات البحث الأخيرة",
    search_by_craft: "تصفح حسب الحرفة التقليدية",
    search_collections: "مجموعات استثنائية راقية",
    search_results_title: "نتائج البحث",
    search_no_results: "لم يتم العثور على أي قطعة مطابقة لبحثكم.",
    search_filter_all: "جميع الحرف التقليدية",
    search_filters_btn: "تصفية النتائج",
    search_filter_reset: "إعادة ضبط",
    search_filter_apply: "تطبيق التصفية",

    // Favorites
    favorites_title: "مختاراتي وقطعي المفضلة",
    favorites_count_single: "تحفة محفوظة",
    favorites_count_multi: "تحف حرفية محفوظة",
    favorites_empty_title: "قائمة المفضلة فارغة حالياً",
    favorites_empty_sub: "تصفح مجموعات معلمينا المميزين واضغط على رمز القلب لحفظ إبداعاتك المفضلة.",
    favorites_explore_btn: "استكشاف التحف الحرفية",

    // Notifications
    notif_title: "مركز التنبيهات والإشعارات",
    notif_empty: "لا توجد إشعارات جديدة حالياً.",
    notif_mark_all_read: "تحديد الكل كمقروء",

    // Auth
    auth_welcome_title: "معلم",
    auth_welcome_sub: "فخامة وأصالة الصناعة التقليدية المغربية",
    auth_login_tab: "تسجيل الدخول",
    auth_register_tab: "إنشاء حساب جديد",
    auth_email_label: "البريد الإلكتروني",
    auth_password_label: "كلمة المرور",
    auth_fullname_label: "الاسم الكامل",
    auth_submit_login: "دخول إلى الحساب",
    auth_submit_register: "إنشاء حساب الزبون",

    // Atelier
    atelier_title: "الصناعة التقليدية الرقمية التفاعلية",
    atelier_virtual_title: "الورشة التفاعلية الذكية",
    atelier_virtual_sub: "اجمع بين سحر الهندسة المغربية الأصيلة وقوة الذكاء الاصطناعي لابتكار زخارف وأنماط فريدة خاصة بك.",
    atelier_simulate_title: "محاكاة ابتكار النمط",
  },
};

export const STATUS_TRANSLATIONS: Record<string, { fr: string; ar: string }> = {
  en_attente_paiement: { fr: "En attente de paiement", ar: "في انتظار الأداء" },
  paiement_initie: { fr: "Paiement initié", ar: "جاري إتمام الأداء" },
  paiement_echoue: { fr: "Paiement échoué", ar: "تعذر إتمام الأداء" },
  acompte_verse: { fr: "Acompte versé (50%)", ar: "تم دفع العربون (50%)" },
  payee_integralement: { fr: "Payée intégralement", ar: "مدفوعة بالكامل" },
  en_preparation: { fr: "En fabrication chez le Maâlem", ar: "قيد الصنع بالورشة لدى المعلم" },
  en_cours_de_transport: { fr: "En cours de livraison Sendit", ar: "في طريق التوصيل مع سينديت" },
  livre: { fr: "Livrée à domicile", ar: "تم التوصيل إلى العنوان" },
  auto_valide: { fr: "Réception validée automatiquement", ar: "تم تأكيد الاستلام تلقائياً" },
  en_reclamation: { fr: "Litige ouvert (Escrow gelé)", ar: "شكوى مفتوحة (الضمان معلق)" },
  litige_post_liberation: { fr: "Litige post-libération (Remb. Vendeur)", ar: "نزاع لاحق (تعويض من الصانع)" },
  retour_initie: { fr: "Retour produit initié", ar: "جاري إرجاع الشحنة" },
  complete: { fr: "Terminée & Validée", ar: "مكتملة ومؤكدة بنجاح" },
  annulee: { fr: "Annulée", ar: "ملغاة" },
};

export const CATEGORY_TRANSLATIONS: Record<string, { fr: string; ar: string }> = {
  bijouterie: { fr: "Bijouterie & Joaillerie", ar: "المجوهرات والحلي الفضية" },
  ceramique: { fr: "Céramique & Poterie", ar: "الخزف والفخار التقليدي" },
  dinanderie: { fr: "Dinanderie & Cuivre", ar: "النحاسيات والمشغولات المعدنية" },
  tissage: { fr: "Tapis & Tissage", ar: "الزرابي والنسيج الأمازيغي" },
  broderie: { fr: "Broderie & Caftans", ar: "الطرز الفاسي والقفطان" },
  maroquinerie: { fr: "Maroquinerie & Cuir", ar: "المصنوعات الجلدية الأصيلة" },
  menuiserie: { fr: "Bois & Marqueterie", ar: "النقش على الخشب والعرعار" },
  poterie: { fr: "Poterie", ar: "الفخار التقليدي" },
  verrerie: { fr: "Verrerie d'Art", ar: "الزجاج الحرفي والمنفوخ" },
  zellige: { fr: "Zellige Fassi", ar: "الزليج الفاسي التقليدي" },
};

const CLIENT_LANG_KEY = "maalem_client_language";

export function getSavedClientLanguage(): ClientLanguage {
  if (typeof window === "undefined") return "fr";
  const saved = localStorage.getItem(CLIENT_LANG_KEY);
  return saved === "ar" ? "ar" : "fr";
}

export function setSavedClientLanguage(lang: ClientLanguage) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CLIENT_LANG_KEY, lang);
  applyClientDirection(lang);
  window.dispatchEvent(new CustomEvent("vork_client_langchange", { detail: lang }));
}

export function applyClientDirection(lang: ClientLanguage) {
  if (typeof document === "undefined") return;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = lang;
  if (lang === "ar") {
    document.body.classList.add("font-arabic");
  } else {
    document.body.classList.remove("font-arabic");
  }
}

export function getStatusLabel(status: string, lang: ClientLanguage = "fr"): string {
  if (STATUS_TRANSLATIONS[status]) {
    return STATUS_TRANSLATIONS[status][lang] || STATUS_TRANSLATIONS[status]["fr"];
  }
  return status;
}

export function getCategoryLabel(category: string, lang: ClientLanguage = "fr"): string {
  const clean = (category || "").toLowerCase();
  if (CATEGORY_TRANSLATIONS[clean]) {
    return CATEGORY_TRANSLATIONS[clean][lang] || CATEGORY_TRANSLATIONS[clean]["fr"];
  }
  return category;
}

export function formatPriceCurrency(price: any, lang: ClientLanguage = "fr"): string {
  const currencyStr = lang === "ar" ? "د.م" : "MAD";
  if (price === null || price === undefined) return lang === "ar" ? "عند الطلب" : "Sur demande";
  if (typeof price === "number") return `${price.toLocaleString(lang === "ar" ? "ar-MA" : "fr-FR")} ${currencyStr}`;
  const clean = String(price).replace(" DH", "").replace(" MAD", "").replace(" د.م", "").trim();
  return `${clean} ${currencyStr}`;
}

export function useClientI18n() {
  const [lang, setLang] = useState<ClientLanguage>(getSavedClientLanguage());

  useEffect(() => {
    applyClientDirection(lang);
    const handleLangChange = (e: any) => {
      const newLang = e.detail || getSavedClientLanguage();
      setLang(newLang);
    };
    window.addEventListener("vork_client_langchange", handleLangChange);
    return () => window.removeEventListener("vork_client_langchange", handleLangChange);
  }, [lang]);

  const changeLanguage = (newLang: ClientLanguage) => {
    setSavedClientLanguage(newLang);
    setLang(newLang);
  };

  const t = (key: keyof typeof clientTranslations["fr"]): string => {
    return clientTranslations[lang]?.[key] || clientTranslations["fr"][key] || key;
  };

  return {
    lang,
    isRTL: lang === "ar",
    changeLanguage,
    t,
    getStatusLabel: (status: string) => getStatusLabel(status, lang),
    getCategoryLabel: (category: string) => getCategoryLabel(category, lang),
    formatPrice: (price: any) => formatPriceCurrency(price, lang),
  };
}
