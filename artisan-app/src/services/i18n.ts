import { useState, useEffect } from "react";

export type Language = "fr" | "ar";

export const translations = {
  fr: {
    // Navigation
    nav_home: "Atelier",
    nav_market: "Marché",
    nav_create: "Créer",
    nav_posts: "Mes Pièces",
    nav_profile: "Profil",

    // Headers
    header_workshop: "Atelier & Commandes",
    header_market: "Marché Sur-Mesure",
    header_posts: "Catalogue & Pièces",
    header_profile: "Profil Maâlem",
    header_refresh: "Actualiser",
    header_notifications: "Notifications",
    header_config: "Serveur",

    // Wallet & KPIs
    wallet_title: "PORTEFEUILLE MAÂLEM",
    wallet_escrow_badge: "★ Séquestre Vork",
    wallet_available: "Disponible",
    wallet_available_sub: "Virable sur RIB",
    wallet_guarantee: "En Garantie",
    wallet_escrow_sub: "Séquestré jusqu'à livraison",
    wallet_withdraw_prompt: "Demander un virement sur mon compte bancaire",
    wallet_withdraw_btn: "Demander Virement",
    wallet_total_sales: "Ventes Brutes",
    wallet_pending_orders: "Commandes Actives",

    // Orders & Dashboard
    orders_to_treat: "COMMANDES À TRAITER",
    orders_active_list: "COMMANDES EN ATELIER & TRANSIT",
    orders_empty: "Aucune commande en cours dans votre atelier.",
    order_action_accept: "Accepter",
    order_action_decline: "Décliner",
    order_action_prep: "4 Photos de Préparation",
    order_action_sendit: "Expédier Sendit",
    order_action_direct: "Livraison Directe",
    order_refuse: "Refuser",
    order_client: "Client",
    order_amount: "Montant",
    order_deadline: "Délai de confection",
    order_delay_notice: "Délai légal : 72h max pour accepter",
    order_days_confection: "jours de confection",

    // Order statuses
    status_acompte: "Acompte versé",
    status_payee: "Payée",
    status_acceptee: "Acceptée",
    status_en_atelier: "En atelier",
    status_transit: "En transit",
    status_livre: "Livré",
    status_terminee: "Terminée",
    status_cancelled: "Annulée",

    // Profile & Settings
    profile_vacation_mode: "Mode Congés / Pause",
    profile_vacation_desc: "Masquer temporairement vos pièces du catalogue",
    profile_vacation_active: "Atelier en Pause (Mode Congés)",
    profile_vacation_inactive: "Atelier Ouvert sur Vork",
    profile_vacation_msg_active: "Vos créations sont masquées de la marketplace client.",
    profile_vacation_msg_inactive: "Les clients peuvent commander vos créations en direct.",
    profile_vacation_resume: "Reprendre",
    profile_vacation_pause: "Mettre en Pause",
    profile_address: "Adresse Sendit",
    profile_address_none: "Non configurée",
    profile_rib: "RIB Virement",
    profile_rib_none: "Non configuré",
    profile_cgv: "Conditions Générales Vork",
    profile_cgv_sub: "Contrat plateforme Vork",
    profile_security: "Sécurité & Conformité",
    profile_security_sub: "Protection des données & Art. 15",
    profile_settings: "Paramètres & RIB",
    profile_settings_sub: "Adresse atelier Sendit, RIB bancaire",
    profile_logout: "Se Déconnecter",
    profile_experience: "ans d'exp.",
    profile_language: "Langue de l'interface",
    profile_account_legal: "Compte & Légal",
    profile_edit_coords: "Éditer les Coordonnées",
    profile_specialty_label: "Spécialité artisanale",
    profile_specialty_placeholder: "Ex: Céramique & Zellige Fassi",
    profile_pickup_label: "Adresse d'enlèvement (Sendit) *",
    profile_pickup_placeholder: "Ex: Atelier 14, Derb El Horra, Médina de Fès",
    profile_rib_label: "RIB Bancaire par défaut (24 chiffres) *",
    profile_rib_placeholder: "Ex: 230 780 000000000000000000",
    profile_bio_label: "Présentation / Bio de l'Atelier",
    profile_bio_placeholder: "Décrivez votre savoir-faire hérité...",
    profile_reviews_count: "avis",
    profile_stat_orders: "Commandes",
    profile_stat_acceptance: "Acceptation",
    profile_stat_rating: "Évaluation",
    profile_returns_shortcut: "Retours Atelier",
    profile_disputes_shortcut: "Litiges",
    profile_pending: "en attente",
    profile_open: "ouverts",
    profile_history: "Historique",
    profile_suspension_alert: "Compte suspendu",
    profile_suspended_until: "Jusqu'au",

    // Marketplace / Custom requests
    market_title: "Demandes Sur-Mesure",
    market_subtitle: "demandes en attente de devis",
    market_empty_title: "Aucune demande disponible.",
    market_empty_sub: "Les clients publient leurs commandes personnalisées ici.",
    market_cat_all: "Toutes",
    market_budget: "Budget client",
    market_delay: "Délai souhaité",
    market_propose_quote: "Proposer un Devis",
    market_quote_price: "Votre Prix Proposé (MAD) *",
    market_quote_days: "Délai de Confection (Jours) *",
    market_quote_note: "Note au client (matières, techniques)",
    market_submit_quote: "Envoyer le Devis",
    market_quote_sent: "Devis déjà transmis",

    // Posts & Catalog
    posts_active: "Actifs",
    posts_total: "Total",
    posts_avg_price: "Prix moyen",
    posts_title: "Mes Publications",
    posts_subtitle: "pièces en vitrine",
    posts_new_btn: "Nouveau",
    posts_empty_title: "Votre vitrine est vide.",
    posts_empty_sub: "Publiez votre première pièce pour attirer les clients.",
    posts_publish_first: "Publier ma première pièce",
    posts_status_active: "Actif",
    posts_status_hidden: "Masqué",
    posts_status_out_of_stock: "Rupture",

    // Notifications Center
    notif_center_title: "Centre de Notifications",
    notif_center_sub: "Alertes commandes, relances J+2, litiges 48h et virements",
    notif_filter_all: "Toutes",
    notif_filter_orders: "Commandes",
    notif_filter_disputes: "Litiges & Retours",
    notif_filter_wallet: "Virements",
    notif_empty: "Aucune notification pour le moment.",

    // Returns Workshop (Art. 13)
    returns_banner_title: "Retours Clients 7 jours & Forclusion (Art. 13)",
    returns_banner_desc: "L'acheteur a 10j (+7j tolérance) pour déposer le colis. À réception dans votre atelier, vous avez 48h (J+2) pour inspecter la pièce et valider le remboursement (Art. 13.6).",
    returns_empty: "Aucune demande de retour client en cours.",
    returns_dossier: "Dossier Retour #",
    returns_confirm_btn: "Valider Réception & Conformité",
    returns_confirm_prompt: "Confirmez-vous la bonne réception et la conformité du produit retourné dans votre atelier ?",
    returns_tracking_carrier: "Transporteur retour :",

    // Disputes Workshop (Art. 20)
    disputes_banner_title: "Médiation & Défense Contradictoire sous 48h (Art. 20)",
    disputes_banner_desc: "En cas de réclamation client (Non-réception, vice caché 3 mois, non-conformité), transmettez vos explications d'atelier et vos photos pour l'arbitrage Vork.",
    disputes_empty: "Aucun litige en cours pour votre atelier.",
    disputes_dossier: "Litige #",
    disputes_reply_btn: "Répondre & Fournir Preuves (48h)",
    disputes_order_label: "Commande #",
    disputes_type_label: "Type :",
    disputes_client_reason: "Motif client :",
    disputes_artisan_reply: "Votre réponse :",

    // Modals
    create_post_title: "Publier une Création",
    create_post_subtitle: "Votre pièce sera visible sur la marketplace Vork",
    create_title_label: "Titre de la création *",
    create_title_placeholder: "Ex: Tapis Zanafi Laine Pure",
    create_category_label: "Catégorie d'artisanat *",
    create_description_label: "Description détaillée de l'œuvre *",
    create_photo_label: "Photo principale (URL ou Fichier) *",
    create_lead_time_label: "Délai de fabrication si sur commande (jours)",
    create_net_price: "Votre prix NET (MAD) *",
    create_client_price: "Prix affiché client :",
    create_commission_notice: "+5% commission Vork HT et 20% TVA sur commission",
    create_submit: "Publier au Catalogue",
    create_type_label: "Type de commande *",
    create_type_standard: "🚚 Standard (Sendit)",
    create_type_custom: "✍️ Sur Mesure",
    create_breakdown_title: "Décomposition du prix",
    create_breakdown_net: "Votre prix net artisan",
    create_breakdown_commission: "Commission Vork (5% HT)",
    create_breakdown_tva: "TVA sur commission (20%)",
    create_breakdown_client: "Prix affiché client TTC",
    create_submitting: "Publication…",
    create_submit_btn: "Publier sur Vork",
    create_desc_placeholder: "Décrivez les matériaux naturels (cuir végétal, argile de Fès), la technique traditionnelle…",

    // CGV
    cgv_title: "CGV & Contrat Plateforme",
    cgv_sub: "Conditions Générales de la Plateforme Vork Artisanat",
    cgv_art5_title: "Art. 5.1 & 7 — Commandes & Validation < 72h",
    cgv_art5_desc: "L'artisan s'engage à accepter ou refuser toute commande sous 72 heures. En cas de refus, un motif valable doit être spécifié.",
    cgv_art8_title: "Art. 8.1 & 11.2 — Photos de Confection",
    cgv_art8_desc: "Un minimum de 4 photos d'atelier démontrant la réalisation artisanale est obligatoire avant d'initier toute expédition.",
    cgv_art11_title: "Art. 11.4 & 11.5 — Modes de Livraison",
    cgv_art11_sendit_label: "Sendit : Photo du bordereau de livraison tamponné obligatoire.",
    cgv_art11_direct_label: "Livraison Directe : Photo du bordereau signé de la main du client requise.",
    cgv_commission_title: "Commission & TVA Plateforme",
    cgv_commission_desc: "L'artisan définit son prix net. Vork applique une commission de 5% HT sur ce montant + 20% de TVA appliquée exclusivement sur la commission.",
    cgv_art15_title: "Art. 15 — Séquestre & Libération des Fonds",
    cgv_art15_desc: "Les fonds restent bloqués en séquestre pendant la fabrication puis libérés sur le solde disponible à la confirmation de livraison (+7j légaux rétractation).",
    cgv_understood_btn: "J'ai compris et j'accepte les CGV",

    // Shipping & Delivery
    shipping_sendit_title: "Expédition Sendit (Art. 11.2)",
    shipping_sendit_step1: "Étape 1 : Générer Bordereau A4",
    shipping_sendit_step2: "Étape 2 : Photo Colis avec Bordereau Collé",
    shipping_sendit_download: "Télécharger Bordereau PDF",
    shipping_sendit_confirm: "Confirmer Ramassage Sendit",
    shipping_direct_title: "Livraison Directe par le Maâlem",
    shipping_direct_desc: "Transport personnalisé assuré par vos soins",
    shipping_direct_duration: "Durée estimée de livraison (jours)",
    shipping_direct_signature: "Signature ou Preuve de réception",
    shipping_direct_confirm: "Confirmer la Livraison Client",

    // Prep Photos
    prep_photos_title: "4 Photos de Préparation (Art. 11.1)",
    prep_photos_desc: "Preuve obligatoire de finition et d'emballage avant toute remise au transporteur",
    prep_photo_front: "1. Vue globale de face",
    prep_photo_detail: "2. Détail de finition / poinçon",
    prep_photo_wrap: "3. Protection / emballage",
    prep_photo_box: "4. Colis fermé prêt",
    prep_photos_submit: "Enregistrer les 4 Photos",

    // Withdrawals
    withdrawal_modal_title: "Demande de Virement RIB",
    withdrawal_available_label: "Solde disponible :",
    withdrawal_amount_label: "Montant à virer (MAD) *",
    withdrawal_rib_label: "RIB Bancaire marocain (24 chiffres) *",
    withdrawal_friday_notice: "Traitement groupé automatique chaque Vendredi à 10h00",
    withdrawal_submit: "Confirmer la Demande de Virement",

    // Refusal
    refuse_modal_title: "Refuser la Commande",
    refuse_modal_desc: "Selon l'Art. 6.4, un motif explicatif est obligatoire",
    refuse_reason_label: "Motif du refus (rupture de matière, délai insuffisant...)",
    refuse_submit: "Confirmer le Refus",

    // Auth Maâlem
    auth_welcome_title: "ESPACE MAÂLEM",
    auth_welcome_sub: "Plateforme Vork — Artisanat Marocain d'Exception",
    auth_login_tab: "Connexion Artisan",
    auth_register_tab: "Rejoindre en tant que Maâlem",
    auth_fullname_label: "Nom complet du Maâlem",
    auth_workshop_label: "Nom de l'Atelier / Coopérative",
    auth_specialty_label: "Spécialité artisanale (Céramique, Cuir, Tapis...)",
    auth_city_label: "Ville de l'Atelier",
    auth_email_label: "Adresse Email Professionnelle",
    auth_password_label: "Mot de passe",
    auth_submit_login: "Accéder à mon Atelier",
    auth_submit_register: "Créer mon Compte Artisan",
    auth_secure_note: "Espace professionnel sécurisé & données protégées",

    // Order progress steps
    order_number: "Commande #",
    order_count_suffix: "commandes — ordre chronologique",
    order_pending_validation: "à valider",
    order_type_sendit: "Expédition Sendit",
    order_type_direct: "Livraison Directe",
    step_pending: "① À valider",
    step_accepted: "① ✓ Acceptée",
    step_photos_done: "② ✓ Photos",
    step_photos_pending: "② 4 Photos",
    step_shipped: "③ ✓ Livré",
    step_in_transit: "③ Transit",
    step_shipping: "③ Expédition",
    order_accepting: "En cours...",
    order_accept_action: "Accepter < 72h",
    order_photos_upload_cta: "Uploader 4 photos d'atelier (Art. 8.1)",
    order_generate_sendit: "Générer le Bon Sendit",
    order_declare_direct: "Déclarer Livraison Directe",
    order_validate_signed: "Valider avec Bordereau Signé (Art. 11.5)",
    order_download_label: "Télécharger l'étiquette Sendit",

    // Posts card actions
    posts_price_net: "net",
    posts_days_confection: "j confection",
    posts_edit_btn: "Modifier",
    posts_show_btn: "Afficher",
    posts_hide_btn: "Masquer",

    // Notifications
    notif_view_file: "Voir le dossier",

    // Marketplace
    market_cat_cuivre: "Cuivre",
    market_cat_zellige: "Zellige",
    market_cat_tapis: "Tapis",
    market_cat_cuir: "Cuir",
    market_cat_bois: "Bois",
    market_cat_textile: "Textile",
    market_cat_ceramique: "Céramique",
    market_quotes_count: "devis proposé(s)",
    market_note_placeholder: "Expliquez votre approche artisanale…",
    market_quote_edit: "Modifier mon devis",

    // Returns
    returns_order_ref: "Commande #",
    returns_mode_sendit: "Sendit Express (35 MAD déduits)",
    returns_mode_own: "Propres Moyens Client",
    returns_forclusion: "Forclusion active. Si non retourné sous 17j, les fonds vous restent acquis.",

    // Disputes
    disputes_arbitration_label: "⚖️ Décision d'Arbitrage Officielle (Art. 20.5) :",
    disputes_edit_defense: "Modifier ma Défense",

    // Profile badges & footer
    profile_verified_badge: "Maâlem Vérifié Vork",
    profile_partner_badge: "Artisan Partenaire",
    profile_footer: "Plateforme Vork · Espace Artisans du Maroc",

    // Auth errors & placeholders
    auth_error_required: "Veuillez renseigner tous les champs obligatoires.",
    auth_error_password_length: "Le mot de passe doit comporter au moins 6 caractères.",
    auth_error_invalid: "Identifiants invalides.",
    auth_success_created: "Compte créé avec succès ! Connectez-vous.",
    auth_error_signup: "Erreur lors de la création du compte.",
    auth_error_server: "Erreur de connexion au serveur.",
    auth_footer: "MAÂLEM PRO · Plateforme Vork de l'Artisanat Marocain",
    auth_placeholder_name: "Ex: Maâlem Abdelkader Idrissi",
    auth_placeholder_workshop: "Ex: Atelier Céramique Majorelle",
    auth_placeholder_specialty: "Zellige, Cuir...",

    // Withdrawal Modal
    withdrawal_error_amount: "Montant de retrait invalide ou supérieur au solde disponible.",
    withdrawal_error_rib: "Le RIB marocain doit comporter exactement 24 chiffres.",
    withdrawal_digits: "chiffres",

    // Sendit Shipping Modal
    sendit_step_of: "Étape {n} sur 2 · Commande",
    sendit_pickup_city: "Ville Ramassage (Atelier)",
    sendit_delivery_city: "Ville Livraison (Client)",
    sendit_pickup_address: "Adresse précise de ramassage",
    sendit_pickup_placeholder: "Ex: Atelier 14, Derb El Horra, Médina",
    sendit_generate_bl: "Générer le Bon de Livraison (BL)",
    sendit_package_photo_label: "Photo du colis avec étiquette Sendit collée (Art. 11.2) *",
    sendit_take_photo: "Prendre en photo ou uploader le colis",
    sendit_file_hint: "PNG, JPG jusqu'à 5 Mo",

    // Refuse Order Modal
    refuse_order_ref: "Commande",
    refuse_reason_placeholder: "Ex: Atelier surchargé jusqu'à la fin du mois, rupture de matières...",

    // Prep Photos Modal
    prep_order_ref: "Commande N°",
    prep_cgv_rule: "Règle CGV Art. 11.1 :",
    prep_instruction: "Prenez ou importez 4 photos d'atelier de confection",
    prep_take_photo: "Prendre / Choisir Photo",
    prep_add_file: "Fichier",
    prep_url_placeholder: "Ou URL de la photo...",
    prep_add_btn: "Ajouter",

    // Dispute Reply Modal
    dispute_reply_label: "Vos explications et contre-arguments d'atelier *",
    dispute_reply_placeholder: "Décrivez la fabrication, les finitions, la conformité de la pièce livrée…",
    dispute_evidence_label: "Photos justificatives d'atelier (Max 3)",
    dispute_take_photo: "Prendre en photo ou choisir un fichier",
    dispute_url_placeholder: "Ou coller une URL d'image…",
    dispute_add_btn: "Ajouter",
    dispute_submit_btn: "Transmettre ma Défense à l'Arbitrage",

    // Direct Delivery Modal
    direct_order_label: "Commande",
    direct_rule_9_3: "Règle Art. 9.3 :",
    direct_rule_9_3_text: "Les produits sur-mesure et fragiles sont livrés directement par l'artisan sans passer par Sendit.",
    direct_start_btn: "Déclarer l'Expédition Directe",
    direct_rule_11_5: "Règle Art. 11.5 :",
    direct_rule_11_5_text: "Lors de la remise physique en main propre, faites signer votre bordereau papier par l'acheteur et uploadez la photo ci-dessous pour libérer vos fonds de séquestre.",
    direct_take_photo: "Prendre en photo ou uploader le bordereau signé",
    direct_file_hint: "PNG, JPG jusqu'à 5 Mo",

    // Header
    header_vacation_paused: "Congés",

    // Common
    cancel: "Annuler",
    save: "Enregistrer",
    close: "Fermer",
    loading: "Chargement...",
    saving: "Sauvegarde...",
    currency_mad: "MAD",
  },
  ar: {
    // Navigation
    nav_home: "الورشة",
    nav_market: "السوق",
    nav_create: "نشر عمل",
    nav_posts: "معروضاتي",
    nav_profile: "حسابي",

    // Headers
    header_workshop: "الورشة والطلبات",
    header_market: "سوق الطلبات الخاصة",
    header_posts: "كتالوج المعروضات",
    header_profile: "الملف المهني للمعلم",
    header_refresh: "تحديث",
    header_notifications: "الإشعارات",
    header_config: "الخادم",

    // Wallet & KPIs
    wallet_title: "محفظة المعلم المالية",
    wallet_escrow_badge: "★ ضمان فورك البنكي",
    wallet_available: "الرصيد المتاح",
    wallet_available_sub: "جاهز للتحويل إلى الحساب",
    wallet_guarantee: "تحت الضمان",
    wallet_escrow_sub: "محجوز حتى استلام الزبون",
    wallet_withdraw_prompt: "طلب تحويل الأرباح إلى الحساب البنكي",
    wallet_withdraw_btn: "طلب تحويل بنكي",
    wallet_total_sales: "إجمالي المبيعات",
    wallet_pending_orders: "طلبات قيد الإنجاز",

    // Orders & Dashboard
    orders_to_treat: "طلبات جديدة بانتظار الموافقة",
    orders_active_list: "طلبات قيد الصنع والشحن",
    orders_empty: "لا توجد طلبات جارية حالياً في ورشتك.",
    order_action_accept: "قبول والبدء",
    order_action_decline: "اعتذار",
    order_action_prep: "٤ صور لتوثيق الجاهزية",
    order_action_sendit: "الشحن عبر سينديت",
    order_action_direct: "توصيل مباشر من المعلم",
    order_refuse: "اعتذار عن الطلب",
    order_client: "الزبون",
    order_amount: "المبلغ",
    order_deadline: "مدة الصنع والإعداد",
    order_delay_notice: "المهلة القانونية: ٧٢ ساعة كحد أقصى للرد",
    order_days_confection: "أيام للصنع والتجهيز",

    // Order statuses
    status_acompte: "تم دفع العربون",
    status_payee: "مدفوعة بالكامل",
    status_acceptee: "مقبولة",
    status_en_atelier: "قيد الصنع بالورشة",
    status_transit: "في طريق التوصيل",
    status_livre: "تم التسليم بنجاح",
    status_terminee: "مكتملة",
    status_cancelled: "ملغى",

    // Profile & Settings
    profile_vacation_mode: "وضع العطلة / التوقف المؤقت",
    profile_vacation_desc: "إخفاء المعروضات مؤقتاً من السوق أثناء الإجازة",
    profile_vacation_active: "الورشة في وضع التوقف المؤقت (عطلة)",
    profile_vacation_inactive: "الورشة مفتوحة ونشطة على منصة فورك",
    profile_vacation_msg_active: "قطعك الفنية مخفية مؤقتاً عن الزبائن.",
    profile_vacation_msg_inactive: "يمكن للزبائن طلب قطعك وإرسال التكليفات في أي وقت.",
    profile_vacation_resume: "استئناف النشاط",
    profile_vacation_pause: "تفعيل وضع العطلة",
    profile_address: "عنوان استلام سينديت",
    profile_address_none: "غير محدد",
    profile_rib: "الحساب البنكي (RIB)",
    profile_rib_none: "غير مسجل",
    profile_cgv: "الشروط العامة لمنصة فورك",
    profile_cgv_sub: "العقد والشروط التنظيمية لمنصة فورك",
    profile_security: "الأمان والامتثال القانوني",
    profile_security_sub: "حماية البيانات الشخصية والمادة ١٥",
    profile_settings: "بيانات الورشة والحساب البنكي",
    profile_settings_sub: "عنوان استلام الطرود ورقم الحساب للتحويلات",
    profile_logout: "تسجيل الخروج",
    profile_experience: "سنوات خبرة",
    profile_language: "لغة التطبيق",
    profile_account_legal: "الحساب والشؤون القانونية",
    profile_edit_coords: "تعديل البيانات والعناوين",
    profile_specialty_label: "الحرفة أو التخصص اليدوي",
    profile_specialty_placeholder: "مثال: الفخار والزليج الفاسي التقليدي",
    profile_pickup_label: "عنوان استلام الطرود (سينديت) *",
    profile_pickup_placeholder: "مثال: الورشة رقم ١٤، درب الحرة، المدينة القديمة، فاس",
    profile_rib_label: "رقم الحساب البنكي الافتراضي (٢٤ رقماً) *",
    profile_rib_placeholder: "مثال: 230 780 000000000000000000",
    profile_bio_label: "نبذة تعريفية عن الورشة والحرفة",
    profile_bio_placeholder: "اكتب نبذة عن تاريخ صنعتك وما تتميز به أعمالك...",
    profile_reviews_count: "تقييمات",
    profile_stat_orders: "إجمالي الطلبات",
    profile_stat_acceptance: "نسبة القبول",
    profile_stat_rating: "التقييم العام",
    profile_returns_shortcut: "مرتجعات الورشة",
    profile_disputes_shortcut: "النزاعات والملاحظات",
    profile_pending: "بانتظار المعاينة",
    profile_open: "مفتوحة",
    profile_history: "السجل السابق",
    profile_suspension_alert: "الحساب موقوف مؤقتاً",
    profile_suspended_until: "حتى تاريخ",

    // Marketplace / Custom requests
    market_title: "سوق الطلبات الخاصة والتفصيل",
    market_subtitle: "طلبات من الزبائن بانتظار عروض الأسعار",
    market_empty_title: "لا توجد طلبات خاصة حالياً.",
    market_empty_sub: "ينشر الزبائن طلباتهم المخصصة هنا، تفقد السوق قريباً.",
    market_cat_all: "جميع الأصناف",
    market_budget: "ميزانية الزبون المقترحة",
    market_delay: "المهلة الزمنية المطلوبة",
    market_propose_quote: "تقديم عرض سعر وميعاد",
    market_quote_price: "سعرك المقترح الصافي (درهم) *",
    market_quote_days: "مدة الإنجاز والتصنيع (بالأيام) *",
    market_quote_note: "ملاحظات وتفاصيل المواد والتقنيات",
    market_submit_quote: "إرسال عرض السعر للزبون",
    market_quote_sent: "تم إرسال عرضك بنجاح",

    // Posts & Catalog
    posts_active: "نشطة ومعروضة",
    posts_total: "المجموع",
    posts_avg_price: "متوسط السعر",
    posts_title: "معروضاتي في الكتالوج",
    posts_subtitle: "قطع تقليدية معروضة للبيع",
    posts_new_btn: "إضافة قطعة",
    posts_empty_title: "معرض أعمالك فارغ حالياً.",
    posts_empty_sub: "انشر أول قطعة تقليدية لجذب الزبائن وتلقي الطلبات.",
    posts_publish_first: "نشر أول قطعة الآن",
    posts_status_active: "معروضة للبيع",
    posts_status_hidden: "مخفية مؤقتاً",
    posts_status_out_of_stock: "نفذت الكمية",

    // Notifications Center
    notif_center_title: "مركز الإشعارات والتنبيهات",
    notif_center_sub: "تنبيهات الطلبات، تذكيرات الـ ٤٨ ساعة والتحويلات البنكية",
    notif_filter_all: "الكل",
    notif_filter_orders: "الطلبات",
    notif_filter_disputes: "النزاعات والمرتجعات",
    notif_filter_wallet: "التحويلات المالية",
    notif_empty: "لا توجد إشعارات جديدة في الوقت الحالي.",

    // Returns Workshop (Art. 13)
    returns_banner_title: "مرتجعات الزبائن خلال ٧ أيام (المادة ١٣)",
    returns_banner_desc: "يحق للزبون إرجاع القطع المعيارية خلال ٧ أيام. عند استلام القطعة في ورشتك، لديك مهلة ٤٨ ساعة للمعاينة والتأكيد (المادة ١٣.٦).",
    returns_empty: "لا توجد طلبات إرجاع جارية للورشة.",
    returns_dossier: "ملف الإرجاع رقم #",
    returns_confirm_btn: "تأكيد الاستلام ومطابقة القطعة",
    returns_confirm_prompt: "هل تؤكد استلام القطعة المرتجعة بسلام ومطابقتها للمواصفات في ورشتك؟",
    returns_tracking_carrier: "شركة التوصيل المعتمدة:",

    // Disputes Workshop (Art. 20)
    disputes_banner_title: "الوساطة والدفاع خلال ٤٨ ساعة (المادة ٢٠)",
    disputes_banner_desc: "في حال وجود شكوى من الزبون، يمكنك تقديم دفوعات الورشة والصور التوضيحية لتحكيم فريق فورك وحماية حقوقك.",
    disputes_empty: "لا توجد نزاعات مفتوحة تخص ورشتك حالياً.",
    disputes_dossier: "النزاع رقم #",
    disputes_reply_btn: "الرد وتقديم الأدلة (مهلة ٤٨ ساعة)",
    disputes_order_label: "الطلب رقم #",
    disputes_type_label: "نوع النزاع:",
    disputes_client_reason: "سبب شكوى الزبون:",
    disputes_artisan_reply: "رد الورشة المعتمد:",

    // Modals
    create_post_title: "نشر قطعة تقليدية جديدة",
    create_post_subtitle: "ستعرض قطعتك لجميع زبائن فورك",
    create_title_label: "عنوان القطعة الحرفية *",
    create_title_placeholder: "مثال: زربية زنافي من الصوف الخالص منسوجة يدوياً",
    create_category_label: "صنف الصناعة التقليدية *",
    create_description_label: "وصف تفصيلي للقطعة والمواد المستخدمة *",
    create_photo_label: "رابط أو مسار الصورة الرئيسية *",
    create_lead_time_label: "مدة الصنع عند الطلب (بالأيام)",
    create_net_price: "المبلغ الصافي لك (درهم) *",
    create_client_price: "السعر النهائي للزبون:",
    create_commission_notice: "يشمل ٥٪ عمولة المنصة و٢٠٪ ضريبة القيمة المضافة على العمولة",
    create_submit: "نشر بالكتالوج الرسمي",
    create_type_label: "نوع الطلب أو العرض *",
    create_type_standard: "🚚 جاهز للشحن (Sendit)",
    create_type_custom: "✍️ صياغة حسب الطلب",
    create_breakdown_title: "تفصيل وتوزيع السعر",
    create_breakdown_net: "سعرك الصافي كمعلم",
    create_breakdown_commission: "عمولة منصة فورك (٥٪ دون ضريبة)",
    create_breakdown_tva: "الضريبة على العمولة (٢٠٪)",
    create_breakdown_client: "السعر المعروض للزبون شامل الرسوم",
    create_submitting: "جاري النشر...",
    create_submit_btn: "نشر القطعة على فورك",
    create_desc_placeholder: "صف المواد الطبيعية (جلد طبيعي مدبوغ، طين فاس العريق)، والتقنيات اليدوية المتبعة...",

    // CGV
    cgv_title: "الشروط العامة وعقد المنصة",
    cgv_sub: "الشروط والأحكام العامة لمنصة فورك للصناعة التقليدية",
    cgv_art5_title: "المادة ٥.١ و ٧ — الطلبيات وتأكيد المعلم خلال ٧٢ ساعة",
    cgv_art5_desc: "يلتزم الصانع بقبول أو الاعتذار عن أي طلبية خلال أجل أقصاه ٧٢ ساعة، مع ذكر مبرر في حال الاعتذار.",
    cgv_art8_title: "المادة ٨.١ و ١١.٢ — صور مراحل الصنع والإعداد",
    cgv_art8_desc: "يشترط التقاط ٤ صور واضحة من الورشة توثق جودة الصنع اليدوي والتغليف قبل تسليم الشحنة للناقل.",
    cgv_art11_title: "المادة ١١.٤ و ١١.٥ — مسارات التسليم والشحن",
    cgv_art11_sendit_label: "شركة سنديت: صورة بوليصة الشحن المختومة والموقعة إلزامية.",
    cgv_art11_direct_label: "التسليم المباشر: صورة إشعار الاستلام موقعاً بخط يد الزبون مطلوبة.",
    cgv_commission_title: "عمولة المنصة والضريبة على القيمة المضافة",
    cgv_commission_desc: "يحدد المعلم سعره الصافي الذي يرغب باستلامه، وتطبق المنصة عمولة ٥٪ دون احتساب الضريبة + ٢٠٪ ضريبة تطبق حصراً على مبلغ العمولة.",
    cgv_art15_title: "المادة ١٥ — حساب الضمان (الوديعة) وتحرير المستحقات",
    cgv_art15_desc: "تظل أموال الزبون في حساب أمانة محمي أثناء الإنجاز، ويتم تحريرها إلى رصيدك المتاح فور تأكيد الاستلام وانقضاء المهلة القانونية.",
    cgv_understood_btn: "قرأت واطلعت وأوافق على شروط المنصة",

    // Shipping & Delivery
    shipping_sendit_title: "شحن الطلب عبر سينديت (المادة ١١.٢)",
    shipping_sendit_step1: "الخطوة ١: إصدار ورقة الإرسال (A4)",
    shipping_sendit_step2: "الخطوة ٢: صورة الطرد مع الورقة الملصقة",
    shipping_sendit_download: "تحميل ورقة الشحن (PDF)",
    shipping_sendit_confirm: "تأكيد تسليم الطرد للموزع",
    shipping_direct_title: "التوصيل المباشر من طرف المعلم",
    shipping_direct_desc: "نقل خاص وتوصيل شخصي من الورشة للزبون",
    shipping_direct_duration: "المدة المتوقعة للوصول (بالأيام)",
    shipping_direct_signature: "توقيع أو إثبات الاستلام باليد",
    shipping_direct_confirm: "تأكيد تسليم الطلب للزبون",

    // Prep Photos
    prep_photos_title: "٤ صور لتوثيق الجاهزية (المادة ١١.١)",
    prep_photos_desc: "توثيق إلزامي لحالة القطعة وجودة التغليف قبل تسليمها للشحن",
    prep_photo_front: "١. صورة واجهة القطعة بالكامل",
    prep_photo_detail: "٢. صورة تفصيلية للنقوش والختم",
    prep_photo_wrap: "٣. صورة حماية القطعة والتغليف",
    prep_photo_box: "٤. صورة الطرد مغلق وجاهز",
    prep_photos_submit: "حفظ الصور واعتماد الجاهزية",

    // Withdrawals
    withdrawal_modal_title: "طلب تحويل المستحقات البنكية",
    withdrawal_available_label: "الرصيد المتاح للتحويل:",
    withdrawal_amount_label: "المبلغ المطلوب تحويله (درهم) *",
    withdrawal_rib_label: "رقم الحساب البنكي المغربي (٢٤ رقماً) *",
    withdrawal_friday_notice: "تتم التحويلات البنكية آلياً كل يوم جمعة في تمام الساعة ١٠:٠٠ صباحاً",
    withdrawal_submit: "تأكيد طلب التحويل",

    // Refusal
    refuse_modal_title: "الاعتذار عن تلبية الطلب",
    refuse_modal_desc: "وفقاً للمادة ٦.٤، يجب توضيح سبب الاعتذار للزبون",
    refuse_reason_label: "سبب الاعتذار (عدم توفر المواد، ضيق الوقت...)",
    refuse_submit: "تأكيد الاعتذار",

    // Auth Maâlem
    auth_welcome_title: "فضاء المعلم والصانع التقليدي",
    auth_welcome_sub: "منصة فورك — للصناعة التقليدية المغربية الفاخرة",
    auth_login_tab: "دخول الحرفيين",
    auth_register_tab: "انضمام معلم جديد",
    auth_fullname_label: "الاسم الكامل للمعلم",
    auth_workshop_label: "اسم الورشة أو التعاونية الحرفية",
    auth_specialty_label: "الحرفة (فخار، جلد، نحاس، زليج، نسيج...)",
    auth_city_label: "المدينة أو الحاضرة العتيقة",
    auth_email_label: "البريد الإلكتروني المهني",
    auth_password_label: "كلمة المرور",
    auth_submit_login: "الدخول إلى ورشتي",
    auth_submit_register: "تسجيل حساب حرفي جديد",
    auth_secure_note: "فضاء مهني مؤمن ومعاملات مشفرة بالكامل",

    // Order progress steps
    order_number: "الطلب رقم",
    order_count_suffix: "طلبات جارية",
    order_pending_validation: "بحاجة لموافقتك",
    order_type_sendit: "شحن سينديت",
    order_type_direct: "توصيل مباشر",
    step_pending: "① بانتظار التأكيد",
    step_accepted: "① ✓ تم القبول",
    step_photos_done: "② ✓ ٤ صور جاهزة",
    step_photos_pending: "② ٤ صور إعداد",
    step_shipped: "③ ✓ تم التسليم",
    step_in_transit: "③ في الطريق",
    step_shipping: "③ الشحن",
    order_accepting: "جارٍ القبول...",
    order_accept_action: "قبول وبدء العمل",
    order_photos_upload_cta: "إيداع ٤ صور لتوثيق الجاهزية (المادة ٨.١)",
    order_generate_sendit: "توليد بوليصة الشحن سينديت",
    order_declare_direct: "إقرار التسليم المباشر من المعلم",
    order_validate_signed: "تأكيد التسليم بالوصل الموقع (مادة ١١.٥)",
    order_download_label: "تحميل وطباعة ملصق سينديت",

    // Posts card actions
    posts_price_net: "صافي",
    posts_days_confection: "أيام إعداد",
    posts_edit_btn: "تعديل",
    posts_show_btn: "إظهار",
    posts_hide_btn: "إخفاء",

    // Notifications
    notif_view_file: "معاينة الملف",

    // Marketplace
    market_cat_cuivre: "النحاسيات",
    market_cat_zellige: "الزليج والفخار",
    market_cat_tapis: "الزرابي والنسيج",
    market_cat_cuir: "المصنوعات الجلدية",
    market_cat_bois: "النجارة الفنية والعود",
    market_cat_textile: "الأثواب والقفطان",
    market_cat_ceramique: "الخزف الفني",
    market_quotes_count: "عرض سعر مقدم",
    market_note_placeholder: "اشرح مقاربتك الحرفية والمواد...",
    market_quote_edit: "تعديل عرض السعر",

    // Returns
    returns_order_ref: "الطلب رقم",
    returns_mode_sendit: "سينديت إكسبريس",
    returns_mode_own: "وسائل الزبون الخاصة",
    returns_forclusion: "مهلة التقادم: في حال عدم الإرجاع خلال ١٧ يوماً تظل المستحقات محفوظة لك.",

    // Disputes
    disputes_arbitration_label: "⚖️ قرار التحكيم الرسمي (المادة ٢٠.٥):",
    disputes_edit_defense: "تعديل دفوعات الورشة",

    // Profile badges & footer
    profile_verified_badge: "معلم معتمد وموثق",
    profile_partner_badge: "حرفي شريك رسمي",
    profile_footer: "منظومة فورك · فضاء الحرفيين والصناع التقليديين",

    // Auth errors & placeholders
    auth_error_required: "يرجى ملء جميع الحقول الإلزامية.",
    auth_error_password_length: "يجب ألا تقل كلمة المرور عن ٦ أحرف.",
    auth_error_invalid: "بيانات الدخول غير صحيحة.",
    auth_success_created: "تم تسجيل حساب المعلم بنجاح! تفضل بالدخول.",
    auth_error_signup: "حدث خطأ أثناء التسجيل.",
    auth_error_server: "تعذر الاتصال بالخادم.",
    auth_footer: "معلم برو · منصة فورك للحرف التقليدية المغربية",
    auth_placeholder_name: "مثال: المعلم عبد القادر الإدريسي",
    auth_placeholder_workshop: "مثال: دار الفخار والزليج العتيق",
    auth_placeholder_specialty: "فخار، نحاس، زليج...",

    // Withdrawal Modal
    withdrawal_error_amount: "المبلغ غير صالح أو يفوق رصيدك المتاح.",
    withdrawal_error_rib: "يجب أن يتكون رقم الحساب المغربي من ٢٤ رقماً.",
    withdrawal_digits: "أرقام",

    // Sendit Shipping Modal
    sendit_step_of: "المرحلة {n} من ٢ · الطلب",
    sendit_pickup_city: "مدينة الورشة (الاستلام)",
    sendit_delivery_city: "مدينة الزبون (التسليم)",
    sendit_pickup_address: "عنوان الورشة المفصل للاستلام",
    sendit_pickup_placeholder: "مثال: الورشة رقم ١٤، درب الحرة، المدينة القديمة",
    sendit_generate_bl: "إصدار ورقة الإرسال (BL)",
    sendit_package_photo_label: "صورة الطرد مع ورقة الإرسال الملصقة (المادة ١١.٢) *",
    sendit_take_photo: "التقاط أو تحميل صورة الطرد",
    sendit_file_hint: "PNG, JPG حتى 5MB",

    // Refuse Order Modal
    refuse_order_ref: "الطلب رقم",
    refuse_reason_placeholder: "اكتب سبب الاعتذار بالتفصيل للزبون...",

    // Prep Photos Modal
    prep_order_ref: "الطلب رقم",
    prep_cgv_rule: "المادة ١١.١ من الشروط:",
    prep_instruction: "التقط أو ارفع ٤ صور من الورشة لتوثيق الجاهزية",
    prep_take_photo: "التقاط / رفع صورة",
    prep_add_file: "إضافة",
    prep_url_placeholder: "أو رابط URL للصورة...",
    prep_add_btn: "إضافة",

    // Dispute Reply Modal
    dispute_reply_label: "دفوعات وإيضاحات الورشة بالتفصيل *",
    dispute_reply_placeholder: "وضح خط سير العمل والمواصفات المعتمدة...",
    dispute_evidence_label: "صور إثبات من الورشة (حد أقصى ٣ صور)",
    dispute_take_photo: "التقاط أو اختيار صورة إثبات من الهاتف",
    dispute_url_placeholder: "أو أدخل رابط صورة...",
    dispute_add_btn: "إضافة",
    dispute_submit_btn: "إرسال الدفوعات للتحكيم",

    // Direct Delivery Modal
    direct_order_label: "الطلب",
    direct_rule_9_3: "المادة ٩.٣:",
    direct_rule_9_3_text: "القطع المصنوعة حسب الطلب أو الحساسة يتم تسليمها مباشرة بواسطة المعلم للزبون.",
    direct_start_btn: "بدء عملية النقل المباشر",
    direct_rule_11_5: "المادة ١١.٥:",
    direct_rule_11_5_text: "عند تسليم القطعة يدوياً، احصل على توقيع الزبون على وصل الاستلام وأرفق الصورة هنا لفك حجز الأرباح.",
    direct_take_photo: "التقاط أو تحميل صورة الوصل الموقع",
    direct_file_hint: "PNG, JPG حتى 5MB",

    // Header
    header_vacation_paused: "في عطلة",

    // Common
    cancel: "إلغاء",
    save: "حفظ",
    close: "إغلاق",
    loading: "جاري التحميل...",
    saving: "جاري الحفظ...",
    currency_mad: "درهم",
  },
};


