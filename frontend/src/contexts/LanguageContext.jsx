import { createContext, useContext, useState, useEffect } from "react";

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("language") || "fr";
  });

  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "fr" ? "ar" : "fr"));
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

// Traductions globales utilisées dans toute l'application
export const translations = {
  fr: {
    // Common
    appName: "Windelevery!",
    loading: "Chargement...",
    error: "Erreur",
    success: "Succès",
    cancel: "Annuler",
    confirm: "Confirmer",
    save: "Enregistrer",
    back: "Retour",
    backToHome: "Retour à l'accueil",
    backToDashboard: "← Retour au dashboard",
    backToLogin: "Retour à la connexion",
    
    // Auth
    email: "Email",
    emailPlaceholder: "you@example.com",
    password: "Mot de passe",
    passwordPlaceholder: "••••••••",
    fullName: "Nom complet",
    fullNamePlaceholder: "Votre nom complet",
    login: "Connexion",
    logout: "Déconnexion",
    register: "S'inscrire",
    signup: "Inscription",
    forgotPassword: "Mot de passe oublié ?",
    noAccount: "Pas de compte ?",
    hasAccount: "Déjà un compte ?",
    loggingIn: "Connexion...",
    registering: "Inscription...",
    
    // Login Page
    loginTitle: "Windelevery!",
    loginSubtitle: "Connectez-vous pour voir vos missions et gagner de l'argent",
    loginError: "Email ou mot de passe incorrect.",
    loginNetworkError: "Problème réseau. Vérifiez votre connexion internet.",
    loginTimeoutError: "Le serveur met trop de temps à répondre. Réessayez plus tard.",
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
    
    // Register Page
    registerTitle: "Créer un compte",
    registerSubtitle: "Inscrivez-vous pour commencer à gagner de l'argent",
    inviteCode: "Code d'invitation (optionnel)",
    inviteCodePlaceholder: "Ex: CODEAMI",
    registerError: "Erreur lors de l'inscription.",
    
    // Forgot Password Page
    forgotPasswordTitle: "Mot de passe oublié ?",
    forgotPasswordSubtitle: "Entrez votre email pour recevoir un lien de réinitialisation",
    sendLink: "Envoyer le lien",
    sendingLink: "Envoi...",
    forgotPasswordError: "Erreur lors de l'envoi.",
    forgotPasswordSuccess: "Email de réinitialisation envoyé.",
    forgotPasswordWhatsappSuccess: "WhatsApp envoye avec le lien de reinitialisation.",
    forgotPasswordWhatsappFailed: "Email envoye. WhatsApp non envoye.",
    forgotPasswordPhoneTitle: "Recevoir le lien par WhatsApp",
    forgotPasswordPhoneSubtitle: "Ajoutez un numero marocain (06/07) pour recevoir le lien.",
    phoneLabel: "Numero de telephone",
    phonePlaceholder: "06XXXXXXXX",
    phoneInvalid: "Numero invalide. Utilisez 10 chiffres (06 ou 07).",
    phoneSend: "Envoyer par WhatsApp",
    phoneSkip: "Continuer sans WhatsApp",
    
    // Reset Password Page
    resetPasswordTitle: "Réinitialiser le mot de passe",
    resetPasswordSubtitle: "Entrez votre nouveau mot de passe",
    newPassword: "Nouveau mot de passe",
    confirmPassword: "Confirmer le mot de passe",
    resetPassword: "Réinitialiser le mot de passe",
    resetting: "Réinitialisation...",
    minPasswordLength: "Au moins 6 caractères",
    passwordMismatch: "Les mots de passe ne correspondent pas.",
    invalidLink: "Lien invalide. Veuillez demander un nouveau lien de réinitialisation.",
    resetSuccess: "Mot de passe réinitialisé avec succès !",
    resetError: "Erreur lors de la réinitialisation.",
    
    // Deposit Page
    depositTitle: "Déposer des fonds",
    recipientAccount: "Compte destinataire",
    noDepositMethods: "Aucune méthode de dépôt définie pour le moment.",
    method: "Méthode",
    bank: "Banque",
    recipient: "Destinataire",
    account: "Compte",
    rib: "RIB",
    reason: "Motif",
    amount: "Montant (MAD)",
    amountPlaceholder: "Ex: 100",
    minDeposit: "Minimum 80 MAD.",
    depositorName: "Nom du déposant",
    depositorNamePlaceholder: "Votre nom complet",
    depositorRib: "RIB du déposant",
    depositorRibPlaceholder: "Votre RIB / IBAN",
    screenshot: "Capture d'écran du dépôt",
    chooseImage: "Cliquez pour choisir une image",
    imagePreview: "Aperçu de l'image :",
    clickToEnlarge: "Cliquez sur l'image pour l'agrandir",
    deleteImage: "Supprimer",
    imageFormats: "Formats image uniquement, taille max 5 Mo.",
    sendDepositRequest: "Envoyer la demande de dépôt",
    sending: "Envoi...",
    invalidAmount: "Montant invalide.",
    minAmountError: "Le montant minimum de dépôt est 80 MAD.",
    depositorNameRequired: "Merci d'indiquer le nom du déposant.",
    depositorRibRequired: "Merci d'indiquer le RIB du déposant.",
    depositSuccess: "Demande envoyée avec succès !",
    depositSuccessMessage: "Votre demande de dépôt a été enregistrée. Elle sera traitée par un administrateur dans les plus brefs délais.",
    depositSuccessNote: "Vous recevrez une notification dès que votre dépôt sera validé et que les fonds seront crédités sur votre compte.",
    outsideHours: "⏰ Hors horaire",
    depositNotAllowed: "Dépôt non autorisé",
    comeBackLater: "Merci de revenir pendant les heures permises",
    allowedHours: "Horaires autorisés:",
    serverTime: "(Heure du serveur)",
    understood: "J'ai compris",
    close: "Fermer",
    
    // Withdraw Page
    withdrawTitle: "Demande de retrait",
    withdrawSubtitle: "Sélectionnez le montant à retirer",
    selectAmount: "Choisissez le montant à retirer",
    selectAmountHint: "Vous pouvez demander un retrait. La demande sera mise en attente jusqu'à validation par l'admin.",
    yourBalance: "Votre solde actuel :",
    confirmBalance: "Assurez-vous d'avoir au moins le montant que vous souhaitez retirer.",
    withdraw: "Retrait",
    selectAmountFirst: "Sélectionnez un montant pour continuer",
    confirmWithdraw: "Confirmer le retrait de",
    sendingRequest: "Envoi de la demande...",
    selectAmountError: "Sélectionnez un montant à retirer.",
    sessionExpired: "Session expirée, reconnectez-vous.",
    confirmWithdrawTitle: "Confirmer le retrait",
    commissionNote: "10% seront déduits du montant à retirer. (commission de l'opération)",
    finalAmount: "Montant final que vous allez recevoir:",
    withdrawOutsideHours: "⏰ Hors horaire",
    withdrawNotAllowed: "Retrait non autorisé actuellement",
    withdrawComeBack: "Revenez pendant les heures autorisées",
    
    // Referrals Page
    referralsTitle: "Parrainage",
    referralsSubtitle: "Votre code d'invitation et vos gains",
    yourInviteCode: "Votre code d'invitation",
    inviteCodeHint: "Partagez ce code, vous gagnez 10% des dépôts confirmés de vos filleuls.",
    copy: "Copier",
    signupsViaCode: "Inscriptions via votre code",
    referralEarnings: "Gains de parrainage",
    inviteeList: "Liste des filleuls",
    signups: "inscrit(s)",
    noInvitees: "Personne n'a encore utilisé votre code.",
    user: "Utilisateur",
    signupDate: "Date d'inscription",
    
    // Phone Settings Page
    phoneSettings: "Paramètres Téléphone",
    notifications: "Notifications",
    darkMode: "Mode sombre",
    
    // Mobile Frame
    rotatePhone: "Tournez votre téléphone",
    portraitOnly: "Cette application fonctionne uniquement en mode portrait",
    
    // Language
    langFr: "🇫🇷 Français",
    langAr: "🇲🇦 العربية",
    
    // Rate Stores
    rateStores: "Rate Stores",
    rateStoresDesc: "Noter les produits des magasins",
    rateStoresTitle: "Rate Stores - Noter les produits",
    chooseStore: "Choisissez un magasin pour noter ses produits :",
    chooseStoreRemaining: "Choisissez un magasin pour noter ses produits ({count} restants) :",
    changeStore: "Changer de magasin",
    rateProductFirst: "Veuillez d'abord noter ce produit (1-5 étoiles).",
    taskValidated: "Tâche validée ! +{reward} MAD",
    validated: "Validé",
    validateTask: "Valider la tâche (+{reward} MAD)",
    validating: "Validation...",
    commentPlaceholder: "Votre commentaire (optionnel)...",
    allStoresCompleted: "Tous les magasins notés !",
    allStoresCompletedHint: "Passez au VIP pour noter plus de produits chaque jour.",
    
    // Trial Period
    trialExpired: "Période d'essai terminée !",
    trialExpiredDesc: "Votre essai gratuit de 3 jours est terminé. Passez au VIP pour continuer à gagner de l'argent.",
    trialDaysRemaining: "{days} jour(s) restant(s) dans votre essai gratuit",
    trialEnded: "Période d'essai terminée",
    upgradeVip: "Passer VIP",
    
    // Daily Limit
    dailyLimitReached: "Limite quotidienne atteinte !",
    dailyLimitEarned: "Vous avez gagné {amount} MAD aujourd'hui.",
    comeBackTomorrow: "Revenez demain pour continuer à gagner !",
    limitReached: "Limite atteinte",
    limited: "Limité",
    ended: "Terminé",
    active: "Actif",
    returnBtn: "Retour",
  },
  ar: {
    // Common
    appName: "Windelevery!",
    loading: "كنحمّل...",
    error: "مشكل",
    success: "تمام",
    cancel: "إلغاء",
    confirm: "أكّد",
    save: "حفظ",
    back: "رجوع",
    backToHome: "رجع للصفحة الرئيسية",
    backToDashboard: "← رجع للوحة",
    backToLogin: "رجع للدخول",
    
    // Auth
    email: "الإيميل",
    emailPlaceholder: "you@example.com",
    password: "كلمة السر",
    passwordPlaceholder: "••••••••",
    fullName: "السمية الكاملة",
    fullNamePlaceholder: "سميتك الكاملة",
    login: "دخول",
    logout: "خروج",
    register: "سجّل",
    signup: "التسجيل",
    forgotPassword: "نسيتي كلمة السر؟",
    noAccount: "ماعندكش حساب؟",
    hasAccount: "عندك حساب؟",
    loggingIn: "كندخل...",
    registering: "كنسجّل...",
    
    // Login Page
    loginTitle: "Windelevery!",
    loginSubtitle: "دخل باش تشوف المهام و تربح الدرهم المغربي",
    loginError: "الإيميل أو كلمة السر غالطة.",
    loginNetworkError: "مشكل في الشبكة. تأكد من الإنترنت و عاود.",
    loginTimeoutError: "السيرفر كياخد بزاف الوقت. عاود كرّة من بعد.",
    showPassword: "ورّي كلمة السر",
    hidePassword: "خبي كلمة السر",
    
    // Register Page
    registerTitle: "سجّل حساب جديد",
    registerSubtitle: "سجّل باش تبدا تربح الدرهم المغربي",
    inviteCode: "كود الدعوة (إلا عندك)",
    inviteCodePlaceholder: "مثلا: CODEAMI",
    registerError: "مشكل في التسجيل.",
    
    // Forgot Password Page
    forgotPasswordTitle: "نسيتي كلمة السر؟",
    forgotPasswordSubtitle: "دخل الإيميل ديالك باش توصلك رابط إعادة التعيين",
    sendLink: "صيفط الرابط",
    sendingLink: "كنصيفط...",
    forgotPasswordError: "مشكل في الإرسال.",
    forgotPasswordSuccess: "تصيفط إيميل إعادة التعيين.",
    forgotPasswordWhatsappSuccess: "تصيفط واتساب فيه رابط إعادة التعيين.",
    forgotPasswordWhatsappFailed: "تصيفط الإيميل، واتساب ما تصيفطش.",
    forgotPasswordPhoneTitle: "خد الرابط عبر واتساب",
    forgotPasswordPhoneSubtitle: "دخل رقم مغربي (06/07) باش يوصلك الرابط.",
    phoneLabel: "رقم الهاتف",
    phonePlaceholder: "06XXXXXXXX",
    phoneInvalid: "رقم غير صالح. خاصو 10 أرقام ويبدا ب06 أو 07.",
    phoneSend: "صيفط عبر واتساب",
    phoneSkip: "كمل بلا واتساب",
    
    // Reset Password Page
    resetPasswordTitle: "إعادة تعيين كلمة السر",
    resetPasswordSubtitle: "دخل كلمة السر الجديدة",
    newPassword: "كلمة السر الجديدة",
    confirmPassword: "أكّد كلمة السر",
    resetPassword: "إعادة تعيين كلمة السر",
    resetting: "كنعيّن...",
    minPasswordLength: "على الأقل 6 حروف",
    passwordMismatch: "كلمات السر ماكتطابقش.",
    invalidLink: "الرابط غير صالح. اطلب رابط جديد.",
    resetSuccess: "كلمة السر تبدلات بنجاح!",
    resetError: "مشكل في إعادة التعيين.",
    
    // Deposit Page
    depositTitle: "شحن الحساب",
    recipientAccount: "حساب المستلم",
    noDepositMethods: "ماكاين حتى طريقة شحن دابا.",
    method: "الطريقة",
    bank: "البنك",
    recipient: "المستلم",
    account: "الحساب",
    rib: "RIB",
    reason: "السبب",
    amount: "المبلغ (درهم)",
    amountPlaceholder: "مثلا: 100",
    minDeposit: "الحد الأدنى 80 درهم.",
    depositorName: "سمية المودع",
    depositorNamePlaceholder: "سميتك الكاملة",
    depositorRib: "RIB ديال المودع",
    depositorRibPlaceholder: "RIB / IBAN ديالك",
    screenshot: "صورة الإيداع",
    chooseImage: "اضغط لاختيار صورة",
    imagePreview: "معاينة الصورة:",
    clickToEnlarge: "اضغط على الصورة لتكبيرها",
    deleteImage: "حذف",
    imageFormats: "صور فقط، الحجم الأقصى 5 ميغا.",
    sendDepositRequest: "صيفط طلب الشحن",
    sending: "كنصيفط...",
    invalidAmount: "المبلغ غير صالح.",
    minAmountError: "الحد الأدنى للشحن هو 80 درهم.",
    depositorNameRequired: "دخل سمية المودع.",
    depositorRibRequired: "دخل RIB ديال المودع.",
    depositSuccess: "الطلب تصيفط بنجاح!",
    depositSuccessMessage: "طلب الشحن ديالك تسجّل. غيتعالج من طرف الأدمين قريبا.",
    depositSuccessNote: "غتوصلك إشعار ملي يتأكد الشحن ويتزادو الفلوس في الحساب ديالك.",
    outsideHours: "⏰ خارج الوقت",
    depositNotAllowed: "الشحن ممنوع دابا",
    comeBackLater: "رجع في الوقت المسموح",
    allowedHours: "الأوقات المسموحة:",
    serverTime: "(وقت السيرفر)",
    understood: "فهمت",
    close: "سكّر",
    
    // Withdraw Page
    withdrawTitle: "طلب السحب",
    withdrawSubtitle: "اختار المبلغ لي بغيتي تسحبو",
    selectAmount: "اختار المبلغ لي بغيتي تسحبو",
    selectAmountHint: "تقدر تطلب سحب الدرهم المغربي. الطلب غيتدار في الانتظار حتى يقبلو الأدمين.",
    yourBalance: "الفلوس ديالك دابا:",
    confirmBalance: "تأكد عندك على الأقل المبلغ لي بغيتي تسحبو.",
    withdraw: "سحب",
    selectAmountFirst: "اختار مبلغ باش تكمل",
    confirmWithdraw: "أكّد السحب ديال",
    sendingRequest: "كنصيفط الطلب...",
    selectAmountError: "اختار مبلغ لي بغيتي تسحبو.",
    sessionExpired: "الجلسة سالات، دخل من جديد.",
    confirmWithdrawTitle: "أكّد السحب",
    commissionNote: "غيتنقصو 10% من المبلغ. (عمولة العملية)",
    finalAmount: "المبلغ النهائي لي غتقبضو:",
    withdrawOutsideHours: "⏰ خارج الوقت",
    withdrawNotAllowed: "السحب ممنوع دابا",
    withdrawComeBack: "رجع في الوقت المسموح",
    
    // Referrals Page
    referralsTitle: "البارطاج / الدعوة",
    referralsSubtitle: "الكود ديالك و الفلوس لي ربحتي",
    yourInviteCode: "كود الدعوة ديالك",
    inviteCodeHint: "شارك هاد الكود، كتاخد 10% من الشحن لي كيأكدو ديال الناس لي دعيتيهم.",
    copy: "نسخ",
    signupsViaCode: "التسجيلات بالكود ديالك",
    referralEarnings: "الفلوس ديال البارطاج",
    inviteeList: "لائحة الناس لي دعيتيهم",
    signups: "مسجل",
    noInvitees: "ماكاين حتى واحد خدام بالكود ديالك.",
    user: "المستخدم",
    signupDate: "تاريخ التسجيل",
    
    // Phone Settings Page
    phoneSettings: "إعدادات الهاتف",
    notifications: "الإشعارات",
    darkMode: "الوضع الداكن",
    
    // Mobile Frame
    rotatePhone: "دوّر التليفون ديالك",
    portraitOnly: "هاد التطبيق كيخدم غير في الوضع العمودي",
    
    // Language
    langFr: "🇫🇷 الفرنسية",
    langAr: "🇲🇦 العربية",
    
    // Rate Stores
    rateStores: "Rate Stores",
    rateStoresDesc: "قيّم المنتوجات ديال الماغازانات",
    rateStoresTitle: "Rate Stores - قيّم المنتوجات",
    chooseStore: "ختار ماغازان باش تقيّم المنتوجات ديالو :",
    chooseStoreRemaining: "ختار ماغازان باش تقيّم المنتوجات ديالو ({count} باقيين) :",
    changeStore: "بدل الماغازان",
    rateProductFirst: "عافاك قيّم هاد المنتوج أولا (1-5 نجوم).",
    taskValidated: "التاسك تصادقات ! +{reward} MAD",
    validated: "تصادق",
    validateTask: "صادق على التاسك (+{reward} MAD)",
    validating: "كنصادق...",
    commentPlaceholder: "التعليق ديالك (اختياري)...",
    allStoresCompleted: "كاع الماغازانات تقيّمو !",
    allStoresCompletedHint: "دير VIP باش تقيّم منتوجات أكثر كل يوم.",
    
    // Trial Period
    trialExpired: "فترة التجربة سالات !",
    trialExpiredDesc: "التجربة المجانية ديال 3 أيام سالات. دير VIP باش تكمل تربح الفلوس.",
    trialDaysRemaining: "{days} يوم باقي ف التجربة المجانية ديالك",
    trialEnded: "فترة التجربة سالات",
    upgradeVip: "دير VIP",
    
    // Daily Limit
    dailyLimitReached: "الليميت ديال اليوم وصلات !",
    dailyLimitEarned: "ربحتي {amount} MAD اليوم.",
    comeBackTomorrow: "رجع غدا باش تكمل تربح !",
    limitReached: "الليميت وصلات",
    limited: "محدود",
    ended: "سالات",
    active: "نشيط",
    returnBtn: "رجوع",
  },
};

// Helper pour obtenir une traduction
export function useTranslation() {
  const { language } = useLanguage();
  const t = translations[language] || translations.fr;
  return { t, language };
}
