import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import YouTube from "react-youtube";
import { buildApiUrl } from "../apiConfig";

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
  const [showVipModal, setShowVipModal] = useState(false);
  const [vipLoading, setVipLoading] = useState(false);
  const [vipError, setVipError] = useState("");
  
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
  const [toast, setToast] = useState(null);

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
      sidebarVip: "VIP",
      sidebarDeposit: "Dépôt",
      sidebarWithdraw: "Retrait",
      sidebarMenuTitle: "Menu",

      menuOverview: "Vue d'ensemble",
      menuHistory: "Historique dépôts/retraits",
      menuProfile: "Paramètres du profil",
      menuBank: "Infos bancaires",
      menuLanguage: "Langue",
      menuSupport: "Service client",

      overviewBalanceTitle: "Solde disponible",
      overviewWelcome: "Bienvenue sur ta promo app",
      overviewTasksCompletedTitle: "Tâches complétées",
      overviewTasksCompletedHint: "Historique détaillé à implémenter",
      overviewVipTitle: "Statut VIP",
      overviewVipHint: "Système d’upgrade à venir",

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
      profileHint:
        "(Formulaire côté front uniquement pour l’instant. Tu pourras plus tard connecter ça à une route API pour mettre à jour le profil.)",
      avatarLabel: "Photo de profil",
      avatarHint: "JPG/PNG, taille max 2 Mo.",
      avatarUploading: "Upload en cours...",
      profileFullNameLabel: "Nom complet",
      profileEmailLabel: "Email",
      profileEmailNote:
        "(Changement d’email : à gérer côté support plus tard.)",
      profileSaveButton: "Enregistrer (dummy)",

      bankSectionTitle: "Informations bancaires",
      bankHint:
        "(Pour l’instant ce formulaire est local. Tu pourras ensuite créer une table \"bank_accounts\" dans ta base et une API pour sauvegarder.)",
      bankNameLabel: "Banque",
      bankIbanLabel: "RIB / IBAN",
      bankHolderLabel: "Titulaire",
      bankSaveButton: "Enregistrer (dummy)",

      languageSectionTitle: "Langue de l'interface",
      languageHint:
        "(Ici on change juste une valeur stockée dans le navigateur. Plus tard tu pourras brancher un système i18n complet.)",
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
      appTitle: "برومو آب",
      appSubtitle: "لوحة ديال الخدمات اللي كتخلص",
      admin: "أدمين",
      logout: "تسجيل الخروج",
      headerBalancePrefix: "الرصيد",

      sidebarBalance: "الرصيد",
      sidebarStatus: "الحالة",
      sidebarVip: "VIP",
      sidebarDeposit: "ديبوزي",
      sidebarWithdraw: "سحب",
      sidebarMenuTitle: "القائمة",

      menuOverview: "الواجهة الرئيسية",
      menuHistory: "تاريخ الديبوزي و السحوبات",
      menuProfile: "إعدادات البروفيـل",
      menuBank: "معلومات البنكية",
      menuLanguage: "اللغة",
      menuSupport: "خدمة الزبناء",

      overviewBalanceTitle: "الرصيد المتاح",
      overviewWelcome: "مرحبا بيك فـ برومو آب",
      overviewTasksCompletedTitle: "الخدمات لي سالّيتي",
      overviewTasksCompletedHint: "تاريخ مفصل نزيدوه من بعد",
      overviewVipTitle: "ستاتيو VIP",
      overviewVipHint: "السيستيم ديال الترقية جاي من بعد",

      tasksSectionTitle: "الخدمات المتاحة",
      tasksRefresh: "تحديت",
      tasksLoading: "كنحمّلو الخدمات...",
      tasksNone: "ما كايناش خدمات دابا.",
      taskLevelLabel: "المستوى",
      taskMinDuration: "أقل مدة",
      taskReward: "الربح",
      taskVideoHint: "فيديو يوتيوب مرتبطة بهاد الخدمة",
      taskStartButton: "بدّي الخدمة",

      historyRecentTitle: "تاريخ مؤخّر",
      historyLoading: "كنحمّلو التاريخ...",
      historyNone: "مازال ما درتي لا ديبوزي لا سحب.",
      historyDepositLabel: "💰 ديبوزي",
      historyWithdrawLabel: "💸 سحب",

      historyFullTitle: "تاريخ الديبوزي و السحوبات",
      historyDepositsTitle: "الديبوزي الخرّانين",
      historyWithdrawalsTitle: "السحوبات الخرّانين",
      historyDepositsNone: "مازال ما درتي حتى ديبوزي.",
      historyWithdrawalsNone: "مازال ما طلبتي حتى سحب.",
      historyStatusLabel: "الحالة",

      profileSectionTitle: "إعدادات البروفيـل",
      profileHint:
        "(دابا غير فورما لوكال. من بعد نربطوه مع API باش يتبدل البروفيـل بصح.)",
      avatarLabel: "تصويرة ديال البروفيـل",
      avatarHint: "JPG/PNG، الماكس 2MO.",
      avatarUploading: "كنطلّع التصويرة...",
      profileFullNameLabel: "السمية كاملة",
      profileEmailLabel: "الإيمايل",
      profileEmailNote:
        "(تبديل الإيمايل يكون من عند السابور من بعد.)",
      profileSaveButton: "سجّل (ديكوراسيون)",

      bankSectionTitle: "المعلومات البنكية",
      bankHint:
        "(دابا غير لوكال. من بعد نقدرون نديرو طابلة bank_accounts و API.)",
      bankNameLabel: "البنك",
      bankIbanLabel: "RIB / IBAN",
      bankHolderLabel: "صاحب الحساب",
      bankSaveButton: "سجّل (ديكوراسيون)",

      languageSectionTitle: "اللغة ديال الواجهة",
      languageHint:
        "(كنبدلو غير فالنافيكطور دابا. من بعد نقدرون نديرو سيستيم ديال الترجمة كامل.)",
      languageCurrentLabel: "اللغة دابا",

      supportSectionTitle: "خدمة الزبناء",
      supportHint:
        "تقدر تكتب لينا المشكل ديالك هنا. من بعد نربطوه مع API ولا إيميل.",
      supportSubjectLabel: "الموضوع",
      supportMessageLabel: "الرسالة",
      supportSubjectPlaceholder:
        "مشكلة فالسحب، الديبوزي، ولا فالحساب...",
      supportMessagePlaceholder:
        "شرح لينا شنو المشكل ولا السؤال ديالك...",
      supportSubmitButton: "صيفط للسابور (ديكوراسيون)",

      depositModalTitle: "دير ديبوزي",
      depositModalMinPrefix: "أقل مبلغ",
      depositModalAmountLabel: "المبلغ (درهم)",
      depositModalConfirm: "أكّد الديبوزي",
      depositModalClose: "سَدّ",

      videoModalTitlePrefix: "خاصّك تشوف على القل",
      videoModalClose: "سَدّ ✕",
      videoModalTimeSeen: "الوقت لي تشاف",
      videoModalNeedToWatchPrefix: "شوف على القل",
      videoModalNeedToWatchSuffix: "تانية باش يتفعّل الزّر.",
      videoModalCanContinue: "✅ دابا تقدر تكمل و تأكّد الخدمة.",
      videoModalContinueButton: "كمّل و أكّد الخدمة",

      langFrLabel: "🇫🇷 Français",
      langArLabel: "🇲🇦 الدارجة المغربية",
      langEnLabel: "🇬🇧 English",
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
      menuSupport: "Support",

      overviewBalanceTitle: "Available balance",
      overviewWelcome: "Welcome to Promo App",
      overviewTasksCompletedTitle: "Completed tasks",
      overviewTasksCompletedHint: "Detailed history coming soon",
      overviewVipTitle: "VIP status",
      overviewVipHint: "Upgrade system coming soon",

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
      profileHint:
        "(For now this form is only local. Later you can connect it to an API to really update your profile.)",
      avatarLabel: "Profile picture",
      avatarHint: "JPG/PNG, max size 2MB.",
      avatarUploading: "Uploading picture...",
      profileFullNameLabel: "Full name",
      profileEmailLabel: "Email",
      profileEmailNote: "(Email change will be handled by support later.)",
      profileSaveButton: "Save (dummy)",

      bankSectionTitle: "Bank information",
      bankHint:
        "(For now this form is local. Later you can create a \"bank_accounts\" table and an API.)",
      bankNameLabel: "Bank",
      bankIbanLabel: "RIB / IBAN",
      bankHolderLabel: "Account holder",
      bankSaveButton: "Save (dummy)",

      languageSectionTitle: "Interface language",
      languageHint:
        "(Right now we only change a value in the browser. Later you can add a real i18n system.)",
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
    alert("Ta session a expiré après 6 heures, merci de te reconnecter.");
    handleLogout();
    return;
  }
}


    const parsedUser = JSON.parse(storedUser);
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
             // Update only if balance or vipLevel changed
             const vipChanged = fresh.vipLevel !== prev.vipLevel;
             if (fresh.balanceCents !== prev.balanceCents || vipChanged) {
               const delta = typeof fresh.balanceCents === 'number' && typeof prev.balanceCents === 'number' ? fresh.balanceCents - prev.balanceCents : null;
               const updated = {
                 ...prev,
                 balanceCents: fresh.balanceCents,
                 vipLevel: fresh.vipLevel,
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
        alert(data.message || "Erreur lors de la tâche");
        return;
      }

      alert(
        `Tâche complétée ! +${data.reward_cents / 100} MAD (nouveau solde : ${
          data.new_balance_cents / 100
        } MAD)`
      );

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
        alert(`(Simulé) Tâche complétée ! +${reward / 100} MAD`);
      } else {
        alert("Erreur réseau");
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
    setDepositAmount("");
    setDepositError("");
    // prefill depositor name with current user's full name when available
    setDepositFullName(user?.fullName || "");
    setShowDepositModal(true);
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
        alert(data.message || "Tu es maintenant VIP !");
        setUser((prev) => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            balanceCents: data.new_balance_cents,
            vipLevel: data.vipLevel || "VIP",
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
  const handleAddVideoClick = () => {
    navigate("/admin/tasks");
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

  const sidebarLinks = [
    { id: "overview", label: L.menuOverview },
    { id: "history", label: L.menuHistory },
    { id: "profile", label: L.menuProfile },
    { id: "bank", label: L.menuBank },
    { id: "language", label: L.menuLanguage },
    { id: "support", label: L.menuSupport },
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
            <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center text-sm font-bold">
              P
            </div>
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
                  onClick={handleAddVideoClick}
                  className="text-[11px] border border-emerald-500 px-3 py-1 rounded-lg hover:bg-emerald-600/20 mr-2"
                >
                  Ajouter vidéo
                </button>
                <button
                  onClick={handleAdminClick}
                  className="text-[11px] border border-indigo-500 px-3 py-1 rounded-lg hover:bg-indigo-600/20 mr-2"
                >
                  {L.admin}
                </button>
                <button
                  onClick={handleAdminDepositsClick}
                  className="text-[11px] border border-emerald-500 px-3 py-1 rounded-lg hover:bg-emerald-600/20"
                >
                  Dépôts (admin)
                </button>
              </>
            )}
            <button
              onClick={() => navigate("/referrals")}
              className="text-[11px] border border-violet-500 px-3 py-1 rounded-lg hover:bg-violet-600/20"
            >
              Parrainage
            </button>
            <div className="relative">
              <button
                onClick={() => setShowNotifications((s) => !s)}
                className="text-[11px] border border-slate-600 px-3 py-1 rounded-lg hover:bg-slate-800 flex items-center gap-1"
              >
                🔔 Notifications
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
            <span className="px-3 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              {L.headerBalancePrefix} : {(user.balanceCents || 0) / 100} MAD
            </span>
            <button
              className="text-[11px] border border-slate-600 px-3 py-1 rounded-lg hover:bg-slate-800"
              onClick={handleLogout}
            >
              {L.logout}
            </button>
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

          <div className="text-xs bg-slate-800/80 rounded-xl p-3 border border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">{L.sidebarBalance}</span>
              <span className="font-semibold text-emerald-300">
                {(user.balanceCents || 0) / 100} MAD
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{L.sidebarStatus}</span>
              <span className="text-indigo-300">
                {L.sidebarVip} {user.vipLevel || "FREE"}
              </span>
            </div>
            </div>
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
              {sidebarLinks.map((link) => (
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
            </div>
          </nav>
        </aside>

        {/* CONTENU PRINCIPAL */}
        <main className="flex-1">
          {/* OVERVIEW */}
          {activeSection === "overview" && (
            <>
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 flex flex-col justify-between">
                  <p className="text-xs text-slate-400 mb-1">
                    {L.overviewBalanceTitle}
                  </p>
                  <p className="text-2xl font-semibold mb-1">
                    {(user.balanceCents || 0) / 100} MAD
                  </p>
                  <p className="text-[11px] text-emerald-300">
                    {L.overviewWelcome}
                  </p>
                </div>

                <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 flex flex-col justify-between">
                  <p className="text-xs text-slate-400 mb-1">
                    {L.overviewTasksCompletedTitle}
                  </p>
                  <p className="text-2xl font-semibold mb-1">—</p>
                  <p className="text-[11px] text-slate-400">
                    {L.overviewTasksCompletedHint}
                  </p>
                </div>

                <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 flex flex-col justify-between">
                  <p className="text-xs text-slate-400 mb-1">
                    {L.overviewVipTitle}
                  </p>
                  <p className="text-2xl font-semibold mb-1">
                    {user.vipLevel || "FREE"}
                  </p>
                  <p className="text-[11px] text-indigo-300">
                    {L.overviewVipHint}
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
                  {referralError && (
                    <p className="text-[10px] text-red-400 mt-1">{referralError}</p>
                  )}
                </div>
              </section>

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
                                {L.taskLevelLabel}: {task.minVipLevel || "FREE"}
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