const LANG_KEY = "artisan_app_language";

export function getSavedLanguage(): Language {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === "ar" ? "ar" : "fr";
}

export function setSavedLanguage(lang: Language) {
  localStorage.setItem(LANG_KEY, lang);
  applyDocumentDirection(lang);
  window.dispatchEvent(new CustomEvent("vork_languagechange", { detail: lang }));
}

export function applyDocumentDirection(lang: Language) {
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = lang;
  if (lang === "ar") {
    document.body.classList.add("font-arabic");
  } else {
    document.body.classList.remove("font-arabic");
  }
}

// React Hook
export function useI18n() {
  const [lang, setLang] = useState<Language>(getSavedLanguage());

  useEffect(() => {
    applyDocumentDirection(lang);
    const handleLanguageChange = (e: any) => {
      const newLang = e.detail || getSavedLanguage();
      setLang(newLang);
    };
    window.addEventListener("vork_languagechange", handleLanguageChange);
    return () => window.removeEventListener("vork_languagechange", handleLanguageChange);
  }, [lang]);

  const changeLanguage = (newLang: Language) => {
    setSavedLanguage(newLang);
    setLang(newLang);
  };

  const t = (key: keyof typeof translations["fr"]) => {
    return translations[lang]?.[key] || translations["fr"][key] || key;
  };

  return {
    lang,
    isRTL: lang === "ar",
    changeLanguage,
    t,
  };
}
