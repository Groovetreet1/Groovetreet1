import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import YouTube from "react-youtube";
import { buildApiUrl } from "../apiConfig";

const EyeIcon = ({ className = "w-4 h-4" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = ({ className = "w-4 h-4" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.86 21.86 0 0 1 5.06-6.94" />
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M1 1l22 22" />
  </svg>
);

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  const [history, setHistory] = useState({ deposits: [], withdrawals: [] });
  
  const [historyLoading, setHistoryLoading] = useState(true);
  const [referrals, setReferrals] = useState(null);
  const [referralError, setReferralError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const lastStatusesRef = useRef({ deposits: {}, withdrawals: {} });
  const statusCacheKey = "dashboard_status_cache";
  
  const [activeSection, setActiveSection] = useState("overview");

  const navigate = useNavigate();

  const [showPlayer, setShowPlayer] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [canContinue, setCanContinue] = useState(false);
  const watchIntervalRef = useRef(null);

  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositError, setDepositError] = useState("");
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositFullName, setDepositFullName] = useState("");
  const [adminOps, setAdminOps] = useState({ deposits: [], withdrawals: [] });
  const [adminOpsLoading, setAdminOpsLoading] = useState(false);
  const [adminOpsError, setAdminOpsError] = useState("");
  const [adminUsersSummary, setAdminUsersSummary] = useState({ daily: [], totalUsers: 0, vipCount: 0 });
  const [adminUsersError, setAdminUsersError] = useState("");
  const [showVipModal, setShowVipModal] = useState(false);
  const [vipLoading, setVipLoading] = useState(false);
  const [vipError, setVipError] = useState("");
  const [promoCodes, setPromoCodes] = useState([]);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [promoRoleLoading, setPromoRoleLoading] = useState(false);
  const [promoRoleMessage, setPromoRoleMessage] = useState("");
  const [promoCount, setPromoCount] = useState(1);
  const [promoRedeemInput, setPromoRedeemInput] = useState("");
  const [promoRedeemMessage, setPromoRedeemMessage] = useState("");
  const [promoRedeemError, setPromoRedeemError] = useState("");
  const [promoRedeemLoading, setPromoRedeemLoading] = useState(false);
  const [showPromoCongrats, setShowPromoCongrats] = useState(false);
  const [promoCongratsText, setPromoCongratsText] = useState("");
  const [showPromoRoleModal, setShowPromoRoleModal] = useState(false);
  const [promoRolePassword, setPromoRolePassword] = useState("");
  const [promoRolePasswordError, setPromoRolePasswordError] = useState("");
  const [promoRoleNextState, setPromoRoleNextState] = useState(null);
  const [showSessionExpired, setShowSessionExpired] = useState(false);
  const [showPromoForceLogout, setShowPromoForceLogout] = useState(false);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  // Bank info state
  const [bankName, setBankName] = useState("");
  const [bankIban, setBankIban] = useState("");
  const [bankHolder, setBankHolder] = useState("");
  const [bankLocked, setBankLocked] = useState(false);
  const [bankSaving, setBankSaving] = useState(false);
  const [bankError, setBankError] = useState("");

  const [language, setLanguage] = useState(
    () => localStorage.getItem("language") || "fr"
  );
  // Hidden by default on each load; not persisted to ensure refresh re-hides it
  const [showBalance, setShowBalance] = useState(false);
  const [toast, setToast] = useState(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const vipExpiresAt = user?.vipExpiresAt ? new Date(user.vipExpiresAt) : null;
  const vipDaysLeft =
    vipExpiresAt && !Number.isNaN(vipExpiresAt.getTime())
      ? Math.max(0, Math.ceil((vipExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

  // 🎯 petites traductions FR / EN / Darija
  const translations = {
    fr: {
      appTitle: "Windelevery!",
      appSubtitle: "Panel des tâches rémunérées",
      admin: "Admin",
      logout: "Déconnexion",
      headerBalancePrefix: "Solde",

      sidebarBalance: "Solde",
      sidebarStatus: "Statut",
      sidebarVip: "",
      sidebarDeposit: "Dépôt",
      sidebarWithdraw: "Retrait",
      sidebarMenuTitle: "Menu",

      menuOverview: "Vue d'ensemble",
          menuHistory: "Historique dépôts/retraits",
          menuProfile: "Paramètres du profil",
          menuBank: "Infos bancaires",
          menuLanguage: "Langue",
          menuPromo: "Code promo",
          menuSupport: "Service client",

      overviewBalanceTitle: "Solde disponible",
      overviewWelcome: "",
      overviewTasksCompletedTitle: "Tâches complétées",
      overviewTasksCompletedHint: "Historique détaillé à implémenter",
      overviewVipTitle: "Statut",
      overviewVipHint: "",

      tasksSectionTitle: "Tâches disponibles",
      tasksRefresh: "Rafraîchir",
      tasksLoading: "Chargement des tâches...",
      tasksNone: "Aucune tâche disponible pour le moment.",
      taskLevelLabel: "Level",
      taskMinDuration: "Durée min",
      taskReward: "Gain",
      taskVideoHint: "Vidéo YouTube liée à la tâche",
      taskStartButton: "Commencer la tâche",

      historyRecentTitle: "Historique récent",
      historyLoading: "Chargement de l'historique...",
      historyNone: "Aucun dépôt ni retrait pour le moment.",
      historyDepositLabel: "💰 Dépôt",
      historyWithdrawLabel: "💸 Retrait",

      historyFullTitle: "Historique des dépôts et retraits",
      historyDepositsTitle: "Dépôts récents",
      historyWithdrawalsTitle: "Retraits récents",
      historyDepositsNone: "Aucun dépôt pour le moment.",
      historyWithdrawalsNone: "Aucun retrait pour le moment.",
      historyStatusLabel: "Statut",

      profileSectionTitle: "Paramètres du profil",
      profileHint: "",
      avatarLabel: "Photo de profil",
      avatarHint: "JPG/PNG, taille max 2 Mo.",
      avatarUploading: "Upload en cours...",
      profileFullNameLabel: "Nom complet",
      profileEmailLabel: "Email",
      profileEmailNote:
        "(Changement d’email : à gérer côté support plus tard.)",
      profileSaveButton: "Enregistrer (dummy)",

      bankSectionTitle: "Informations bancaires",
      bankHint: "",
      bankNameLabel: "Banque",
      bankIbanLabel: "RIB / IBAN",
      bankHolderLabel: "Titulaire",
      bankSaveButton: "Enregistrer (dummy)",

      languageSectionTitle: "Langue de l'interface",
      languageHint: "",
      languageCurrentLabel: "Langue actuelle",

      supportSectionTitle: "Centre de service / Support",
      supportHint:
        "Tu peux utiliser ce formulaire pour que l'utilisateur décrive un problème. Plus tard, tu pourras l'envoyer à une API ou par email.",
      supportSubjectLabel: "Sujet",
      supportMessageLabel: "Message",
      supportSubjectPlaceholder:
        "Problème de retrait, dépôt, compte...",
      supportMessagePlaceholder:
        "Décris ton problème ou ta question...",
      supportSubmitButton: "Envoyer au support (dummy)",
      supportFabLabel: "Support",
      supportFabCta: "Ouvrir le support",

      depositModalTitle: "Effectuer un dépôt",
      depositModalMinPrefix: "Montant minimum",
      depositModalAmountLabel: "Montant (MAD)",
      depositModalConfirm: "Confirmer le dépôt",
      depositModalClose: "Fermer",

      videoModalTitlePrefix: "regarder au moins",
      videoModalClose: "Fermer ✕",
      videoModalTimeSeen: "Temps vu",
      videoModalNeedToWatchPrefix:
        "Regarde au moins",
      videoModalNeedToWatchSuffix:
        "secondes pour activer le bouton.",
      videoModalCanContinue:
        "✅ Tu peux maintenant continuer et valider la tâche.",
      videoModalContinueButton: "Continuer et valider la tâche",

      langFrLabel: "🇫🇷 Français",
      langArLabel: "🇲🇦 الدارجة المغربية",
      langEnLabel: "🇬🇧 English",
    },
    ar: {
      appTitle: "Windelevery!",
      appSubtitle: "لوحة ديال المهام لي كتخلّص",
      admin: "أدمين",
      logout: "خروج",
      headerBalancePrefix: "الرصيد",

      sidebarBalance: "الرصيد",
      sidebarStatus: "الحالة",
      sidebarVip: "VIP",
      sidebarDeposit: "الإيداع",
      sidebarWithdraw: "السحب",
      sidebarMenuTitle: "القائمة",

      menuOverview: "نظرة عامة",
          menuHistory: "تاريخ الإيداعات والسحوبات",
          menuProfile: "إعدادات البروفيل",
          menuBank: "معلومات البنكة",
          menuLanguage: "اللغة",
          menuPromo: "كود برومو",
          menuSupport: "الدعم",

      overviewBalanceTitle: "الرصيد المتوفر",
      overviewWelcome: "",
      overviewTasksCompletedTitle: "المهام المكمّلة",
      overviewTasksCompletedHint: "التاريخ المفصّل قريباً",
      overviewVipTitle: "الحالة",
      overviewVipHint: "",

      tasksSectionTitle: "المهام المتاحة",
      tasksRefresh: "عاود التحديث",
      tasksLoading: "كنحمّلو المهام...",
      tasksNone: "ما كايناش مهام دابا.",
      taskLevelLabel: "المستوى",
      taskMinDuration: "المدة الدنيا",
      taskReward: "الربح",
      taskVideoHint: "فيديو يوتوب ديال المهمة",
      taskStartButton: "بدا المهمة",

      historyRecentTitle: "تاريخ قريب",
      historyLoading: "كنحمّلو التاريخ...",
      historyNone: "ما كاين لا إيداع لا سحب.",
      historyDepositLabel: "إيداع",
      historyWithdrawLabel: "سحب",

      historyFullTitle: "تاريخ الإيداعات والسحوبات",
      historyDepositsTitle: "الإيداعات الجديدة",
      historyWithdrawalsTitle: "السحوبات الجديدة",
      historyDepositsNone: "ما كاين حتى إيداع.",
      historyWithdrawalsNone: "ما كاين حتى سحب.",
      historyStatusLabel: "الحالة",

      profileSectionTitle: "إعدادات البروفيل",
      profileHint: "",
      avatarLabel: "تصويرة البروفيل",
      avatarHint: "JPG/PNG حتى 2 ميغا.",
      avatarUploading: "كنرفعو التصويرة...",
      profileFullNameLabel: "الاسم الكامل",
      profileEmailLabel: "الإيميل",
      profileEmailNote:
        "(تبديل الإيميل يتدار مع الدعم.)",
      profileSaveButton: "سجّل (تجريبي)",

      bankSectionTitle: "معلومات البنكة",
      bankHint: "",
      bankNameLabel: "البنك",
      bankIbanLabel: "RIB / IBAN",
      bankHolderLabel: "صاحب الحساب",
      bankSaveButton: "سجّل (تجريبي)",

      languageSectionTitle: "لغة الواجهة",
      languageHint: "",
      languageCurrentLabel: "اللغة الحالية",

      supportSectionTitle: "مركز الدعم",
      supportHint:
        "كتب مشكلتك هنا. من بعد نقدرو نبعتها ل API ولا الإيميل.",
      supportSubjectLabel: "الموضوع",
      supportMessageLabel: "الرسالة",
      supportSubjectPlaceholder:
        "مشكلة فالسحب، الإيداع، الحساب...",
      supportMessagePlaceholder:
        "شرح لينا المشكل أو السؤال ديالك...",
      supportSubmitButton: "صيفط للدعم (تجريبي)",
      supportFabLabel: "الدعم",
      supportFabCta: "افتح الدعم",

      depositModalTitle: "دير إيداع",
      depositModalMinPrefix: "أقل مبلغ",
      depositModalAmountLabel: "المبلغ (MAD)",
      depositModalConfirm: "أكّد الإيداع",
      depositModalClose: "سد",

      videoModalTitlePrefix: "شاهد على الأقل",
      videoModalClose: "سد",
      videoModalTimeSeen: "الوقت المشاهد",
      videoModalNeedToWatchPrefix: "شاهد على الأقل",
      videoModalNeedToWatchSuffix: "ثواني باش يتفعّل الزر.",
      videoModalCanContinue: "تقدر تكمل وتأكد المهمة.",
      videoModalContinueButton: "كمل وأكد المهمة",

      langFrLabel: "فرنسية",
      langArLabel: "دارجة",
      langEnLabel: "إنجليزية",
    },
    en: {
      appTitle: "Windelevery!",
      appSubtitle: "Paid tasks panel",
      admin: "Admin",
      logout: "Logout",
      headerBalancePrefix: "Balance",

      sidebarBalance: "Balance",
      sidebarStatus: "Status",
      sidebarVip: "VIP",
      sidebarDeposit: "Deposit",
      sidebarWithdraw: "Withdraw",
      sidebarMenuTitle: "Menu",

      menuOverview: "Overview",
          menuHistory: "Deposits / Withdrawals history",
          menuProfile: "Profile settings",
          menuBank: "Bank information",
          menuLanguage: "Language",
          menuPromo: "Promo code",
          menuSupport: "Support",

      overviewBalanceTitle: "Available balance",
      overviewWelcome: "",
      overviewTasksCompletedTitle: "Completed tasks",
      overviewTasksCompletedHint: "Detailed history coming soon",
      overviewVipTitle: "Status",
      overviewVipHint: "",

      tasksSectionTitle: "Available tasks",
      tasksRefresh: "Refresh",
      tasksLoading: "Loading tasks...",
      tasksNone: "No tasks available at the moment.",
      taskLevelLabel: "Level",
      taskMinDuration: "Min duration",
      taskReward: "Reward",
      taskVideoHint: "YouTube video linked to this task",
      taskStartButton: "Start task",

      historyRecentTitle: "Recent history",
      historyLoading: "Loading history...",
      historyNone: "No deposit or withdrawal yet.",
      historyDepositLabel: "💰 Deposit",
      historyWithdrawLabel: "💸 Withdrawal",

      historyFullTitle: "Deposits & withdrawals history",
      historyDepositsTitle: "Recent deposits",
      historyWithdrawalsTitle: "Recent withdrawals",
      historyDepositsNone: "No deposits yet.",
      historyWithdrawalsNone: "No withdrawals yet.",
      historyStatusLabel: "Status",

      profileSectionTitle: "Profile settings",
      profileHint: "",
      avatarLabel: "Profile picture",
      avatarHint: "JPG/PNG, max size 2MB.",
      avatarUploading: "Uploading picture...",
      profileFullNameLabel: "Full name",
      profileEmailLabel: "Email",
      profileEmailNote: "(Email change will be handled by support later.)",
      profileSaveButton: "Save (dummy)",

      bankSectionTitle: "Bank information",
      bankHint: "",
      bankNameLabel: "Bank",
      bankIbanLabel: "RIB / IBAN",
      bankHolderLabel: "Account holder",
      bankSaveButton: "Save (dummy)",

      languageSectionTitle: "Interface language",
      languageHint: "",
      languageCurrentLabel: "Current language",

      supportSectionTitle: "Support center",
      supportHint:
        "Use this form to describe a problem. Later you can send it to an API or email.",
      supportSubjectLabel: "Subject",
      supportMessageLabel: "Message",
      supportSubjectPlaceholder:
        "Withdrawal issue, deposit issue, account...",
      supportMessagePlaceholder:
        "Describe your problem or question here...",
      supportSubmitButton: "Send to support (dummy)",
      supportFabLabel: "Support",
      supportFabCta: "Open support",

      depositModalTitle: "Make a deposit",
      depositModalMinPrefix: "Minimum amount",
      depositModalAmountLabel: "Amount (MAD)",
      depositModalConfirm: "Confirm deposit",
      depositModalClose: "Close",

      videoModalTitlePrefix: "watch at least",
      videoModalClose: "Close ✕",
      videoModalTimeSeen: "Time watched",
      videoModalNeedToWatchPrefix: "Watch at least",
      videoModalNeedToWatchSuffix:
        "seconds to enable the button.",
      videoModalCanContinue:
        "✅ You can now continue and validate the task.",
      videoModalContinueButton: "Continue and validate task",

      langFrLabel: "🇫🇷 French",
      langArLabel: "🇲🇦 Moroccan Darija",
      langEnLabel: "🇬🇧 English",
    },
  };

  const L = translations[language] || translations.fr;

  // Fallback tasks used when backend is not available or DB is empty.
  // Generate 6 tasks with random rewards between 1.0 and 3.0 MAD (100-300 cents).
  const generateDefaultTasks = (count = 6) => {
    const titles = [
      'Regarder vidéo promo',
      'Voir une courte pub',
      'Regarder clip',
      'Visionner annonce',
      'Regarder extrait',
      'Regarder promo express',
    ];

    return Array.from({ length: count }).map((_, i) => {
      const rewardCents = 200; // fixed 2.00 MAD
      return {
        id: i + 1,
        title: `${titles[i % titles.length]} ${i + 1}`,
        description: 'Regarde la vidéo pendant au moins 15 secondes.',
        rewardCents,
        durationSeconds: 15,
        minVipLevel: 'FREE',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      };
    });
  };

  const DEFAULT_TASKS = generateDefaultTasks(6);

  const fetchPromoCodes = async () => {
    if (!(user?.promoRoleEnabled)) return;
    try {
      setPromoLoading(true);
      setPromoError("");
      const token = localStorage.getItem("token");
      const res = await fetch(buildApiUrl("/api/admin/promo-codes"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setPromoError(data.message || "Erreur codes promo.");
        return;
      }
      setPromoCodes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setPromoError("Erreur réseau (codes promo).");
    } finally {
      setPromoLoading(false);
    }
  };

  useEffect(() => {
    const addNotification = (message, type = 'info') => {
      setNotifications((prev) => [{ id: Date.now() + Math.random(), message, type }, ...prev].slice(0, 10));
      setShowNotifications(true);
    };

    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (!storedUser || !token) {
      navigate("/login");
      return;
    }

    // Charger le cache des statuts pour ne pas perdre les notifications si l'utilisateur
    // se reconnecte après qu'un admin ait traité ses demandes.
    try {
      const cached = localStorage.getItem(statusCacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          lastStatusesRef.current = {
            deposits: parsed.deposits || {},
            withdrawals: parsed.withdrawals || {},
          };
        }
      }
    } catch (e) {
      // ignore cache parse errors
    }
    // Vérifier si la session a plus de 6h
const loginTimeStr = localStorage.getItem("loginTime");
if (loginTimeStr) {
  const loginTime = parseInt(loginTimeStr, 10);
  const sixHoursMs = 6 * 60 * 60 * 1000; // 6 heures en millisecondes
  const now = Date.now();

  if (now - loginTime > sixHoursMs) {
    setShowSessionExpired(true);
    return;
  }
}


    const parsedUser = JSON.parse(storedUser);
    // Si admin et promo actif, on force à OFF côté front au refresh
    if (parsedUser?.role === "admin" && parsedUser?.promoRoleEnabled) {
      parsedUser.promoRoleEnabled = 0;
      localStorage.setItem("user", JSON.stringify(parsedUser));
    }
    setUser(parsedUser);

    const fetchTasks = async () => {
      try {
        const res = await fetch(buildApiUrl("/api/tasks"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (!res.ok) {
          console.error(data);
          // use freshly generated fallback tasks so UI remains functional for tests
          setTasks(generateDefaultTasks(6));
        } else {
          // backend might return an array or an object like { tasks: [...] }
          if (!data) {
            setTasks(generateDefaultTasks(6));
          } else if (Array.isArray(data)) {
            // If backend returned an array with 0 or more items
            if (data.length === 0) setTasks(generateDefaultTasks(6));
            else setTasks(data);
          } else if (Array.isArray(data.tasks)) {
            if (data.tasks.length === 0) setTasks(generateDefaultTasks(6));
            else setTasks(data.tasks);
          } else {
            // Unexpected shape — fall back to generated tasks
            setTasks(generateDefaultTasks(6));
          }
        }
      } catch (err) {
        console.error(err);
        // network error → generate fallback tasks
        setTasks(generateDefaultTasks(6));
      } finally {
        setLoadingTasks(false);
      }
    };

    const fetchHistory = async () => {
      try {
        const res = await fetch(buildApiUrl("/api/wallet/history"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
        const data = await res.json();
        if (!res.ok) {
          console.error(data);
        } else {
          setHistory(data);
          // Detect status changes and notify
          const prev = lastStatusesRef.current || { deposits: {}, withdrawals: {} };
          const next = { deposits: {}, withdrawals: {} };
          (data.deposits || []).forEach((d) => {
            const prevStatus = prev.deposits ? prev.deposits[d.id] : undefined;
            next.deposits[d.id] = d.status;
            if (prevStatus && prevStatus !== d.status) {
              if (d.status === 'CONFIRMED' || d.status === 'APPROVED') addNotification('Dépôt approuvé par l’admin.', 'success');
              else if (d.status === 'REJECTED') addNotification('Dépôt rejeté par l’admin.', 'error');
            } else if (!prevStatus && d.status && d.status !== 'PENDING') {
              // L'utilisateur n'avait pas encore été prévenu (ex: reconnexion après traitement admin)
              if (d.status === 'CONFIRMED' || d.status === 'APPROVED') addNotification('Dépôt approuvé par l’admin.', 'success');
              else if (d.status === 'REJECTED') addNotification('Dépôt rejeté par l’admin.', 'error');
            }
          });
          (data.withdrawals || []).forEach((w) => {
            const prevStatus = prev.withdrawals ? prev.withdrawals[w.id] : undefined;
            next.withdrawals[w.id] = w.status;
            if (prevStatus && prevStatus !== w.status) {
              if (w.status === 'APPROVED') addNotification('Retrait approuvé par l’admin.', 'success');
              else if (w.status === 'REJECTED') addNotification('Retrait rejeté par l’admin.', 'error');
            } else if (!prevStatus && w.status && w.status !== 'PENDING') {
              if (w.status === 'APPROVED') addNotification('Retrait approuvé par l’admin.', 'success');
              else if (w.status === 'REJECTED') addNotification('Retrait rejeté par l’admin.', 'error');
            }
          });
          lastStatusesRef.current = next;
          try {
            localStorage.setItem(statusCacheKey, JSON.stringify(next));
          } catch (e) {
            // ignore cache write issues
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setHistoryLoading(false);
      }
    };

    const fetchAdminOps = async () => {
      if (parsedUser?.role !== "admin") return;
      setAdminOpsError("");
      setAdminOpsLoading(true);
      try {
        const token = localStorage.getItem("token");
        const [depRes, witRes] = await Promise.all([
          fetch(buildApiUrl("/api/admin/deposits?own=1"), { headers: { Authorization: `Bearer ${token}` } }),
          fetch(buildApiUrl("/api/admin/withdrawals?own=1"), { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const depData = await depRes.json();
        const witData = await witRes.json();
        if (!depRes.ok) setAdminOpsError(depData.message || "Erreur dépôts admin.");
        if (!witRes.ok) setAdminOpsError((prev) => prev || witData.message || "Erreur retraits admin.");
        if (depRes.ok && witRes.ok) {
          setAdminOps({
            deposits: Array.isArray(depData) ? depData : [],
            withdrawals: Array.isArray(witData) ? witData : [],
          });
        }
      } catch (err) {
        console.error(err);
        setAdminOpsError("Erreur réseau (stats admin).");
      } finally {
        setAdminOpsLoading(false);
      }
    };

    const fetchBank = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(buildApiUrl("/api/user/bank"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data && data.id) {
          setBankName(data.bankName || "");
          setBankIban(data.iban || "");
          setBankHolder(data.holderName || "");
          setBankLocked(true);
        }
      } catch (err) {
        console.error('Could not fetch bank info', err);
      }
    };

    const fetchReferrals = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(buildApiUrl("/api/user/referrals"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setReferrals(data);
        } else {
          setReferralError(data.message || "Erreur parrainage.");
        }
      } catch (err) {
        console.error(err);
        setReferralError("Erreur réseau (parrainage).");
      }
    };

    fetchTasks();
    fetchHistory();
    fetchBank();
    fetchReferrals();
    fetchAdminOps();

    if (parsedUser?.role === "admin") {
      const fetchAdminUsers = async () => {
        try {
          const token = localStorage.getItem("token");
          const res = await fetch(buildApiUrl("/api/admin/users-summary"), {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (!res.ok) {
            setAdminUsersError(data.message || "Erreur résumé utilisateurs.");
          } else {
            setAdminUsersSummary({
              daily: Array.isArray(data.daily) ? data.daily : [],
              totalUsers: data.totalUsers || 0,
              vipCount: data.vipCount || 0,
            });
          }
        } catch (err) {
          console.error(err);
          setAdminUsersError("Erreur réseau (utilisateurs admin).");
        }
      };
      fetchAdminUsers();
    }

        if (parsedUser?.promoRoleEnabled) {
      fetchPromoCodes();
    }

    // SSE live updates
    let es;
    try {
      if (token) {
      es = new EventSource(buildApiUrl(`/api/subscribe?token=${token}`));
        es.onopen = () => {
          // silent connect
        };
        es.onmessage = async (ev) => {
          try {
            const payload = JSON.parse(ev.data || "{}");
            const currentUser = JSON.parse(localStorage.getItem("user") || "null");
            if (!currentUser) return;
            const targetId =
              payload.withdrawal?.userId ||
              payload.deposit?.userId ||
              payload.userId ||
              payload.user?.id ||
              null;
            if (targetId && Number(targetId) !== Number(currentUser.id)) return;

            const notify = (msg, type) => {
              addNotification(msg, type);
              setToast({ message: msg, type: type === "error" ? "error" : "success" });
              setTimeout(() => setToast(null), 5000);
            };

            if (payload.type === "deposit_approved") {
              notify("Dépôt approuvé par l’admin.", "success");
              fetchHistory();
            }
            if (payload.type === "deposit_rejected") {
              notify("Dépôt rejeté par l’admin.", "error");
              fetchHistory();
            }
            if (payload.type === "withdrawal_approved") {
              notify("Retrait approuvé par l’admin.", "success");
              fetchHistory();
            }
            if (payload.type === "withdrawal_rejected") {
              notify("Retrait rejeté par l’admin.", "error");
              fetchHistory();
            }
          } catch (e) {
            // ignore parse errors
          }
        };
        es.onerror = () => {
          addNotification('Canal temps réel indisponible, reconnection automatique...', 'error');
        };
      }
    } catch (e) {
      // ignore SSE setup errors
    }

    // Poll for user updates (balance etc.) so that approvals made by admin
    // show up in the user's dashboard without manual reload.
    let pollInterval = null;
    const startPolling = () => {
      pollInterval = setInterval(async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) return;
          const res = await fetch(buildApiUrl("/api/user/me"), {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) return;
          const { user: fresh } = await res.json();
          if (!fresh) return;
          setUser((prev) => {
            if (!prev) return prev;
            // Update only if balance or VIP status/expiry changed
            const vipChanged = fresh.vipLevel !== prev.vipLevel || fresh.vipExpiresAt !== prev.vipExpiresAt;
            if (fresh.balanceCents !== prev.balanceCents || vipChanged) {
              const delta = typeof fresh.balanceCents === 'number' && typeof prev.balanceCents === 'number' ? fresh.balanceCents - prev.balanceCents : null;
              const updated = {
                ...prev,
                balanceCents: fresh.balanceCents,
                vipLevel: fresh.vipLevel,
                vipExpiresAt: fresh.vipExpiresAt ?? prev.vipExpiresAt,
              };
              localStorage.setItem('user', JSON.stringify(updated));
              // refresh history to show deposits/withdrawals updates
              fetchHistory();
              // Show a toast if balance increased or decreased
              if (delta && delta !== 0) {
                const sign = delta > 0 ? '+' : '-';
                const mad = Math.abs(delta) / 100;
                setToast({ message: `${sign}${mad.toFixed(2)} MAD`, type: delta > 0 ? 'success' : 'error' });
                setTimeout(() => setToast(null), 5000);
              }
              if (vipChanged && fresh.vipLevel === 'VIP') {
                setNotifications((prev) => [{ id: Date.now(), message: 'Votre upgrade VIP est confirmé.', type: 'success' }, ...prev].slice(0, 10));
                setShowNotifications(true);
              }
              return updated;
            }
            return prev;
          });
        } catch (err) {
          // ignore poll errors silently
        }
      }, 8000); // every 8s
    };

    startPolling();
    const historyPoll = setInterval(() => {
      fetchHistory();
    }, 15000);

    return () => {
      if (watchIntervalRef.current) clearInterval(watchIntervalRef.current);
      if (pollInterval) clearInterval(pollInterval);
      clearInterval(historyPoll);
      if (es) es.close();
    };
  }, [navigate]);

  const handleGeneratePromo = async () => {
    setPromoError("");
    setPromoLoading(true);
    try {
      const count = Math.min(Math.max(parseInt(promoCount, 10) || 1, 1), 20);
      const token = localStorage.getItem("token");
      const res = await fetch(buildApiUrl("/api/admin/promo-codes"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ count }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPromoError(data.message || "Erreur génération code.");
      } else {
        // Prepend new codes
        const newCodes = Array.isArray(data.codes) ? data.codes.map((c, idx) => ({
          id: Date.now() + idx,
          code: c.code,
          amountCents: c.amountCents,
          createdAt: new Date().toISOString(),
        })) : [];
        setPromoCodes((prev) => [...newCodes, ...prev].slice(0, 50));
        fetchPromoCodes();
      }
    } catch (err) {
      console.error(err);
      setPromoError("Erreur réseau (génération code).");
    } finally {
      setPromoLoading(false);
    }
  };

  const handleTogglePromoRole = async (enabled, password = "") => {
    if (!user?.id) return;
    try {
      setPromoRoleLoading(true);
      setPromoRoleMessage("");
      setPromoError("");
      const token = localStorage.getItem("token");
      const res = await fetch(buildApiUrl(`/api/admin/users/${user.id}/promo-role`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPromoError(data.message || "Erreur mise à jour rôle promo.");
        return;
      }
      const updated = { ...user, promoRoleEnabled: enabled ? 1 : 0 };
      setUser(updated);
      localStorage.setItem("user", JSON.stringify(updated));
      setPromoRoleMessage(enabled ? "" : "Rôle promo désactivé.");
      if (enabled) {
        fetchPromoCodes();
      } else {
        setPromoCodes([]);
      }
    } catch (err) {
      console.error(err);
      setPromoError("Erreur réseau (rôle promo).");
    } finally {
      setPromoRoleLoading(false);
    }
  };

  const handleRefreshPromo = () => {
    fetchPromoCodes();
  };

  const handleRedeemPromo = async () => {
    setPromoRedeemMessage("");
    setPromoRedeemError("");
    const code = (promoRedeemInput || "").trim();
    if (code.length < 3) {
      setPromoRedeemError("Code invalide.");
      return;
    }
    try {
      setPromoRedeemLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(buildApiUrl("/api/promo/redeem"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPromoRedeemError(data.message || "Erreur code promo.");
        return;
      }
      const addedMad =
        typeof data.added_cents === "number"
          ? (data.added_cents / 100).toFixed(2)
          : null;
      const msgBase = data.message || "Code appliqué. Montant crédité.";
      setPromoRedeemMessage(
        addedMad ? `${msgBase} +${addedMad} MAD.` : msgBase
      );
      if (addedMad) {
        setPromoCongratsText(`Code appliqué : +${addedMad} MAD`);
        setShowPromoCongrats(true);
      }
      setPromoRedeemInput("");
      if (typeof data.added_cents === "number") {
        setUser((prev) => {
          if (!prev) return prev;
          const updated = { ...prev, balanceCents: (prev.balanceCents || 0) + data.added_cents };
          localStorage.setItem("user", JSON.stringify(updated));
          return updated;
        });
      }
    } catch (err) {
      console.error(err);
      setPromoRedeemError("Erreur réseau (code promo).");
    } finally {
      setPromoRedeemLoading(false);
    }
  };

  const handleCompleteTask = async (taskId) => {
    const task = tasks.find((t) => t.id === taskId);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(
      buildApiUrl(`/api/tasks/${taskId}/complete`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.message || "Erreur lors de la tâche", type: "error" });
        setTimeout(() => setToast(null), 4000);
        return;
      }

      setToast({
        message: `Tâche complétée ! +${(data.reward_cents / 100).toFixed(2)} MAD (solde: ${(data.new_balance_cents / 100).toFixed(2)} MAD)`,
        type: "success",
      });
      setTimeout(() => setToast(null), 4000);

      setUser((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          balanceCents: data.new_balance_cents,
        };
        localStorage.setItem("user", JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      console.error(err);
      // Network error: simulate task completion locally so you can test balance
      if (task) {
        const reward = task.rewardCents || task.reward_cents || 0;
        setUser((prev) => {
          if (!prev) return prev;
          const updated = { ...prev, balanceCents: (prev.balanceCents || 0) + reward };
          localStorage.setItem("user", JSON.stringify(updated));
          return updated;
        });
        setToast({ message: `(Simulé) Tâche complétée ! +${(reward / 100).toFixed(2)} MAD`, type: "success" });
        setTimeout(() => setToast(null), 4000);
      } else {
        setToast({ message: "Erreur réseau", type: "error" });
        setTimeout(() => setToast(null), 4000);
      }
    }
  };

  const handleSaveBank = async (e) => {
    e.preventDefault();
    setBankError("");
    if (!bankName || !bankIban || !bankHolder) {
      setBankError("Merci de remplir tous les champs bancaires.");
      return;
    }
    setBankSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(buildApiUrl("/api/user/bank"), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bank_name: bankName, iban: bankIban, holder_name: bankHolder })
      });
      const data = await res.json();
      if (!res.ok) {
        setBankError(data.message || 'Erreur lors de l enregistrement');
      } else {
        setBankLocked(true);
        alert(data.message || 'Infos bancaires enregistrées');
      }
    } catch (err) {
      console.error(err);
      setBankError('Erreur réseau');
    } finally {
      setBankSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("loginTime");
    localStorage.removeItem(statusCacheKey);
    navigate("/");  
  };

  const handleOpenTask = (task) => {
    if (!task.videoUrl) {
      handleCompleteTask(task.id);
      return;
    }
    setCurrentTask(task);
    setWatchedSeconds(0);
    setCanContinue(false);
    setShowPlayer(true);
  };

  const getYoutubeIdFromUrl = (url) => {
    if (!url) return "";
    const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
    if (shortMatch) return shortMatch[1];
    const longMatch = url.match(/[?&]v=([^&]+)/);
    if (longMatch) return longMatch[1];
    return "";
  };

  const isTaskLockedForUser = (task) => {
    if (!task) return false;
    const rawLevel = (task.minVipLevel || task.min_vip_level || "FREE").toString();
    const level = rawLevel.toUpperCase().trim();
    const userLevel = (user?.vipLevel || "").toUpperCase();

    // Considère comme "free" si le niveau contient FREE ou si le titre mentionne "FREE"
    const title = (task.title || "").toUpperCase();
    const isFreeLabel = level.includes("FREE") || title.includes("FREE");

    // On bloque seulement si ce n'est pas une tâche "free" ET que l'utilisateur est FREE.
    // On réserve aux VIP tout ce qui est marqué VIP ou Level 0.
    const requiresVip =
      level.includes("VIP") ||
      level.startsWith("LEVEL 0") ||
      level === "LEVEL0" ||
      level === "0";

    if (isFreeLabel) return false;
    return requiresVip && userLevel === "FREE";
  };

  const formatTaskLevel = (task) => {
    const raw = (task?.minVipLevel ?? task?.min_vip_level ?? "FREE").toString().trim();
    const upper = raw.toUpperCase();
    if (upper === "0" || upper === "LEVEL0" || upper.startsWith("LEVEL 0")) return "VIP";
    if (upper.includes("VIP")) return "VIP";
    if (upper.includes("FREE")) return "FREE";
    return raw || "FREE";
  };

  const handlePlayerStateChange = (event) => {
    const minSeconds = currentTask?.durationSeconds || 15;
  
    // 1 = PLAYING, 2 = PAUSED, 0/3 = STOPPED/ENDED…
    if (event.data === 1) {
      // la vidéo est en lecture → on commence à compter
      if (watchIntervalRef.current) {
        clearInterval(watchIntervalRef.current);
      }
  
      watchIntervalRef.current = setInterval(() => {
        setWatchedSeconds((prev) => {
          const next = prev + 0.5; // toutes les 500ms → +0.5s
          if (next >= minSeconds) {
            setCanContinue(true);
            if (watchIntervalRef.current) {
              clearInterval(watchIntervalRef.current);
            }
          }
          return next;
        });
      }, 500);
    } else {
      // PAUSE, SEEK, FIN, BUFFER, etc. → on arrête de compter
      if (watchIntervalRef.current) {
        clearInterval(watchIntervalRef.current);
      }
    }
  };
  

  const handleClosePlayer = () => {
    if (watchIntervalRef.current) {
      clearInterval(watchIntervalRef.current);
    }
    setShowPlayer(false);
    setCurrentTask(null);
    setWatchedSeconds(0);
    setCanContinue(false);
  };

  const handleContinueAfterWatch = async () => {
    if (!canContinue || !currentTask) return;
    await handleCompleteTask(currentTask.id);
    handleClosePlayer();
  };

  const openDepositModal = () => {
    navigate("/deposit");
  };

  const closeDepositModal = () => {
    setShowDepositModal(false);
    setDepositError("");
    setDepositAmount("");
    setDepositLoading(false);
    setDepositFullName("");
  };

  const refreshHistory = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(buildApiUrl("/api/wallet/history"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) setHistory(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmDeposit = async () => {
    const amount = Number(depositAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      setDepositError("Montant invalide.");
      return;
    }
    if (amount < 80) {
      setDepositError("Le montant minimum de dépôt est de 80 MAD.");
      return;
    }
    if (!depositFullName || depositFullName.trim().length === 0) {
      setDepositError("Merci d'indiquer le nom complet du déposant.");
      return;
    }

    setDepositLoading(true);
    setDepositError("");
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(buildApiUrl("/api/wallet/deposit"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount, full_name: depositFullName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDepositError(data.message || "Erreur lors du dépôt.");
      } else {
        // If backend returned a new_balance_cents (confirmed deposit), update the user balance.
        // Otherwise the deposit is PENDING and the user's balance must not be changed here.
        alert(data.message || "Dépôt enregistré.");
        if (typeof data.new_balance_cents === "number") {
          setUser((prev) => {
            if (!prev) return prev;
            const updated = {
              ...prev,
              balanceCents: data.new_balance_cents,
            };
            localStorage.setItem("user", JSON.stringify(updated));
            return updated;
          });
        }
        await refreshHistory();
        closeDepositModal();
      }
    } catch (err) {
      console.error(err);
      setDepositError("Erreur réseau.");
    } finally {
      setDepositLoading(false);
    }
  };

  const handleWithdrawClick = () => {
    navigate("/withdraw");
  };
  const handleUpgradeVip = () => {
    setVipError("");
    setShowVipModal(true);
  };
  
  const handleConfirmUpgradeVip = async () => {
    setVipError("");
    setVipLoading(true);
  
    const token = localStorage.getItem("token");
    if (!token) {
      setVipError("Session expirée, reconnecte-toi.");
      setVipLoading(false);
      navigate("/login");
      return;
    }
  
    try {
      const res = await fetch(buildApiUrl("/api/user/upgrade-vip"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
  
      if (!res.ok) {
        setVipError(data.message || "Erreur lors du passage en VIP.");
      } else {
        const successMsg = data.message || "Tu es maintenant VIP !";
        setToast({ message: successMsg, type: "success" });
        setTimeout(() => setToast(null), 5000);
        setUser((prev) => {
          if (!prev) return prev;
          const expiresAt = data.vip_expires_at || data.vipExpiresAt || prev.vipExpiresAt || null;
          const updated = {
            ...prev,
            balanceCents: data.new_balance_cents,
            vipLevel: data.vipLevel || "VIP",
            vipExpiresAt: expiresAt,
          };
          localStorage.setItem("user", JSON.stringify(updated));
          return updated;
        });
        setShowVipModal(false);
      }
    } catch (err) {
      console.error(err);
      setVipError("Erreur réseau.");
    } finally {
      setVipLoading(false);
    }
  };
  
  const handleAdminClick = () => {
    navigate("/admin/withdrawals");
  };
  const handleAdminDepositsClick = () => {
    navigate("/admin/deposits");
  };
  const handleAdminFinanceClick = () => {
    navigate("/admin/finance");
  };

  const changeLanguage = (code) => {
    setLanguage(code);
    localStorage.setItem("language", code);
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError("");

    if (!file.type.startsWith("image/")) {
      setAvatarError("Merci de choisir une image (JPG, PNG...).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Taille maximale 2 Mo.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setAvatarError("Session expirée, reconnecte-toi.");
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    setAvatarUploading(true);
    try {
      const res = await fetch(buildApiUrl("/api/profile/avatar"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setAvatarError(data.message || "Erreur lors de l'upload.");
      } else {
        setUser((prev) => {
          const updated = { ...(prev || {}), ...data.user };
          localStorage.setItem("user", JSON.stringify(updated));
          return updated;
        });
      }
    } catch (err) {
      console.error(err);
      setAvatarError("Erreur réseau.");
    } finally {
      setAvatarUploading(false);
    }
  };

  if (!user) {
    return null;
  }

  const avatarUrlFull =
    user.avatarUrl && user.avatarUrl.startsWith("http")
      ? user.avatarUrl
      : user.avatarUrl
      ? buildApiUrl(user.avatarUrl)
      : null;

  const historyEvents = (() => {
    const depositEvents =
      history.deposits?.map((d) => ({
        type: "DEPOSIT",
        amountCents: d.amountCents,
        createdAt: d.createdAt,
        status: d.status,
      })) || [];

    const withdrawalEvents =
      history.withdrawals?.map((w) => ({
        type: "WITHDRAW",
        amountCents: w.amountCents,
        status: w.status,
        createdAt: w.createdAt,
      })) || [];

    return [...depositEvents, ...withdrawalEvents]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 6);
  })();

  const adminSeries = (() => {
    if (user?.role !== "admin") return [];
    const days = Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - idx));
      return d;
    });
    const deposits = adminOps.deposits || [];
    const withdrawals = adminOps.withdrawals || [];

    const sumForDate = (items) => {
      return (dateObj) =>
        items
          .filter((it) => {
            const t = new Date(it.createdAt || it.created_at);
            return (
              t.getFullYear() === dateObj.getFullYear() &&
              t.getMonth() === dateObj.getMonth() &&
              t.getDate() === dateObj.getDate()
            );
          })
          .reduce((acc, it) => acc + (it.amountCents || it.amount_cents || 0), 0) / 100;
    };

    const depFor = sumForDate(deposits);
    const witFor = sumForDate(withdrawals);

    return days.map((d) => ({
      date: d.toISOString().slice(0, 10),
      label: `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
        .toString()
        .padStart(2, "0")}`,
      depositsMad: depFor(d),
      withdrawalsMad: witFor(d),
    }));
  })();

  const adminUsersSeries = (() => {
    if (user?.role !== "admin") return [];
    const days = Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - idx));
      return d;
    });
    const daily = adminUsersSummary.daily || [];
    return days.map((d) => {
      const match = daily.find((row) => {
        const rd = new Date(row.d || row.D || row.date);
        return (
          rd.getFullYear() === d.getFullYear() &&
          rd.getMonth() === d.getMonth() &&
          rd.getDate() === d.getDate()
        );
      });
      const label = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
        .toString()
        .padStart(2, "0")}`;
      const total = match ? Number(match.cnt || match.count || 0) : 0;
      const vip = match ? Number(match.vipCount || match.vip || 0) : 0;
      const free = match
        ? Number(
            match.freeCount ??
              match.free ??
              (total - vip)
          )
        : 0;
      return {
        date: d.toISOString().slice(0, 10),
        label,
        total,
        vip: vip < 0 ? 0 : vip,
        free: free < 0 ? 0 : free,
      };
    });
  })();

  const isUserVip = (user?.vipLevel || "").toUpperCase().includes("VIP");
  const vipLabel = isUserVip ? "VIP" : (user?.vipLevel || "FREE");
  const formatVipDate = (d) => {
    try {
      const locale = language === "en" ? "en-GB" : language === "ar" ? "ar-MA" : "fr-FR";
      return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);
    } catch (e) {
      return d.toISOString().slice(0, 10);
    }
  };
  const vipExpiryText =
    isUserVip && vipExpiresAt && !Number.isNaN(vipExpiresAt.getTime())
      ? (language === "en"
          ? `Expires on ${formatVipDate(vipExpiresAt)}${vipDaysLeft != null ? ` (${vipDaysLeft} days left)` : ""}`
          : language === "ar"
            ? `صالحة حتى ${formatVipDate(vipExpiresAt)}${vipDaysLeft != null ? ` (${vipDaysLeft} يوم متبقي)` : ""}`
            : `Expire le ${formatVipDate(vipExpiresAt)}${vipDaysLeft != null ? ` (${vipDaysLeft} jours restants)` : ""}`)
      : null;

  const sidebarLinks = [
    { id: "overview", label: L.menuOverview },
    { id: "history", label: L.menuHistory },
    { id: "profile", label: L.menuProfile },
    { id: "bank", label: L.menuBank },
    { id: "promo", label: L.menuPromo },
    { id: "language", label: L.menuLanguage },
  ];

  return (
    <div
      className="min-h-screen bg-slate-900 text-white"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      {/* Toast notification */}
      {toast && (
        <div className={`fixed right-4 bottom-6 z-40 px-4 py-2 rounded-lg ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'} shadow-lg`}>
          <div className="text-sm font-semibold">{toast.message}</div>
        </div>
      )}
      {/* HEADER */}
      <header className="w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/app-icon.png"
              alt="Windelevery"
              className="h-8 w-8 rounded-xl object-cover"
            />
            <div className={language === "ar" ? "text-right" : ""}>
              <div className="text-sm font-semibold tracking-tight">
                {L.appTitle}
              </div>
              <div className="text-[11px] text-slate-400">
                {L.appSubtitle}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user.role === "admin" && (
              <>
                <button
                  onClick={handleAdminClick}
                  className="text-[11px] border border-indigo-500 px-3 py-1 rounded-lg hover:bg-indigo-600/20 mr-2"
                >
                  Retrait
                </button>
                <button
                  onClick={handleAdminDepositsClick}
                  className="text-[11px] border border-emerald-500 px-3 py-1 rounded-lg hover:bg-emerald-600/20"
                >
                  Dépôts
                </button>
                <button
                  onClick={handleAdminFinanceClick}
                  className="text-[11px] border border-amber-500 px-3 py-1 rounded-lg hover:bg-amber-500/20"
                >
                  Finance
                </button>
              </>
            )}
            {user.role !== "admin" && (
              <button
                onClick={() => navigate("/referrals")}
                className="text-[11px] border border-violet-500 px-3 py-1 rounded-lg hover:bg-violet-600/20"
              >
                Parrainage
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setShowNotifications((s) => !s)}
                className="text-[11px] border border-slate-600 px-3 py-1 rounded-lg hover:bg-slate-800 flex items-center gap-1"
              >
                🔔
                {notifications.length > 0 && (
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-20">
                  <div className="px-3 py-2 text-[11px] text-slate-200 border-b border-slate-700 flex items-center justify-between">
                    <span>Notifications</span>
                    <button
                      className="text-slate-400 hover:text-white"
                      onClick={() => setNotifications([])}
                    >
                      Vider
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-3 py-3 text-[11px] text-slate-400">
                        Aucune notification
                      </div>
                    ) : (
                      notifications
                        .slice()
                        .sort((a, b) => (b.id || 0) - (a.id || 0)) // dernier événement en haut
                        .map((n) => {
                          const isError = n.type === 'error';
                          const isSuccess = n.type === 'success';
                          const badge = isError ? '⛔' : isSuccess ? '✅' : 'ℹ️';
                          return (
                            <div
                              key={n.id}
                              className={`px-3 py-2 text-[11px] border-b border-slate-800 bg-slate-800/60 flex items-start gap-2 rounded-sm border-l-2 ${isError ? 'border-l-red-500' : isSuccess ? 'border-l-emerald-400' : 'border-l-slate-500'}`}
                            >
                              <span className={`${isError ? 'text-red-300' : isSuccess ? 'text-emerald-300' : 'text-slate-200'}`}>
                                {badge}
                              </span>
                              <span className={`${isError ? 'text-red-200' : isSuccess ? 'text-emerald-200' : 'text-slate-200'}`}>
                                {n.message}
                              </span>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* CONTENU AVEC SIDEBAR */}
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col md:flex-row gap-4">
        {/* SIDEBAR */}
        <aside className="md:w-64 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div className="flex items-center gap-3">
            {avatarUrlFull ? (
              <img
                src={avatarUrlFull}
                alt="Avatar"
                className="h-10 w-10 rounded-full object-cover border border-slate-700"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold">
                {user.fullName?.[0]?.toUpperCase() || "U"}
              </div>
            )}
            <div className={language === "ar" ? "text-right" : ""}>
              <div className="text-sm font-semibold">
                {user.fullName || "Utilisateur"}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {user.email}
              </div>
              <div className="text-[11px] text-slate-500">
                ID: {user.id}
              </div>
            </div>
          </div>

          
          {user.role !== "admin" && (
            <div className="mt-2 flex flex-col gap-2">
              {/* Bouton Dépôt : toujours visible */}
              <button
                onClick={openDepositModal}
                className="w-full py-1.5 text-[11px] rounded-lg bg-emerald-600 hover:bg-emerald-700 font-semibold"
              >
                {L.sidebarDeposit}
              </button>

              {/* Si FREE → Go VIP, sinon → Retrait */}
              {user.vipLevel === "FREE" ? (
                <button
                  onClick={handleUpgradeVip}
                  className="w-full py-1.5 text-[11px] rounded-lg bg-indigo-600 hover:bg-indigo-700 font-semibold"
                >
                  Go VIP (80 MAD)
                </button>
              ) : (
                <button
                  onClick={handleWithdrawClick}
                  className="w-full py-1.5 text-[11px] rounded-lg bg-amber-500 hover:bg-amber-600 font-semibold"
                >
                  {L.sidebarWithdraw}
                </button>
              )}
            </div>
          )}
{/* MODAL VIP */}
{showVipModal && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-30">
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 w-full max-w-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold">Deviens VIP ?</h3>
        <button
          className="text-xs text-slate-400 hover:text-slate-200"
          onClick={() => setShowVipModal(false)}
        >
          Fermer
        </button>
      </div>

      <p className="text-xs text-slate-300 mb-2">
        Pour passer en VIP, <span className="font-semibold">80 MAD</span> seront
        retirés de ton solde actuel.
      </p>
      <p className="text-xs text-slate-400 mb-3">
        Avantages (à personnaliser) : accès complet au dépôt et retrait,
        meilleures missions, statut VIP dans ton compte.
      </p>

      <p className="text-xs text-slate-400 mb-3">
        Solde actuel :{" "}
        <span className="font-semibold text-emerald-300">
          {(user.balanceCents || 0) / 100} MAD
        </span>
      </p>

      {vipError && (
        <div className="mb-3 text-xs rounded-lg bg-red-100 text-red-700 px-3 py-2">
          {vipError}
        </div>
      )}

      <button
        className="w-full py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 mb-2"
        onClick={handleConfirmUpgradeVip}
        disabled={vipLoading}
      >
        {vipLoading ? "..." : "Payer 80 MAD et devenir VIP"}
      </button>

      <button
        className="w-full py-2 rounded-lg text-xs border border-slate-600 hover:bg-slate-800"
        onClick={() => setShowVipModal(false)}
      >
        Annuler
      </button>
    </div>
  </div>
)}

          <nav className="pt-2 border-t border-slate-800">
            <p className="text-[11px] text-slate-500 mb-2 uppercase tracking-wide">
              {L.sidebarMenuTitle}
            </p>
            <div className="space-y-1">
              {(user.role === "admin"
                ? sidebarLinks.filter(
                    (link) =>
                      !["history", "bank", "deposit", "withdraw"].includes(
                        link.id
                      )
                  )
                : sidebarLinks
              ).map((link) => (
                <button
                  key={link.id}
                  onClick={() => setActiveSection(link.id)}
                  className={`w-full text-left text-xs px-3 py-2 rounded-lg transition ${
                    activeSection === link.id
                      ? "bg-slate-700 text-white"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {link.label}
                </button>
              ))}
              <button
                onClick={handleLogout}
                className="w-full text-left text-xs px-3 py-2 rounded-lg transition bg-red-600 text-white border border-red-700 hover:bg-red-700 mt-2"
              >
                {L.logout}
              </button>
            </div>
          </nav>
        </aside>

        {/* CONTENU PRINCIPAL */}
        <main className="flex-1">
          {/* OVERVIEW */}
          {activeSection === "overview" && (
            <>
              {user.role === "admin" ? (
                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
                  <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-slate-400">Nouveaux utilisateurs (7 derniers jours)</p>
                      {adminOpsLoading && <span className="text-[10px] text-slate-400">Chargement…</span>}
                    </div>
                    {adminUsersError ? (
                      <p className="text-[11px] text-red-300">{adminUsersError}</p>
                    ) : adminUsersSeries.length === 0 ? (
                      <p className="text-[11px] text-slate-400">Aucune donnée.</p>
                    ) : (
                      (() => {
                        const maxVal = Math.max(
                          1,
                          ...adminUsersSeries.map((x) => (x.free || 0) + (x.vip || 0))
                        );
                        return (
                          <>
                            <div className="flex items-end gap-2 h-32">
                              {adminUsersSeries.map((d) => {
                                const vipHeight = Math.round(((d.vip || 0) / maxVal) * 100);
                                const freeHeight = Math.round(((d.free || 0) / maxVal) * 100);
                                const total = (d.free || 0) + (d.vip || 0);
                                return (
                                  <div key={d.date} className="flex flex-col items-center w-10">
                                    <div className="w-full h-28 rounded-sm bg-slate-700/40 overflow-hidden flex flex-col justify-end">
                                      <div
                                        className="bg-emerald-400/80 w-full"
                                        style={{ height: `${vipHeight}%` }}
                                        title={`${d.vip || 0} VIP`}
                                      />
                                      <div
                                        className="bg-indigo-400/80 w-full"
                                        style={{ height: `${freeHeight}%` }}
                                        title={`${d.free || 0} Free`}
                                      />
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-1">{d.label}</div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 mt-2">
                              <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-indigo-400/80" />
                                <span>Free</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
                                <span>VIP</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-slate-500/80" />
                                <span>Total : {adminUsersSummary.totalUsers || 0}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
                                <span>VIP : {adminUsersSummary.vipCount || 0}</span>
                              </span>
                            </div>
                          </>
                        );
                      })()
                    )}
                  </div>
                  <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-slate-400">Dépôts vs retraits (7 derniers jours)</p>
                      {adminOpsLoading && <span className="text-[10px] text-slate-400">Chargement…</span>}
                    </div>
                    {adminOpsError ? (
                      <p className="text-[11px] text-red-300">{adminOpsError}</p>
                    ) : adminSeries.length === 0 ? (
                      <p className="text-[11px] text-slate-400">Aucune donnée disponible.</p>
                    ) : (
                      <>
                        <div className="flex items-end gap-2 h-36">
                          {adminSeries.map((d) => {
                            const maxVal = Math.max(1, ...adminSeries.map((x) => Math.max(x.depositsMad, x.withdrawalsMad)));
                            const depHeight = Math.round((d.depositsMad / maxVal) * 100);
                            const witHeight = Math.round((d.withdrawalsMad / maxVal) * 100);
                            return (
                              <div key={d.date} className="flex flex-col items-center w-10">
                                <div className="flex flex-col justify-end gap-1 h-28 w-full">
                                  <div
                                    className="w-full rounded-sm bg-emerald-500/70"
                                    style={{ height: `${depHeight}%` }}
                                    title={`Dépôts: ${d.depositsMad.toFixed(2)} MAD`}
                                  />
                                  <div
                                    className="w-full rounded-sm bg-amber-400/80"
                                    style={{ height: `${witHeight}%` }}
                                    title={`Retraits: ${d.withdrawalsMad.toFixed(2)} MAD`}
                                  />
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1">{d.label}</div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Dépôts
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" /> Retraits
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </section>
              ) : (
                <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                  <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-slate-400">{L.overviewBalanceTitle}</p>
                      <button
                        type="button"
                        onClick={() => setShowBalance((v) => !v)}
                        className="text-indigo-300 hover:text-indigo-100 transition p-1 rounded-full"
                        aria-label={showBalance ? "Cacher le solde" : "Afficher le solde"}
                      >
                        {showBalance ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-2xl font-semibold mb-1">
                      {showBalance ? `${((user.balanceCents || 0) / 100).toFixed(2)} MAD` : "••••••"}
                    </p>
                    <p className="text-[11px] text-emerald-300">{L.overviewWelcome}</p>
                  </div>
                  <div
                    className={`relative overflow-hidden rounded-2xl p-4 flex flex-col justify-between ${
                      isUserVip
                        ? "bg-gradient-to-br from-indigo-700 via-purple-700 to-amber-500 border border-amber-300/60 shadow-[0_10px_35px_rgba(234,179,8,0.25)] text-white"
                        : "bg-slate-800/80 border border-slate-700"
                    }`}
                  >
                    {isUserVip && (
                      <>
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.15),transparent_40%),radial-gradient(circle_at_40%_80%,rgba(255,255,255,0.12),transparent_35%)]" />
                        <span className="pointer-events-none absolute top-2 right-4 text-amber-200 text-xl animate-pulse">✦</span>
                        <span className="pointer-events-none absolute bottom-4 left-6 text-indigo-100 animate-ping">✦</span>
                        <span className="pointer-events-none absolute top-8 left-10 text-amber-100 animate-ping">✦</span>
                      </>
                    )}
                    <p className="text-xs text-slate-400 mb-1">{L.overviewVipTitle}</p>
                    <p className="text-2xl font-semibold mb-1">
                      {vipLabel}
                    </p>
                    <p className={`text-[11px] ${isUserVip ? "text-amber-100" : "text-indigo-300"}`}>
                      {vipExpiryText
                        ? vipExpiryText
                        : L.overviewVipHint || (isUserVip ? "Merci d'être VIP ✨" : "")}
                    </p>
                  </div>
                  <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 flex flex-col justify-between">
                    <p className="text-xs text-slate-400 mb-1">Code d'invitation</p>
                    <p className="text-2xl font-semibold mb-1 tracking-[0.08em] text-indigo-300">
                      {referrals?.inviteCode || user.inviteCode || "—"}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Filleuls : {referrals?.invitedCount ?? 0} — Gains : {((referrals?.totalBonusCents ?? 0) / 100).toFixed(2)} MAD
                    </p>
                    {referralError && <p className="text-[10px] text-red-400 mt-1">{referralError}</p>}
                  </div>
                  <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 flex flex-col justify-between">
                    <p className="text-xs text-slate-400 mb-1">Langue actuelle</p>
                    <p className="text-2xl font-semibold mb-1 uppercase">{language}</p>
                    <p className="text-[11px] text-slate-400">Change-la via l’onglet Langue.</p>
                  </div>
                </section>
              )}
              {user.role !== "admin" && (
                <section className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold tracking-tight">
                      {L.tasksSectionTitle}
                    </h2>
                    <button
                      className="text-[11px] px-3 py-1 rounded-full border border-slate-700 hover:bg-slate-800"
                      onClick={() => window.location.reload()}
                    >
                      {L.tasksRefresh}
                    </button>
                  </div>

                  {loadingTasks ? (
                    <p className="text-xs text-slate-400">
                      {L.tasksLoading}
                    </p>
                  ) : tasks.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      {L.tasksNone}
                    </p>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {tasks.map((task) => {
                        const locked = isTaskLockedForUser(task);
                        return (
                          <article
                            key={task.id}
                            className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="text-sm font-semibold">
                                  {task.title}
                                </h3>
                                <span className="text-[11px] px-2 py-1 rounded-full bg-slate-700 text-slate-200">
                                  {L.taskLevelLabel}: {formatTaskLevel(task)}
                                </span>
                              </div>
                              <p className="text-xs text-slate-300 mb-2">
                                {task.description}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {L.taskMinDuration}:{" "}
                                <span className="font-medium">
                                  {task.durationSeconds} s
                                </span>
                              </p>
                              <p className="text-[11px] text-emerald-300">
                                {L.taskReward}:{" "}
                                <span className="font-semibold">
                                  {task.rewardCents / 100} MAD
                                </span>
                              </p>
                              {task.videoUrl && (
                                <p className="text-[11px] text-slate-500 mt-1">
                                  {L.taskVideoHint}
                                </p>
                              )}
                              {locked && (
                                <p className="text-[11px] text-amber-300 mt-2">
                                  Réservé aux comptes VIP.
                                </p>
                              )}
                            </div>
                            <button
                              className={`mt-3 w-full rounded-lg py-2 text-xs font-semibold transition ${
                                locked
                                  ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                                  : "bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99]"
                              }`}
                              onClick={() => !locked && handleOpenTask(task)}
                              disabled={locked}
                            >
                              {locked ? "Réservé VIP" : L.taskStartButton}
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

            </>
          )}

          {/* HISTORIQUE COMPLET */}
          {activeSection === "history" && (
            <section className="mb-10">
              <h2 className="text-sm font-semibold tracking-tight mb-3">
                {L.historyFullTitle}
              </h2>
              {historyLoading ? (
                <p className="text-xs text-slate-400">
                  {L.historyLoading}
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
                    <h3 className="text-xs font-semibold mb-2">
                      {L.historyDepositsTitle}
                    </h3>
                    {history.deposits?.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        {L.historyDepositsNone}
                      </p>
                    ) : (
                      <ul className="text-xs space-y-2 text-slate-300">
                        {history.deposits
                          .slice()
                          .sort(
                            (a, b) =>
                              new Date(b.createdAt).getTime() -
                              new Date(a.createdAt).getTime()
                          )
                          .map((d) => (
                            <li
                              key={d.id}
                              className="flex items-center justify-between border-b border-slate-700/60 pb-1 last:border-b-0 last:pb-0"
                            >
                              <span>
                                {new Date(d.createdAt).toLocaleString()}
                              </span>
                              <div className="flex items-center gap-2">
                                  <div className="flex flex-col items-end">
                                    <span className="text-emerald-300">+{d.amountCents / 100} MAD</span>
                                    {d.depositorFullName && (
                                      <span className="text-[10px] text-slate-400">{d.depositorFullName}</span>
                                    )}
                                  </div>
                                <span>
                                  <StatusBadge status={d.status} />
                                </span>
                              </div>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>

                  <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
                    <h3 className="text-xs font-semibold mb-2">
                      {L.historyWithdrawalsTitle}
                    </h3>
                    {history.withdrawals?.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        {L.historyWithdrawalsNone}
                      </p>
                    ) : (
                      <ul className="text-xs space-y-2 text-slate-300">
                        {history.withdrawals
                          .slice()
                          .sort(
                            (a, b) =>
                              new Date(b.createdAt).getTime() -
                              new Date(a.createdAt).getTime()
                          )
                          .map((w) => (
                            <li
                              key={w.id}
                              className="flex items-center justify-between border-b border-slate-700/60 pb-1 last:border-b-0 last:pb-0"
                            >
                              <div className="flex flex-col">
                                <span>
                                  {new Date(w.createdAt).toLocaleString()}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {L.historyStatusLabel}: {w.status}
                                </span>
                              </div>
                              <span className="text-amber-300">
                                -{w.amountCents / 100} MAD
                              </span>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* PROFIL */}
          {activeSection === "profile" && (
            <section className="mb-10 bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
              <h2 className="text-sm font-semibold tracking-tight mb-3">
                {L.profileSectionTitle}
              </h2>
              <p className="text-[11px] text-slate-400 mb-4">{L.profileHint}</p>

              <div className="mb-4">
                <label className="block text-xs mb-1">
                  {L.avatarLabel}
                </label>
                <div className="flex items-center gap-3">
                  {avatarUrlFull ? (
                    <img
                      src={avatarUrlFull}
                      alt="Avatar"
                      className="h-12 w-12 rounded-full object-cover border border-slate-600"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold">
                      {user.fullName?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                  <div className="flex-1">
                    {avatarError && (
                      <p className="text-[11px] text-red-400 mb-1">
                        {avatarError}
                      </p>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileChange}
                      className="text-[11px] file:text-[11px]"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      {L.avatarHint}
                    </p>
                    {avatarUploading && (
                      <p className="text-[11px] text-slate-300 mt-1">
                        {L.avatarUploading}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  alert(
                    "Ici tu pourras envoyer les nouvelles infos au backend."
                  );
                }}
              >
                <div>
                  <label className="block text-xs mb-1">
                    {L.profileFullNameLabel}
                  </label>
                  <input
                    type="text"
                    value={user.fullName || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setUser((prev) => {
                        if (!prev) return prev;
                        const updated = { ...prev, fullName: value };
                        localStorage.setItem("user", JSON.stringify(updated));
                        return updated;
                      });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs mb-1">
                    {L.profileEmailLabel}
                  </label>
                  <input
                    type="email"
                    value={user.email || ""}
                    disabled
                    className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-sm text-slate-400"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    {L.profileEmailNote}
                  </p>
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700"
                >
                  {L.profileSaveButton}
                </button>
              </form>
            </section>
          )}

          {/* BANQUE */}
          {activeSection === "bank" && (
            <section className="mb-10 bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
              <h2 className="text-sm font-semibold tracking-tight mb-3">
                {L.bankSectionTitle}
              </h2>
              <p className="text-[11px] text-slate-400 mb-4">{L.bankHint}</p>
              <form className="space-y-4" onSubmit={handleSaveBank}>
                <div>
                  <label className="block text-xs mb-1">{L.bankNameLabel}</label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-sm"
                    required
                    disabled={bankLocked}
                  >
                    <option value="">Choisir une banque</option>
                    <option value="CIH">CIH</option>
                    <option value="AWB">AWB</option>
                    <option value="BMCE bank">BMCE bank</option>
                    <option value="CFG">CFG</option>
                    <option value="BCP">BCP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs mb-1">{L.bankIbanLabel}</label>
                  <input
                    value={bankIban}
                    onChange={(e) => setBankIban(e.target.value)}
                    type="text"
                    placeholder="Ton RIB / IBAN"
                    className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-sm"
                    required
                    disabled={bankLocked}
                  />
                </div>

                <div>
                  <label className="block text-xs mb-1">{L.bankHolderLabel}</label>
                  <input
                    value={bankHolder}
                    onChange={(e) => setBankHolder(e.target.value)}
                    type="text"
                    placeholder="Nom du titulaire du compte"
                    className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-sm"
                    required
                    disabled={bankLocked}
                  />
                </div>

                {bankError && (
                  <div className="mb-3 text-xs rounded-lg bg-red-100 text-red-700 px-3 py-2">
                    {bankError}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                    disabled={bankLocked || bankSaving}
                  >
                    {bankSaving ? '...' : L.bankSaveButton}
                  </button>
                  {bankLocked && (
                    <span className="text-xs text-slate-400">Informations bancaires verrouillées</span>
                  )}
                </div>
              </form>
            </section>
          )}

          {/* LANGUE */}
          {activeSection === "language" && (
            <section className="mb-10 bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
              <h2 className="text-sm font-semibold tracking-tight mb-3">
                {L.languageSectionTitle}
              </h2>
              <p className="text-[11px] text-slate-400 mb-4">
                {L.languageHint}
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  className={`px-3 py-2 rounded-lg text-xs border ${
                    language === "fr"
                      ? "bg-indigo-600 border-indigo-500"
                      : "border-slate-600 bg-slate-900"
                  }`}
                  onClick={() => changeLanguage("fr")}
                >
                  {translations.fr.langFrLabel}
                </button>
                <button
                  className={`px-3 py-2 rounded-lg text-xs border ${
                    language === "ar"
                      ? "bg-indigo-600 border-indigo-500"
                      : "border-slate-600 bg-slate-900"
                  }`}
                  onClick={() => changeLanguage("ar")}
                >
                  {translations.ar.langArLabel}
                </button>
                <button
                  className={`px-3 py-2 rounded-lg text-xs border ${
                    language === "en"
                      ? "bg-indigo-600 border-indigo-500"
                      : "border-slate-600 bg-slate-900"
                  }`}
                  onClick={() => changeLanguage("en")}
                >
                  {translations.en.langEnLabel}
                </button>
              </div>
              <p className="text-[11px] text-slate-300">
                {L.languageCurrentLabel}:{" "}
                <span className="font-semibold uppercase">{language}</span>
              </p>
            </section>
          )}

          {/* PROMO CODE (user) */}
          {activeSection === "promo" && (
            <section className="mb-10 bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
              <h2 className="text-sm font-semibold tracking-tight mb-3">Code promo</h2>
              <p className="text-[11px] text-slate-400 mb-3">
                Utilisable une seule fois par utilisateur. Saisis ton code puis valide.
              </p>
              {promoRedeemMessage && (
                <div className="mb-2 text-[11px] rounded bg-emerald-900/60 text-emerald-200 px-3 py-2">
                  {promoRedeemMessage}
                </div>
              )}
              {promoRedeemError && (
                <div className="mb-2 text-[11px] rounded bg-red-900/50 text-red-200 px-3 py-2">
                  {promoRedeemError}
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                <input
                  type="text"
                  value={promoRedeemInput}
                  onChange={(e) => setPromoRedeemInput(e.target.value)}
                  placeholder="Ex: ABCD1234"
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  maxLength={32}
                />
                <button
                  onClick={handleRedeemPromo}
                  disabled={promoRedeemLoading}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {promoRedeemLoading ? "..." : "Valider"}
                </button>
              </div>
            </section>
          )}

          {/* POPUP SESSION EXPIRÉE */}
          {showSessionExpired && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="bg-slate-900 border border-red-500/60 shadow-2xl rounded-2xl p-6 max-w-sm w-[90%] text-center animate-bounce">
                <div className="text-3xl mb-2">😢</div>
                <h3 className="text-lg font-semibold text-red-200 mb-2">Session expirée</h3>
                <p className="text-sm text-slate-200 mb-4">
                  Ta session a expiré après 6 heures, merci de te reconnecter.
                </p>
                <button
                  onClick={() => {
                    setShowSessionExpired(false);
                    handleLogout();
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white"
                >
                  Se reconnecter
                </button>
              </div>
            </div>
          )}

          {/* POPUP FORCE LOGOUT PROMO ROLE */}
          {showPromoForceLogout && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="bg-slate-900 border border-amber-500/60 shadow-2xl rounded-2xl p-6 max-w-sm w-[90%] text-center animate-bounce">
                <div className="text-3xl mb-2">⚠️</div>
                <h3 className="text-lg font-semibold text-amber-200 mb-2">Rôle promo actif</h3>
                <p className="text-sm text-slate-200 mb-4">
                  Pour des raisons de sécurité, reconnecte-toi avant d'utiliser le rôle promo.
                </p>
                <button
                  onClick={() => {
                    setShowPromoForceLogout(false);
                    handleLogout();
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-slate-900"
                >
                  Se reconnecter
                </button>
              </div>
            </div>
          )}

          {/* POPUP FÉLICITATION CODE PROMO */}
          {showPromoCongrats && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="bg-slate-900 border border-emerald-500/60 shadow-2xl rounded-2xl p-6 max-w-sm w-[90%] text-center">
                <div className="text-3xl mb-2">🎉</div>
                <h3 className="text-lg font-semibold text-emerald-200 mb-2">Félicitations !</h3>
                <p className="text-sm text-slate-200 mb-4">{promoCongratsText || "Code appliqué. Montant crédité."}</p>
                <button
                  onClick={() => setShowPromoCongrats(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  OK
                </button>
              </div>
            </div>
          )}

          {/* MODAL CONFIRMATION RÔLE PROMO */}
          {showPromoRoleModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="bg-slate-900 border border-amber-500/60 shadow-2xl rounded-2xl p-5 w-[90%] max-w-sm">
                <h3 className="text-sm font-semibold text-amber-200 mb-3">
                  {promoRoleNextState ? "Activer le rôle promo" : "Désactiver le rôle promo"}
                </h3>
                <p className="text-[11px] text-slate-300 mb-3">
                  Merci d'entrer le mot de passe de confirmation.
                </p>
                {promoRolePasswordError && (
                  <div className="mb-2 text-[11px] rounded bg-red-900/60 text-red-200 px-3 py-2">
                    {promoRolePasswordError}
                  </div>
                )}
                <input
                  type="password"
                  value={promoRolePassword}
                  onChange={(e) => {
                    setPromoRolePasswordError("");
                    setPromoRolePassword(e.target.value);
                  }}
                  placeholder="Mot de passe admin"
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowPromoRoleModal(false)}
                    className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-700 hover:bg-slate-600"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      if (!promoRolePassword || promoRolePassword.length < 3) {
                        setPromoRolePasswordError("Mot de passe requis.");
                        return;
                      }
                      setShowPromoRoleModal(false);
                      handleTogglePromoRole(!!promoRoleNextState, promoRolePassword);
                    }}
                    disabled={promoRoleLoading}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-slate-900 disabled:opacity-60"
                  >
                    {promoRoleLoading ? "..." : "Confirmer"}
                  </button>
                </div>
              </div>
            </div>
          )}


          {/* SUPPORT */}
  {activeSection === "support" && (
    <section className="mb-10 bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
      <h2 className="text-sm font-semibold tracking-tight mb-3">
        {L.supportSectionTitle}
      </h2>
              <p className="text-[11px] text-slate-400 mb-4">
                {L.supportHint}
              </p>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  alert(
                    "Ici tu pourras envoyer la demande au support (backend, email, etc.)."
                  );
                }}
              >
                <div>
                  <label className="block text-xs mb-1">
                    {L.supportSubjectLabel}
                  </label>
                  <input
                    type="text"
                    placeholder={L.supportSubjectPlaceholder}
                    className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs mb-1">
                    {L.supportMessageLabel}
                  </label>
                  <textarea
                    rows={4}
                    placeholder={L.supportMessagePlaceholder}
                    className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700"
                >
                  {L.supportSubmitButton}
                </button>
              </form>
    </section>
  )}

      {/* Floating support button */}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
        {supportOpen && (
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-xl p-3 w-64">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-semibold">{L.supportFabLabel}</p>
              <button
                onClick={() => setSupportOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
                aria-label="Fermer support"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              {L.supportHint || L.supportFabCta}
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setSupportOpen(false);
                  setActiveSection("support");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="px-3 py-2 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-700"
              >
                {L.supportFabCta}
              </button>
            </div>
          </div>
        )}
        <button
          onClick={() => setSupportOpen((v) => !v)}
          className="h-12 w-12 rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-lg flex items-center justify-center text-white"
          aria-label={L.supportFabLabel}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>
        </main>
      </div>

      {/* MODAL VIDÉO */}
      {showPlayer && currentTask && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-20">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold">
                {currentTask.title} — {L.videoModalTitlePrefix}{" "}
                {currentTask.durationSeconds} s
              </h3>
              <button
                className="text-xs text-slate-400 hover:text-slate-200"
                onClick={handleClosePlayer}
              >
                {L.videoModalClose}
              </button>
            </div>

            <div className="aspect-video mb-3 bg-black rounded-lg overflow-hidden">
              <YouTube
                videoId={getYoutubeIdFromUrl(currentTask.videoUrl)}
                className="w-full h-full"
                opts={{
                  width: "100%",
                  height: "100%",
                  playerVars: {
                    autoplay: 1,
                  },
                }}
                onStateChange={handlePlayerStateChange}
              />
            </div>

            <div className="flex items-center justify-between mb-3 text-xs">
              <p className="text-slate-300">
                {L.videoModalTimeSeen}:{" "}
                <span className="font-semibold">
                  {Math.floor(watchedSeconds)} s
                </span>{" "}
                / {currentTask.durationSeconds} s
              </p>
              {!canContinue ? (
                <p className="text-amber-300">
                  {L.videoModalNeedToWatchPrefix}{" "}
                  {currentTask.durationSeconds}{" "}
                  {L.videoModalNeedToWatchSuffix}
                </p>
              ) : (
                <p className="text-emerald-300">
                  {L.videoModalCanContinue}
                </p>
              )}
            </div>

            <button
              className={`w-full py-2 rounded-lg text-sm font-semibold transition ${
                canContinue
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-slate-700 text-slate-400 cursor-not-allowed"
              }`}
              disabled={!canContinue}
              onClick={handleContinueAfterWatch}
            >
              {L.videoModalContinueButton}
            </button>
          </div>
        </div>
      )}

      {/* MODAL DÉPÔT */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-30">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 w-full max-w-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold">
                {L.depositModalTitle}
              </h3>
              <button
                className="text-xs text-slate-400 hover:text-slate-200"
                onClick={closeDepositModal}
              >
                {L.depositModalClose}
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-3">
              {L.depositModalMinPrefix}:{" "}
              <span className="font-semibold">80 MAD</span>
            </p>

            {depositError && (
              <div className="mb-3 text-xs rounded-lg bg-red-100 text-red-700 px-3 py-2">
                {depositError}
              </div>
            )}

              <div className="mb-3">
                <label className="block text-xs mb-1">Nom complet du déposant</label>
                <input
                  type="text"
                  value={depositFullName}
                  onChange={(e) => setDepositFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ex: Mohamed Ali"
                />
              </div>

              <div className="mb-3">
              <label className="block text-xs mb-1">
                {L.depositModalAmountLabel}
              </label>
              <input
                type="number"
                min="80"
                step="1"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Ex: 100"
              />
            </div>

            <button
              className="w-full py-2 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
              onClick={handleConfirmDeposit}
              disabled={depositLoading}
            >
              {depositLoading ? "..." : L.depositModalConfirm}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const s = (status || '').toUpperCase();
  const cls = s === 'PENDING' ? 'bg-yellow-600 text-yellow-100' : s === 'APPROVED' || s === 'CONFIRMED' ? 'bg-emerald-700 text-emerald-100' : s === 'REJECTED' ? 'bg-red-700 text-red-100' : 'bg-slate-700 text-slate-100';
  const labelMap = {
    PENDING: 'En attente',
    CONFIRMED: 'Approuvé',
    APPROVED: 'Approuvé',
    REJECTED: 'non approuvé',
  };
  const label = labelMap[s] || s;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>{label}</span>
  );
}
