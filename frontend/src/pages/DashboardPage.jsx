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

// Générer une URL d'avatar externe basé sur le nom de l'utilisateur
const generateDefaultAvatar = (userId, fullName, style = 'avataaars') => {
  // Utiliser le service DiceBear pour générer des avatars cohérents
  // Styles disponibles: avataaars, bottts, fun-emoji, identicon, initials, lorelei, micah, personas, pixel-art
  const seed = fullName ? fullName.replace(/\s+/g, '-').toLowerCase() : `user-${userId}`;
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&backgroundColor=transparent&radius=50`;
};

// Déterminer le style de bordure VIP selon le dailyRateCents
const getVipBorderStyle = (dailyRateCents) => {
  console.log('🎨 getVipBorderStyle appelée avec dailyRateCents:', dailyRateCents);
  
  if (!dailyRateCents || dailyRateCents === 0) {
    console.log('❌ Pas de bordure VIP (FREE ou dailyRateCents = 0)');
    return null; // Pas de bordure pour FREE
  }
  
  if (dailyRateCents >= 2000) {
    // Diamond - VIP 500 MAD
    console.log('💎 DIAMOND détecté');
    return {
      gradient: 'from-cyan-400 via-blue-400 to-purple-400',
      shadow: 'shadow-cyan-400/50',
      glow: 'bg-cyan-400/20',
      label: 'DIAMOND',
      animated: true // Animation spéciale pour Diamond
    };
  } else if (dailyRateCents >= 1500) {
    // Gold - VIP 300 MAD
    console.log('🥇 GOLD détecté');
    return {
      gradient: 'from-yellow-400 via-amber-400 to-yellow-500',
      shadow: 'shadow-yellow-400/50',
      glow: 'bg-yellow-400/20',
      label: 'GOLD'
    };
  } else if (dailyRateCents >= 800) {
    // Silver - VIP 150 MAD
    console.log('🥈 SILVER détecté');
    return {
      gradient: 'from-slate-300 via-gray-200 to-slate-400',
      shadow: 'shadow-slate-300/50',
      glow: 'bg-slate-300/20',
      label: 'SILVER'
    };
  } else if (dailyRateCents >= 500) {
    // Bronze - VIP 80 MAD
    console.log('🥉 BRONZE détecté');
    return {
      gradient: 'from-orange-400 via-amber-600 to-orange-500',
      shadow: 'shadow-orange-400/50',
      glow: 'bg-orange-400/20',
      label: 'BRONZE'
    };
  }
  
  console.log('❌ Aucun niveau VIP correspondant');
  return null;
};

// Convertir les URLs des plateformes sociales en URLs embed
const getEmbedUrl = (url, platform) => {
  if (platform === 'facebook') {
    // Extraire l'ID de la vidéo Facebook
    const match = url.match(/[?&]v=(\d+)/);
    if (match) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&width=734`;
    }
  } else if (platform === 'tiktok') {
    // Extraire l'ID de la vidéo TikTok
    const match = url.match(/video\/(\d+)/);
    if (match) {
      return `https://www.tiktok.com/embed/v2/${match[1]}`;
    }
  } else if (platform === 'instagram') {
    // Extraire l'ID du reel Instagram
    const match = url.match(/reel\/([^/]+)/);
    if (match) {
      return `https://www.instagram.com/reel/${match[1]}/embed`;
    }
  }
  return url;
};

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState(null); // null = page de sélection, 'youtube'/'facebook'/etc = plateforme sélectionnée

  const [history, setHistory] = useState({ deposits: [], withdrawals: [] });
  
  const [historyLoading, setHistoryLoading] = useState(true);
  const [referrals, setReferrals] = useState(null);
  const [referralError, setReferralError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);
  const lastStatusesRef = useRef({ deposits: {}, withdrawals: {} });
  const statusCacheKey = "dashboard_status_cache";
  
  const [activeSection, setActiveSection] = useState("overview");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordModalMessage, setPasswordModalMessage] = useState("");
  const [passwordModalType, setPasswordModalType] = useState("success"); // 'success', 'error', or 'info'

  const navigate = useNavigate();

  const [showPlayer, setShowPlayer] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [canContinue, setCanContinue] = useState(false);
  const [playerLoading, setPlayerLoading] = useState(true);
  const [hasLikedCurrentVideo, setHasLikedCurrentVideo] = useState(false);
  const [needsLike, setNeedsLike] = useState(false);
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
  const [selectedVipPlan, setSelectedVipPlan] = useState(null);
  const [showVipFeaturesPopup, setShowVipFeaturesPopup] = useState(null); // Plan number to show features
  const [showVipSuccessPopup, setShowVipSuccessPopup] = useState(false);
  const [vipSuccessData, setVipSuccessData] = useState({ planName: '', price: 0, dailyRate: 0, months: 0 });
  const [vipPromoCode, setVipPromoCode] = useState("");
  const [showInsufficientBalanceModal, setShowInsufficientBalanceModal] = useState(false);
  const [requiredAmount, setRequiredAmount] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState({ reward: 0, newBalance: 0 });
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showTimeLimitModal, setShowTimeLimitModal] = useState(false);
  const [timeLimitMessage, setTimeLimitMessage] = useState("");
  const [timeLimitOperation, setTimeLimitOperation] = useState("");
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
  const [showLikePopup, setShowLikePopup] = useState(false);
  const [showUpgradeErrorModal, setShowUpgradeErrorModal] = useState(false);
  const [upgradeErrorMessage, setUpgradeErrorMessage] = useState("");
  
  // Daily earnings tracking
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(0);

  // Trial period tracking (3 days for FREE users)
  const [trialExpired, setTrialExpired] = useState(false);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(null);

  // Spin Wheel state
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState(null);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [canActuallySpin, setCanActuallySpin] = useState(false);
  const [spinMessage, setSpinMessage] = useState("");
  const [randomWinningMessage, setRandomWinningMessage] = useState("");

  // Protection contre les appels multiples de handleCompleteTask (useRef = synchrone)
  const isCompletingTaskRef = useRef(false);

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

  // Rate Stores state
  const [selectedStore, setSelectedStore] = useState(null);
  const [storeProducts, setStoreProducts] = useState([]);
  const [productRatings, setProductRatings] = useState({});
  const [productComments, setProductComments] = useState({});
  const [productRewards, setProductRewards] = useState({});
  const [validatedProducts, setValidatedProducts] = useState({});
  const [validatingProduct, setValidatingProduct] = useState(null);
  const [completedStores, setCompletedStores] = useState([]); // Stores completed by FREE users (can't redo)

  // Store products data
  const allStoreProducts = {
    marjane: [
      { id: 'm1', name: 'Huile d\'olive extra vierge 1L', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=200', price: '89.90 MAD' },
      { id: 'm2', name: 'Lait entier UHT 1L', image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200', price: '12.50 MAD' },
      { id: 'm3', name: 'Riz basmati 5kg', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200', price: '65.00 MAD' },
      { id: 'm4', name: 'Café moulu 500g', image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=200', price: '45.00 MAD' },
      { id: 'm5', name: 'Sucre blanc 2kg', image: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=200', price: '22.00 MAD' },
      { id: 'm6', name: 'Farine de blé 5kg', image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=200', price: '35.00 MAD' },
    ],
    carrefour: [
      { id: 'c1', name: 'Poulet fermier entier', image: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=200', price: '75.00 MAD' },
      { id: 'c2', name: 'Fromage Gouda 400g', image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=200', price: '42.00 MAD' },
      { id: 'c3', name: 'Jus d\'orange 2L', image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=200', price: '28.00 MAD' },
      { id: 'c4', name: 'Biscuits au chocolat 300g', image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=200', price: '18.50 MAD' },
      { id: 'c5', name: 'Yaourt nature pack 12', image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=200', price: '35.00 MAD' },
      { id: 'c6', name: 'Pain de mie 500g', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200', price: '15.00 MAD' },
    ],
    jumia: [
      { id: 'j1', name: 'Smartphone Samsung Galaxy A54', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200', price: '4299.00 MAD' },
      { id: 'j2', name: 'Écouteurs Bluetooth TWS', image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200', price: '299.00 MAD' },
      { id: 'j3', name: 'Montre connectée Xiaomi', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200', price: '599.00 MAD' },
      { id: 'j4', name: 'Sac à dos laptop 15.6"', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200', price: '189.00 MAD' },
      { id: 'j5', name: 'Chargeur rapide USB-C 65W', image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=200', price: '149.00 MAD' },
      { id: 'j6', name: 'Coque iPhone 14 Pro', image: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=200', price: '79.00 MAD' },
    ],
    electroplanet: [
      { id: 'e1', name: 'TV LED 55" 4K Smart', image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=200', price: '5999.00 MAD' },
      { id: 'e2', name: 'Climatiseur Split 12000 BTU', image: 'https://images.unsplash.com/photo-1631545806609-5f0c4f5ff2dd?w=200', price: '4500.00 MAD' },
      { id: 'e3', name: 'Machine à laver 8kg', image: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=200', price: '3299.00 MAD' },
      { id: 'e4', name: 'Réfrigérateur No Frost 400L', image: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=200', price: '6999.00 MAD' },
      { id: 'e5', name: 'Micro-ondes 25L', image: 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=200', price: '899.00 MAD' },
      { id: 'e6', name: 'Aspirateur sans fil', image: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=200', price: '1499.00 MAD' },
    ],
    supeco: [
      { id: 's1', name: 'Pack eau minérale 6x1.5L', image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=200', price: '18.00 MAD' },
      { id: 's2', name: 'Savon liquide 1L', image: 'https://images.unsplash.com/photo-1584305574647-0cc949a2bb9f?w=200', price: '25.00 MAD' },
      { id: 's3', name: 'Papier toilette pack 12', image: 'https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=200', price: '32.00 MAD' },
      { id: 's4', name: 'Détergent lessive 3kg', image: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=200', price: '55.00 MAD' },
      { id: 's5', name: 'Thon en conserve pack 4', image: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=200', price: '48.00 MAD' },
      { id: 's6', name: 'Pâtes alimentaires 1kg', image: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=200', price: '14.00 MAD' },
    ],
  };

  // Function to get random products from a store (2 for FREE, 3 for VIP)
  const getRandomProducts = (storeName) => {
    const products = allStoreProducts[storeName] || [];
    const shuffled = [...products].sort(() => 0.5 - Math.random());
    // FREE users get 2 tasks, VIP users get 3 tasks
    const isVip = user?.vipLevel === 'VIP';
    const taskCount = isVip ? 3 : 2;
    return shuffled.slice(0, taskCount);
  };

  // Generate random reward: FREE users 0.5-1 MAD, VIP users 0.5-3 MAD
  const generateRandomReward = () => {
    const min = 0.5;
    const isVip = user?.vipLevel === 'VIP';
    const max = isVip ? 3 : 1;
    return (Math.random() * (max - min) + min).toFixed(2);
  };

  // Handle store selection
  const handleSelectStore = (storeName) => {
    setSelectedStore(storeName);
    const randomProducts = getRandomProducts(storeName);
    setStoreProducts(randomProducts);
    setProductRatings({});
    setProductComments({});
    setValidatedProducts({});
    // Generate rewards for each product
    const rewards = {};
    randomProducts.forEach(p => {
      rewards[p.id] = generateRandomReward();
    });
    setProductRewards(rewards);
  };

  // Handle rating change
  const handleRatingChange = (productId, rating) => {
    setProductRatings(prev => ({ ...prev, [productId]: rating }));
  };

  // Handle comment change
  const handleCommentChange = (productId, comment) => {
    setProductComments(prev => ({ ...prev, [productId]: comment }));
  };

  // Validate individual product task
  const handleValidateProduct = async (productId) => {
    // Check if product has been rated
    if (!productRatings[productId] || productRatings[productId] < 1) {
      setErrorMessage(L.rateProductFirst || 'Veuillez d\'abord noter ce produit (1-5 étoiles).');
      setShowErrorModal(true);
      return;
    }

    setValidatingProduct(productId);
    
    try {
      const token = localStorage.getItem("token");
      const product = storeProducts.find(p => p.id === productId);
      const rewardMAD = parseFloat(productRewards[productId]);
      const rewardCents = Math.round(rewardMAD * 100);
      
      const res = await fetch(buildApiUrl('/api/rate-store/complete'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          storeName: selectedStore,
          productId: productId,
          productName: product.name,
          rating: productRatings[productId],
          comment: productComments[productId] || '',
          rewardCents: rewardCents,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setErrorMessage(data.message || 'Erreur lors de la validation.');
        setShowErrorModal(true);
        setValidatingProduct(null);
        return;
      }
      
      // Mark as validated
      setValidatedProducts(prev => {
        const newValidated = { ...prev, [productId]: true };
        
        // Check if all products in this store are validated (for FREE users)
        const isVip = user?.vipLevel === 'VIP';
        if (!isVip) {
          const allValidated = storeProducts.every(p => newValidated[p.id]);
          if (allValidated && selectedStore) {
            // Mark this store as completed for FREE user
            setCompletedStores(prevStores => {
              if (!prevStores.includes(selectedStore)) {
                return [...prevStores, selectedStore];
              }
              return prevStores;
            });
          }
        }
        
        return newValidated;
      });
      setValidatingProduct(null);
      
      // Update user balance in state
      if (data.new_balance_cents !== undefined) {
        setUser(prev => ({
          ...prev,
          balanceCents: data.new_balance_cents,
        }));
      }
      
      // Update today's earnings
      if (data.reward_cents) {
        setTodayEarnings(prev => prev + data.reward_cents);
      }

      // Show success toast
      const reward = productRewards[productId];
      setToast({ type: 'success', message: (L.taskValidated || 'Tâche validée ! +{reward} MAD').replace('{reward}', reward) });
      setTimeout(() => setToast(null), 3000);
      
    } catch (err) {
      console.error('Erreur validation produit:', err);
      setErrorMessage('Erreur de connexion au serveur.');
      setShowErrorModal(true);
      setValidatingProduct(null);
    }
  };
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

      menuOverview: "Vue",
          menuHistory: "Historique dépôts/retraits",
          menuProfile: "Paramètres du profil",
          menuBank: "Infos bancaires",
          menuLanguage: "Langue",
          menuPromo: "Code promo",
          menuSupport: "Service client",
          menuDownload: "Télécharger l'app",

      downloadSectionTitle: "Télécharger l'application",
      downloadHint: "Installez notre application Android pour un accès plus rapide.",
      downloadButton: "Télécharger l'APK Android",
      downloadNote: "L'application sera bientôt disponible sur Google Play.",

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
      bankSaveButton: "Enregistrer",

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
      supportSubmitButton: "Envoyer au support",
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
      appSubtitle: "لوحة المهام لي كتخلّص بالدرهم المغربي",
      admin: "أدمين",
      logout: "خرج",
      headerBalancePrefix: "الفلوس",

      sidebarBalance: "الفلوس",
      sidebarStatus: "الحالة",
      sidebarVip: "ڤيپ",
      sidebarDeposit: "شارج",
      sidebarWithdraw: "سحب",
      sidebarMenuTitle: "المينو",

      menuOverview: "الصفحة الرئيسية",
          menuHistory: "تاريخ الشحن والسحب",
          menuProfile: "إعدادات الپروفيل",
          menuBank: "معلومات البنكة",
          menuLanguage: "اللغة",
          menuPromo: "كود پرومو",
          menuSupport: "الدعم",
          menuDownload: "تحميل التطبيق",

      downloadSectionTitle: "تحميل التطبيق",
      downloadHint: "ثبت تطبيقنا على الأندرويد باش توصل بسرعة.",
      downloadButton: "تحميل APK أندرويد",
      downloadNote: "التطبيق غادي يكون متوفر قريبا على Google Play.",

      overviewBalanceTitle: "الفلوس المتاحة (درهم مغربي)",
      overviewWelcome: "",
      overviewTasksCompletedTitle: "المهام لي دارو",
      overviewTasksCompletedHint: "التاريخ الكامل قريب",
      overviewVipTitle: "الحالة",
      overviewVipHint: "",

      tasksSectionTitle: "المهام المتاحة",
      tasksRefresh: "عاود شوف",
      tasksLoading: "كنحمّلو المهام...",
      tasksNone: "ماكاينش مهام دابا.",
      taskLevelLabel: "المستوى",
      taskMinDuration: "المدة الأقل",
      taskReward: "الربح",
      taskVideoHint: "فيديو يوتوب ديال المهمة",
      taskStartButton: "بدا المهمة",

      historyRecentTitle: "التاريخ الأخير",
      historyLoading: "كنحمّلو التاريخ...",
      historyNone: "ماكاين لا شحن لا سحب.",
      historyDepositLabel: "شحن",
      historyWithdrawLabel: "سحب",

      historyFullTitle: "تاريخ الشحن والسحب",
      historyDepositsTitle: "آخر الشحنات",
      historyWithdrawalsTitle: "آخر السحوبات",
      historyDepositsNone: "ماكاين حتى شحن.",
      historyWithdrawalsNone: "ماكاين حتى سحب.",
      historyStatusLabel: "الحالة",

      profileSectionTitle: "إعدادات الپروفيل",
      profileHint: "",
      avatarLabel: "صورة الپروفيل",
      avatarHint: "JPG/PNG حتى 2 ميغا.",
      avatarUploading: "كنرفعو الصورة...",
      profileFullNameLabel: "السمية الكاملة",
      profileEmailLabel: "الإيميل",
      profileEmailNote:
        "(تبديل الإيميل يتدار مع الدعم.)",
      profileSaveButton: "سجّل",

      bankSectionTitle: "معلومات البنكة (المغرب)",
      bankHint: "",
      bankNameLabel: "البنك المغربي",
      bankIbanLabel: "RIB / IBAN",
      bankHolderLabel: "صاحب الحساب",
      bankSaveButton: "سجّل",

      languageSectionTitle: "لغة الواجهة",
      languageHint: "",
      languageCurrentLabel: "اللغة الحالية",

      supportSectionTitle: "مركز الدعم",
      supportHint:
        "كتب مشكلتك هنا. من بعد نقدرو نبعتها للدعم.",
      supportSubjectLabel: "الموضوع",
      supportMessageLabel: "الرسالة",
      supportSubjectPlaceholder:
        "مشكلة فالسحب، الشحن، الحساب...",
      supportMessagePlaceholder:
        "شرح لينا المشكل ديالك...",
      supportSubmitButton: "صيفط للدعم",
      supportFabLabel: "الدعم",
      supportFabCta: "افتح الدعم",

      depositModalTitle: "شحن الحساب",
      depositModalMinPrefix: "أقل مبلغ",
      depositModalAmountLabel: "المبلغ بالدرهم المغربي (MAD)",
      depositModalConfirm: "أكّد الشحن",
      depositModalClose: "سد",

      videoModalTitlePrefix: "شوف على الأقل",
      videoModalClose: "سد",
      videoModalTimeSeen: "الوقت لي شفتي",
      videoModalNeedToWatchPrefix: "شوف على الأقل",
      videoModalNeedToWatchSuffix: "ثانية باش يتفعّل الزر.",
      videoModalCanContinue: "✅ دابا تقدر تكمل وتأكد المهمة.",
      videoModalContinueButton: "كمل وأكد المهمة",

      langFrLabel: "🇫🇷 فرونصي",
      langArLabel: "🇲🇦 الدارجة المغربية",
      langEnLabel: "🇬🇧 نڭليزية",
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
          menuDownload: "Download App",

      downloadSectionTitle: "Download Application",
      downloadHint: "Install our Android app for faster access.",
      downloadButton: "Download Android APK",
      downloadNote: "The app will soon be available on Google Play.",

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
      profileSaveButton: "Save",

      bankSectionTitle: "Bank information",
      bankHint: "",
      bankNameLabel: "Bank",
      bankIbanLabel: "RIB / IBAN",
      bankHolderLabel: "Account holder",
      bankSaveButton: "Save",

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
      supportSubmitButton: "Send to support",
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
      // Ne pas afficher automatiquement les notifications
    };

    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (!storedUser || !token) {
      navigate("/login");
      return;
    }

    // Rediriger les superadmins vers leur dashboard dédié
    const parsedUserCheck = JSON.parse(storedUser);
    console.log('👤 Utilisateur chargé depuis localStorage:', parsedUserCheck);
    console.log('💰 dailyRateCents:', parsedUserCheck?.dailyRateCents);
    
    if (parsedUserCheck?.role === 'superadmin') {
      navigate("/superadmin");
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

    const fetchTasks = async (platform = 'youtube') => {
      try {
        const endpoint = platform === 'youtube' ? '/api/tasks' : `/api/tasks/${platform}`;
        const res = await fetch(buildApiUrl(endpoint), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (!res.ok) {
          console.error(data);
          // use freshly generated fallback tasks so UI remains functional for tests
          if (platform === 'youtube') {
            setTasks(generateDefaultTasks(6));
          } else {
            setTasks([]);
          }
        } else {
          // backend might return an array or an object like { tasks: [...] }
          if (!data) {
            if (platform === 'youtube') {
              setTasks(generateDefaultTasks(6));
            } else {
              setTasks([]);
            }
          } else if (Array.isArray(data)) {
            // If backend returned an array with 0 or more items
            if (data.length === 0 && platform === 'youtube') {
              setTasks(generateDefaultTasks(6));
            } else {
              setTasks(data);
            }
          } else if (Array.isArray(data.tasks)) {
            if (data.tasks.length === 0 && platform === 'youtube') {
              setTasks(generateDefaultTasks(6));
            } else {
              setTasks(data.tasks);
            }
          } else {
            // Unexpected shape — fall back to generated tasks
            if (platform === 'youtube') {
              setTasks(generateDefaultTasks(6));
            } else {
              setTasks([]);
            }
          }
        }
      } catch (err) {
        console.error(err);
        // network error → generate fallback tasks
        if (platform === 'youtube') {
          setTasks(generateDefaultTasks(6));
        } else {
          setTasks([]);
        }
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

    const fetchDailyEarnings = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(buildApiUrl("/api/user/daily-earnings"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setTodayEarnings(data.todayEarningsCents || 0);
          setDailyLimit(data.dailyLimitCents || 0);
        }
      } catch (err) {
        console.error(err);
      }
    };

    // Rafraîchir les infos utilisateur depuis le backend pour avoir dailyRateCents
    const refreshUserData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(buildApiUrl("/api/user/me"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const { user: fresh } = await res.json();
          if (fresh) {
            // Update trial status
            setTrialExpired(fresh.trialExpired || false);
            setTrialDaysRemaining(fresh.trialDaysRemaining);
            
            setUser((prev) => {
              const updated = {
                ...prev,
                ...fresh,
                dailyRateCents: fresh.dailyRateCents ?? prev?.dailyRateCents ?? 0,
              };
              localStorage.setItem('user', JSON.stringify(updated));
              return updated;
            });
          }
        }
      } catch (err) {
        console.error("Error refreshing user data:", err);
      }
    };

    // Check if user can spin the weekly wheel (only once per login session)
    const checkSpinWheel = async () => {
      // Check if already shown this session (per user)
      const sessionKey = `spinWheelShown_${parsedUser?.id || 'unknown'}`;
      const shownThisSession = sessionStorage.getItem(sessionKey);
      if (shownThisSession) {
        return; // Don't show again this session
      }
      
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(buildApiUrl("/api/spin-wheel/can-spin"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.showPopup) {
          setShowSpinWheel(true);
          setCanActuallySpin(data.canSpin);
          setSpinMessage(data.message || "");
          // Mark as shown for this session (per user)
          sessionStorage.setItem(sessionKey, "true");
        }
      } catch (err) {
        console.error("Error checking spin wheel:", err);
      }
    };

    // Fetch today's completed stores (for daily reset at midnight)
    const fetchTodayCompletedStores = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(buildApiUrl("/api/rate-store/today-completed"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.completedStores) {
          setCompletedStores(data.completedStores);
        }
      } catch (err) {
        console.error("Error fetching today's completed stores:", err);
      }
    };
    
    refreshUserData();
    fetchTasks();
    fetchHistory();
    fetchBank();
    fetchReferrals();
    fetchDailyEarnings();
    fetchAdminOps();
    checkSpinWheel();
    fetchTodayCompletedStores();

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
          
          // Update trial status
          setTrialExpired(fresh.trialExpired || false);
          setTrialDaysRemaining(fresh.trialDaysRemaining);
          
          setUser((prev) => {
            if (!prev) return prev;
            // Update only if balance or VIP status/expiry changed
            const vipChanged = fresh.vipLevel !== prev.vipLevel || fresh.vipExpiresAt !== prev.vipExpiresAt;
            const dailyRateChanged = fresh.dailyRateCents !== prev.dailyRateCents;
            if (fresh.balanceCents !== prev.balanceCents || vipChanged || dailyRateChanged) {
              const delta = typeof fresh.balanceCents === 'number' && typeof prev.balanceCents === 'number' ? fresh.balanceCents - prev.balanceCents : null;
              const updated = {
                ...prev,
                balanceCents: fresh.balanceCents,
                vipLevel: fresh.vipLevel,
                vipExpiresAt: fresh.vipExpiresAt ?? prev.vipExpiresAt,
                dailyRateCents: fresh.dailyRateCents ?? prev.dailyRateCents ?? 0,
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
                setNotifications((prev) => [{ id: Date.now(), message: 'الترقية ديالك لڤيپ تأكدات.', type: 'success' }, ...prev].slice(0, 10));
                // Ne pas afficher automatiquement les notifications
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

  // Gérer le clic en dehors du panneau de notifications
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  // Random user winnings display
  useEffect(() => {
    const winningMessages = [
      "Najima a gagné 300 MAD",
      "Nassim a gagné dans la roue 7 MAD",
      "Karim a gagné 150 MAD",
      "Fatima a gagné dans la roue 12 MAD",
      "Ahmed a gagné 250 MAD",
      "Samira a gagné dans la roue 5 MAD",
      "Youssef a gagné 180 MAD",
      "Amina a gagné dans la roue 9 MAD",
      "Omar a gagné 220 MAD",
      "Laila a gagné dans la roue 15 MAD",
      "Hassan a gagné 400 MAD",
      "Zineb a gagné dans la roue 8 MAD",
      "Mehdi a gagné 120 MAD",
      "Khadija a gagné dans la roue 11 MAD",
      "Ali a gagné 350 MAD",
      "Salma a gagné dans la roue 6 MAD",
      "Mustapha a gagné 275 MAD",
      "Nawal a gagné dans la roue 10 MAD",
      "Rachid a gagné 190 MAD",
      "Jamila a gagné dans la roue 13 MAD",
      "Tariq a gagné 280 MAD",
      "Hind a gagné dans la roue 4 MAD",
      "Abdelatif a gagné 210 MAD",
      "Fatiha a gagné dans la roue 14 MAD",
      "Mohammed a gagné 320 MAD",
      "Souad a gagné dans la roue 3 MAD",
      "Driss a gagné 175 MAD",
      "Rabia a gagné dans la roue 16 MAD",
      "Brahim a gagné 240 MAD",
      "Malika a gagné dans la roue 2 MAD",
      "Said a gagné 290 MAD",
      "Houria a gagné dans la roue 17 MAD",
      "El Hassan a gagné 160 MAD",
      "Naima a gagné dans la roue 18 MAD",
      "Moulay a gagné 310 MAD",
      "Zahra a gagné dans la roue 19 MAD",
      "Abdellah a gagné 260 MAD",
      "Siham a gagné dans la roue 20 MAD",
      "Tarik a gagné 230 MAD",
      "Asmaa a gagné dans la roue 21 MAD",
      "Hamid a gagné 375 MAD",
      "Latifa a gagné dans la roue 22 MAD",
      "Mounir a gagné 140 MAD",
      "Safia a gagné dans la roue 23 MAD",
      "Anas a gagné 340 MAD",
      "Wafaa a gagné dans la roue 24 MAD",
      "Ismail a gagné 195 MAD",
      "Raja a gagné dans la roue 25 MAD",
      "Yassine a gagné 285 MAD",
      "Nadia a gagné dans la roue 26 MAD",
      "Mostafa a gagné 360 MAD",
      "Hana a gagné dans la roue 27 MAD",
      "Redouane a gagné 130 MAD",
      "Fadwa a gagné dans la roue 28 MAD",
      "Khalid a gagné 390 MAD",
      "Samira a gagné dans la roue 29 MAD",
      "Aziz a gagné 155 MAD",
      "Hayat a gagné dans la roue 30 MAD",
      "Adil a gagné 305 MAD",
      "Maha a gagné dans la roue 31 MAD",
      "Nabil a gagné 165 MAD",
      "Rachida a gagné dans la roue 32 MAD",
      "Fouad a gagné 270 MAD",
      "Naoual a gagné dans la roue 33 MAD",
      "Saad a gagné 200 MAD",
      "Hafsia a gagné dans la roue 34 MAD",
      "Mouad a gagné 325 MAD",
      "Sanaa a gagné dans la roue 35 MAD",
      "Younes a gagné 185 MAD",
      "Khouloud a gagné dans la roue 36 MAD",
      "Hicham a gagné 295 MAD",
      "Imane a gagné dans la roue 37 MAD",
      "Jalal a gagné 215 MAD",
      "Najat a gagné dans la roue 38 MAD",
      "Zakaria a gagné 380 MAD",
      "Farida a gagné dans la roue 39 MAD",
      "Abdelkarim a gagné 145 MAD",
      "Saida a gagné dans la roue 40 MAD",
      "Mourad a gagné 335 MAD",
      "Loubna a gagné dans la roue 41 MAD",
      "Abdelaziz a gagné 170 MAD",
      "Fatiha a gagné dans la roue 42 MAD",
      "Taha a gagné 265 MAD",
      "Zohra a gagné dans la roue 43 MAD",
      "Noureddine a gagné 225 MAD",
      "Halima a gagné dans la roue 44 MAD",
      "Smail a gagné 315 MAD",
      "Douae a gagné dans la roue 45 MAD",
      "Abdelmajid a gagné 135 MAD",
      "Najoua a gagné dans la roue 46 MAD",
      "Miloud a gagné 255 MAD",
      "Soumia a gagné dans la roue 47 MAD",
      "Hakim a gagné 245 MAD",
      "Nisrine a gagné dans la roue 48 MAD",
      "Abderrahman a gagné 205 MAD",
      "Chafia a gagné dans la roue 49 MAD",
      "Bouchaib a gagné 365 MAD",
      "Rahima a gagné dans la roue 50 MAD"
    ];

    const getRandomMessage = () => {
      const randomIndex = Math.floor(Math.random() * winningMessages.length);
      return winningMessages[randomIndex];
    };

    // Set initial message
    setRandomWinningMessage(getRandomMessage());

    const interval = setInterval(() => {
      setRandomWinningMessage(getRandomMessage());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

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
    console.log('🎯 handleCompleteTask appelé pour taskId:', taskId, 'isCompletingTask:', isCompletingTaskRef.current);
    
    // Protection contre les appels multiples (useRef = synchrone, pas de délai)
    if (isCompletingTaskRef.current) {
      console.log('⚠️ Requête déjà en cours, appel ignoré');
      return;
    }
    
    isCompletingTaskRef.current = true;
    console.log('🔒 isCompletingTask défini à true');
    
    const task = tasks.find((t) => t.id === taskId);
    const token = localStorage.getItem("token");
    try {
      console.log('📡 Envoi de la requête POST /api/tasks/' + taskId + '/complete');
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
      console.log('✅ Réponse reçue:', data);
      if (!res.ok) {
        // Afficher le modal d'erreur pour toutes les erreurs
        setErrorMessage(data.message || "Erreur lors de la tâche");
        setShowErrorModal(true);
        return;
      }

      // Afficher le modal de succès
      setSuccessData({
        reward: data.reward_cents / 100,
        newBalance: data.new_balance_cents / 100
      });
      setShowSuccessModal(true);

      setUser((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          balanceCents: data.new_balance_cents,
        };
        localStorage.setItem("user", JSON.stringify(updated));
        return updated;
      });

      // Mettre à jour les gains quotidiens
      setTodayEarnings((prev) => prev + (data.reward_cents || 0));
      
      // Rafraîchir les tâches disponibles (elles seront filtrées par le backend)
      const resRefresh = await fetch(
        buildApiUrl(`/api/tasks${selectedPlatform === 'youtube' ? '' : '/' + selectedPlatform}`),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (resRefresh.ok) {
        const freshTasks = await resRefresh.json();
        setTasks(freshTasks);
      }
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
    } finally {
      isCompletingTaskRef.current = false;
      console.log('🔓 isCompletingTask défini à false');
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

  const handleOpenTask = async (task) => {
    if (!task.videoUrl) {
      handleCompleteTask(task.id);
      return;
    }
    console.log('Ouverture de la tâche:', task.title, 'URL:', task.videoUrl);
    
    // Pour Facebook, ouvrir la vidéo dans un nouvel onglet car Facebook bloque les iframes
    if (selectedPlatform === 'facebook') {
      window.open(task.videoUrl, '_blank', 'noopener,noreferrer');
      // Simuler le visionnage après un délai
      setTimeout(() => {
        handleCompleteTask(task.id);
      }, task.durationSeconds * 1000);
      return;
    }
    
    // Pour les plateformes autres que YouTube (TikTok, Instagram), afficher dans iframe
    if (selectedPlatform && selectedPlatform !== 'youtube') {
      setCurrentTask(task);
      setWatchedSeconds(0);
      setCanContinue(false);
      setShowPlayer(true);
      setPlayerLoading(true);
      setHasLikedCurrentVideo(true); // Pas de système de like pour ces plateformes
      setNeedsLike(false);
      return;
    }
    
    // Pour YouTube, vérifier si l'utilisateur a déjà liké cette vidéo
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        buildApiUrl(`/api/youtube/check-like?videoUrl=${encodeURIComponent(task.videoUrl)}`),
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await res.json();
      
      if (data.hasLiked) {
        console.log('Utilisateur a déjà liké cette vidéo');
        setHasLikedCurrentVideo(true);
        setNeedsLike(false);
      } else {
        console.log('Utilisateur doit liker cette vidéo');
        setHasLikedCurrentVideo(false);
        setNeedsLike(true);
      }
    } catch (err) {
      console.error('Erreur vérification like:', err);
      // En cas d'erreur, on demande le like par sécurité
      setHasLikedCurrentVideo(false);
      setNeedsLike(true);
    }
    
    setCurrentTask(task);
    setWatchedSeconds(0);
    setCanContinue(false);
    setPlayerLoading(true);
    setShowPlayer(true);
  };

  const handleLikeVideo = () => {
    setShowLikePopup(true);
  };

  const confirmLikeVideo = async () => {
    if (currentTask && currentTask.videoUrl) {
      // Ouvrir la vidéo YouTube dans un nouvel onglet
      window.open(currentTask.videoUrl, '_blank', 'noopener,noreferrer');
      setShowLikePopup(false);
      
      // Attendre 5 secondes pour que l'utilisateur mette le like
      setTimeout(async () => {
        try {
          const token = localStorage.getItem("token");
          const res = await fetch(buildApiUrl('/api/youtube/record-like'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ videoUrl: currentTask.videoUrl })
          });
          
          const data = await res.json();
          if (res.ok) {
            console.log('Like enregistré:', data.message);
            setHasLikedCurrentVideo(true);
            setNeedsLike(false);
          }
        } catch (err) {
          console.error('Erreur enregistrement like:', err);
        }
      }, 5000); // 5 secondes de délai
    }
  };

  const getYoutubeIdFromUrl = (url) => {
    if (!url) {
      console.error('URL YouTube vide ou invalide');
      return "";
    }
    
    // Format: https://youtu.be/VIDEO_ID
    const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
    if (shortMatch && shortMatch[1]) {
      console.log('Video ID extrait (format court):', shortMatch[1]);
      return shortMatch[1];
    }
    
    // Format: https://www.youtube.com/watch?v=VIDEO_ID
    const longMatch = url.match(/[?&]v=([^&]+)/);
    if (longMatch && longMatch[1]) {
      console.log('Video ID extrait (format long):', longMatch[1]);
      return longMatch[1];
    }
    
    // Format: https://www.youtube.com/embed/VIDEO_ID
    const embedMatch = url.match(/\/embed\/([^?&]+)/);
    if (embedMatch && embedMatch[1]) {
      console.log('Video ID extrait (format embed):', embedMatch[1]);
      return embedMatch[1];
    }
    
    console.error('Impossible d\'extraire le Video ID de:', url);
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

  // Handle spin wheel
  const handleSpin = async () => {
    if (isSpinning) return;
    
    setIsSpinning(true);
    setSpinResult(null);
    
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(buildApiUrl("/api/spin-wheel/spin"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        // Calculate rotation: each slice is 360/7 degrees
        const sliceAngle = 360 / 7;
        const targetSlice = data.sliceIndex;
        // Spin multiple full rotations + land on target slice
        const fullRotations = 5; // 5 full spins
        const targetAngle = (fullRotations * 360) + (360 - (targetSlice * sliceAngle) - (sliceAngle / 2));
        
        setWheelRotation(targetAngle);
        
        // Wait for animation to complete
        setTimeout(() => {
          setSpinResult(data);
          setIsSpinning(false);
          
          // Update user balance if won
          if (data.newBalance !== null) {
            setUser(prev => {
              const updated = { ...prev, balanceCents: data.newBalance };
              localStorage.setItem('user', JSON.stringify(updated));
              return updated;
            });
          }
        }, 4000); // 4 seconds for spin animation
      } else {
        setIsSpinning(false);
        alert(data.message || "Erreur lors du tirage.");
      }
    } catch (err) {
      console.error("Spin error:", err);
      setIsSpinning(false);
      alert("Erreur réseau.");
    }
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
    const timestamp = Date.now();
    console.log(`🎬 [${timestamp}] handleContinueAfterWatch appelé, canContinue:`, canContinue, 'currentTask:', currentTask?.id, 'isCompletingTask:', isCompletingTaskRef.current);
    
    if (!canContinue || !currentTask) {
      console.log(`⚠️ [${timestamp}] Conditions non remplies, sortie`);
      return;
    }
    
    if (isCompletingTaskRef.current) {
      console.log(`⚠️ [${timestamp}] Tâche déjà en cours de complétion, appel BLOQUÉ`);
      return;
    }
    
    console.log(`✅ [${timestamp}] Appel de handleCompleteTask autorisé`);
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
        if (data.timeLimitReached) {
          setTimeLimitMessage(data.message || "Opération non autorisée en dehors des heures permises.");
          setTimeLimitOperation(data.operation || "deposit");
          setShowTimeLimitModal(true);
          closeDepositModal();
        } else {
          setDepositError(data.message || "Erreur lors du dépôt.");
        }
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
    setSelectedVipPlan(null);
    setVipPromoCode("");
    setShowVipModal(true);
  };
  
  const handleConfirmUpgradeVip = async () => {
    if (!selectedVipPlan) {
      setVipError("Veuillez sélectionner un plan.");
      return;
    }

    // Cette vérification est maintenant gérée par le backend
    // Le frontend désactive visuellement les plans inférieurs ou égaux

    setVipError("");
    setVipLoading(true);
  
    const token = localStorage.getItem("token");
    if (!token) {
      setVipError("Session expirée, reconnecte-toi.");
      setVipLoading(false);
      navigate("/login");
      return;
    }

    // Définir les paramètres du plan
    const planDetails = {
      1: { price: 8000, duration: 2, dailyRate: 500 }, // 80 MAD, 2 mois, 5 MAD/jour
      2: { price: 15000, duration: 3, dailyRate: 800 }, // 150 MAD, 3 mois, 8 MAD/jour
      3: { price: 30000, duration: 3, dailyRate: 1500 }, // 300 MAD, 3 mois, 15 MAD/jour
      4: { price: 50000, duration: 6, dailyRate: 2000 }, // 500 MAD, 6 mois, 20 MAD/jour
    };

    const plan = planDetails[selectedVipPlan];
  
    try {
      const res = await fetch(buildApiUrl("/api/user/upgrade-vip"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          planId: selectedVipPlan,
          priceCents: plan.price,
          durationMonths: plan.duration,
          dailyRateCents: plan.dailyRate,
          promoCode: vipPromoCode || null,
        }),
      });
      const data = await res.json();
  
      if (!res.ok) {
        // Vérifier si c'est une erreur de solde insuffisant
        if (data.message && data.message.toLowerCase().includes("solde insuffisant")) {
          setShowVipModal(false);
          setRequiredAmount(plan.price / 100);
          setShowInsufficientBalanceModal(true);
        } else if (data.message && data.message.toLowerCase().includes("plan supérieur")) {
          // Afficher le popup d'erreur d'upgrade élégant
          setShowVipModal(false);
          setUpgradeErrorMessage(data.message);
          setShowUpgradeErrorModal(true);
        } else {
          setVipError(data.message || "Erreur lors du passage en VIP.");
        }
      } else {
        // Get plan names for celebration popup
        const planNames = { 1: 'STARTER', 2: 'POPULAIRE', 3: 'PREMIUM', 4: 'ELITE VIP' };
        setVipSuccessData({
          planName: planNames[selectedVipPlan],
          price: plan.price / 100,
          dailyRate: plan.dailyRate / 100,
          months: plan.duration,
          planId: selectedVipPlan
        });
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
        setSelectedVipPlan(null);
        setVipPromoCode("");
        setShowVipSuccessPopup(true);
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

  // Session expired modal - show BEFORE checking user null
  if (showSessionExpired) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900">
        <div className="bg-slate-800 border border-red-500/60 shadow-2xl rounded-2xl p-6 max-w-sm w-[90%] text-center">
          <div className="text-4xl mb-3">😢</div>
          <h3 className="text-lg font-semibold text-red-200 mb-2">Session expirée</h3>
          <p className="text-sm text-slate-300 mb-4">
            Ta session a expiré après 6 heures, merci de te reconnecter.
          </p>
          <button
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              localStorage.removeItem("loginTime");
              window.location.href = "/login";
            }}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            Se reconnecter
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Chargement...</p>
        </div>
      </div>
    );
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
  
  // Déterminer le montant du plan VIP basé sur dailyRateCents
  const getVipPlanAmount = (dailyRateCents) => {
    if (!dailyRateCents || dailyRateCents === 0) return null;
    if (dailyRateCents >= 2000) return "500 MAD";
    if (dailyRateCents >= 1500) return "300 MAD";
    if (dailyRateCents >= 800) return "150 MAD";
    if (dailyRateCents >= 500) return "80 MAD";
    if (dailyRateCents > 0) return "STARTER";
    return null;
  };
  
  const vipPlanAmount = isUserVip ? getVipPlanAmount(user?.dailyRateCents) : null;
  const vipLabel = isUserVip 
    ? (vipPlanAmount ? `VIP (${vipPlanAmount})` : "VIP")
    : (user?.vipLevel || "FREE");
  
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

  // Filtrer les liens de la sidebar selon le niveau VIP
  const sidebarLinks = [
    { id: "overview", label: L.menuOverview },
    { id: "referrals", label: "Parrainage" },
    { id: "vip", label: "Upgrade VIP" },
    { id: "download", label: L.menuDownload },
    { id: "profile", label: L.menuProfile },
  ];

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      {/* Background blur overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDIpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30 pointer-events-none"></div>
      <div className="absolute inset-0 backdrop-blur-[2px] pointer-events-none"></div>
      <div className="relative z-0">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed right-4 bottom-6 z-40 px-4 py-2 rounded-lg ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'} shadow-lg`}>
          <div className="text-sm font-semibold">{toast.message}</div>
        </div>
      )}
      {/* HEADER */}
      <header className="w-full border-b border-slate-800/50 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 backdrop-blur-md sticky top-0 z-10 shadow-lg shadow-black/20">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div 
              className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate('/dashboard')}
            >
              <div className="relative">
                <img
                  src="/app-icon.png"
                  alt="Windelevery"
                  className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl object-cover shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-500/20"
                />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900 animate-pulse"></div>
              </div>
              <div className={`${language === "ar" ? "text-right" : ""} hidden sm:block`}>
                <div className="text-xs sm:text-sm font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  {L.appTitle}
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                  {L.appSubtitle}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
            {user.role === "admin" && (
              <>
                <button
                  onClick={handleAdminClick}
                  className="text-[10px] sm:text-[11px] px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-indigo-600/20 border border-indigo-500/50 hover:bg-indigo-600/30 hover:border-indigo-400 transition-all font-semibold shadow-lg shadow-indigo-500/10 flex items-center gap-1 sm:gap-1.5 group"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                  </svg>
                  <span className="hidden sm:inline">Retrait</span>
                </button>
                <button
                  onClick={handleAdminDepositsClick}
                  className="text-[11px] px-3 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/50 hover:bg-emerald-600/30 hover:border-emerald-400 transition-all font-semibold shadow-lg shadow-emerald-500/10 flex items-center gap-1.5 group"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                  </svg>
                  <span className="hidden sm:inline">Dépôts</span>
                </button>
                <button
                  onClick={handleAdminFinanceClick}
                  className="text-[11px] px-3 py-2 rounded-xl bg-amber-600/20 border border-amber-500/50 hover:bg-amber-600/30 hover:border-amber-400 transition-all font-semibold shadow-lg shadow-amber-500/10 flex items-center gap-1.5 group"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                  </svg>
                  <span className="hidden sm:inline">Finance</span>
                </button>
              </>
            )}

            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications((s) => !s)}
                className="text-[11px] px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 hover:border-slate-600 transition-all shadow-lg flex items-center gap-2 group relative"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-300 group-hover:text-white group-hover:animate-pulse transition-colors">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 flex items-center justify-center text-[9px] font-bold text-white shadow-lg animate-bounce">
                    {notifications.length}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-[calc(100vw-2rem)] sm:w-80 max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/50 rounded-xl sm:rounded-2xl shadow-2xl shadow-black/40 z-20 backdrop-blur-xl overflow-hidden">
                  {/* Header du popup */}
                  <div className="px-4 py-3 bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/20 border-b border-slate-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-indigo-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                      </svg>
                      <span className="text-sm font-bold bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">
                        الإشعارات
                      </span>
                      {notifications.length > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-500/30 border border-indigo-500/50 rounded-full text-indigo-300">
                          {notifications.length}
                        </span>
                      )}
                    </div>
                    <button
                      className="text-xs px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all font-medium"
                      onClick={() => setNotifications([])}
                    >
                      مسح الكل
                    </button>
                  </div>

                  {/* Corps des notifications */}
                  <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto text-slate-600 mb-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.143 17.082a24.248 24.248 0 003.844.148m-3.844-.148a23.856 23.856 0 01-5.455-1.31 8.964 8.964 0 002.3-5.542m3.155 6.852a3 3 0 005.667 1.97m1.965-2.277L21 21m-4.225-4.225a23.81 23.81 0 003.536-1.003A8.967 8.967 0 0118 9.75V9A6 6 0 006.53 6.53m10.245 10.245L6.53 6.53M3 3l3.53 3.53" />
                        </svg>
                        <p className="text-xs text-slate-500 font-medium">ماكاين حتى إشعار</p>
                      </div>
                    ) : (
                      <div className="p-2 space-y-2">
                        {notifications
                          .slice()
                          .sort((a, b) => (b.id || 0) - (a.id || 0))
                          .map((n) => {
                            const isError = n.type === 'error';
                            const isSuccess = n.type === 'success';
                            
                            return (
                              <div
                                key={n.id}
                                className={`group relative px-3 py-3 rounded-xl transition-all hover:scale-[1.02] ${
                                  isError 
                                    ? 'bg-gradient-to-r from-red-950/40 to-red-900/30 border border-red-500/30 shadow-lg shadow-red-500/10' 
                                    : isSuccess 
                                    ? 'bg-gradient-to-r from-emerald-950/40 to-emerald-900/30 border border-emerald-500/30 shadow-lg shadow-emerald-500/10' 
                                    : 'bg-gradient-to-r from-slate-800/40 to-slate-900/40 border border-slate-700/30 shadow-lg'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  {/* Icône */}
                                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                                    isError 
                                      ? 'bg-red-500/20 border border-red-500/40' 
                                      : isSuccess 
                                      ? 'bg-emerald-500/20 border border-emerald-500/40' 
                                      : 'bg-indigo-500/20 border border-indigo-500/40'
                                  }`}>
                                    {isError ? (
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-400">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                                      </svg>
                                    ) : isSuccess ? (
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-400">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                                      </svg>
                                    ) : (
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-indigo-400">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </div>
                                  
                                  {/* Message */}
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-xs leading-relaxed font-medium ${
                                      isError 
                                        ? 'text-red-200' 
                                        : isSuccess 
                                        ? 'text-emerald-200' 
                                        : 'text-slate-200'
                                    }`}>
                                      {n.message}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        }
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* CONTENU SANS SIDEBAR */}
      <div className="max-w-6xl mx-auto px-2 sm:px-4 py-3 sm:py-6 gap-3 sm:gap-4 lg:h-[calc(100vh-80px)]">
        {/* SIDEBAR - Hidden since navigation is now at the bottom */}
        <aside className="hidden">
          <div className="p-5 bg-gradient-to-br from-indigo-600/20 via-purple-600/20 to-pink-600/20 border-b border-slate-800/50">
            {/* Avatar et nom */}
            <div className="flex flex-col items-center text-center mb-4">
              <div className="relative mb-3">
                {(() => {
                  const vipStyle = getVipBorderStyle(user?.dailyRateCents);
                  if (vipStyle) {
                    return (
                      <div className="relative">
                        {/* Effet de lueur animé */}
                        <div className={`absolute inset-0 rounded-full ${vipStyle.glow} blur-xl animate-pulse`}></div>
                        
                        {/* Animation spéciale Diamond - cercles rotatifs */}
                        {vipStyle.animated && (
                          <>
                            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 animate-spin" style={{ animationDuration: '3s' }}></div>
                            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 animate-spin" style={{ animationDuration: '4s', animationDirection: 'reverse' }}></div>
                          </>
                        )}
                        
                        {/* Bordure dégradée VIP */}
                        <div className={`relative p-1 rounded-full bg-gradient-to-r ${vipStyle.gradient} shadow-2xl ${vipStyle.shadow} ${vipStyle.animated ? 'animate-pulse' : ''}`}>
                          <img
                            src={avatarUrlFull || generateDefaultAvatar(user.id, user.fullName)}
                            alt="Avatar"
                            className="h-20 w-20 rounded-full object-cover border-2 border-slate-900 bg-slate-800"
                          />
                        </div>
                        
                        {/* Badge VIP en bas à droite */}
                        <div className={`absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-gradient-to-r ${vipStyle.gradient} border-2 border-slate-900 flex items-center justify-center shadow-lg ${vipStyle.animated ? 'animate-bounce' : ''}`}>
                          <span className="text-[8px] font-black text-slate-900">{vipStyle.label}</span>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="relative">
                        <img
                          src={avatarUrlFull || generateDefaultAvatar(user.id, user.fullName)}
                          alt="Avatar"
                          className="h-20 w-20 rounded-full object-cover border-3 border-white/10 shadow-2xl shadow-indigo-500/30 bg-slate-800"
                        />
                        <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full border-2 border-slate-900 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-white">
                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    );
                  }
                })()}
              </div>
              
              <h3 className="text-base font-bold text-white mb-1 px-2">
                {user.fullName || "Utilisateur"}
              </h3>
              
              <div className="flex items-center gap-1.5 text-xs text-slate-300 mb-3 bg-slate-900/50 px-3 py-1.5 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-indigo-400">
                  <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
                  <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
                </svg>
                <span className="truncate max-w-[180px]">{user.email}</span>
              </div>
            </div>

            {/* ID Badge */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/50 p-3 shadow-lg">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-2xl"></div>
              <div className="relative flex flex-col items-center justify-center text-center">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-2">
                  ID Utilisateur
                </div>
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="text-3xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    #{user.id}
                  </div>
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-indigo-400">
                      <path fillRule="evenodd" d="M4.5 3.75a3 3 0 00-3 3v10.5a3 3 0 003 3h15a3 3 0 003-3V6.75a3 3 0 00-3-3h-15zm4.125 3a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5zm-3.873 8.703a4.126 4.126 0 017.746 0 .75.75 0 01-.351.92 7.47 7.47 0 01-3.522.877 7.47 7.47 0 01-3.522-.877.75.75 0 01-.351-.92zM15 8.25a.75.75 0 000 1.5h3.75a.75.75 0 000-1.5H15zM14.25 12a.75.75 0 01.75-.75h3.75a.75.75 0 010 1.5H15a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5h3.75a.75.75 0 000-1.5H15z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
          {user.role !== "admin" && (
            <div className="mt-2 flex flex-col gap-3">
              {/* Bouton Dépôt : toujours visible */}
              <button
                onClick={openDepositModal}
                className="w-full py-4 text-base rounded-lg bg-emerald-600 hover:bg-emerald-700 font-semibold"
              >
                {L.sidebarDeposit}
              </button>

              {/* Si FREE → Go VIP, sinon → Retrait */}
              {user.vipLevel === "FREE" ? (
                <button
                  onClick={handleUpgradeVip}
                  className="w-full py-4 text-base rounded-lg bg-indigo-600 hover:bg-indigo-700 font-semibold"
                >
                  Go VIP
                </button>
              ) : (
                <button
                  onClick={handleWithdrawClick}
                  className="w-full py-4 text-base rounded-lg bg-amber-500 hover:bg-amber-600 font-semibold"
                >
                  {L.sidebarWithdraw}
                </button>
              )}
            </div>
          )}

          <nav className="pt-2 border-t border-slate-800/50">
            <p className="text-lg text-slate-400 mb-6 uppercase tracking-wider font-semibold flex items-center gap-3">
              <span className="w-2 h-6 bg-indigo-500 rounded-full"></span>
              {L.sidebarMenuTitle}
            </p>
            <div className="space-y-3">
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
                  onClick={() => {
                    setActiveSection(link.id);
                  }}
                  className={`w-full text-left text-base px-5 py-4 rounded-xl transition-all duration-200 flex items-center gap-4 group ${
                    activeSection === link.id
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 font-semibold"
                      : "text-slate-300 hover:bg-slate-800/50 hover:text-white hover:translate-x-1"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full transition-all ${
                    activeSection === link.id
                      ? "bg-white"
                      : "bg-slate-600 group-hover:bg-indigo-400"
                  }`}></span>
                  {link.label}
                </button>
              ))}
              

            </div>
          </nav>
          </div>
        </aside>

        {/* CONTENU PRINCIPAL */}
        <main className="flex-1 overflow-y-auto custom-scrollbar" style={{ paddingBottom: '80px' }}>
          {/* OVERVIEW */}
          {activeSection === "overview" && (
            <>
              {user.role === "admin" ? (
                <section className="grid gap-4 sm:grid-cols-2 max-w-4xl mx-auto mb-6">
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
              ) : selectedPlatform === null ? (
                <section className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-6 sm:mb-8">
                  {/* Random User Winnings Card */}
                  {activeSection === "overview" && (
                    <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-indigo-700/50 rounded-xl p-3 mb-4 animate-pulse col-span-1 sm:col-span-2 lg:col-span-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-indigo-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-xs font-semibold text-indigo-300">Gains</h3>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-white mb-1">{randomWinningMessage}</p>
                        <p className="text-[10px] text-slate-400">Actualisation dans 2 secondes...</p>
                      </div>
                    </div>
                  )}
                  <div className="bg-slate-800/80 border border-slate-700 rounded-xl sm:rounded-2xl p-5 sm:p-6 flex flex-col items-center justify-center text-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
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
                    <p className="text-2xl font-semibold mb-2">
                      {showBalance ? `${((user.balanceCents || 0) / 100).toFixed(2)} MAD` : "••••••"}
                    </p>
                    <p className="text-[11px] text-emerald-300 mb-3">{L.overviewWelcome}</p>
                    
                    {/* Deposit and Withdrawal Buttons */}
                    <div className="flex gap-2 w-full mt-2">
                      {/* Deposit Button - Always visible */}
                      <button
                        onClick={openDepositModal}
                        className="flex-1 py-2 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 font-semibold transition-colors"
                      >
                        Dépôt
                      </button>
                      
                      {/* Withdrawal Button - Only for VIP users */}
                      {isUserVip && (
                        <button
                          onClick={handleWithdrawClick}
                          className="flex-1 py-2 text-xs rounded-lg bg-amber-500 hover:bg-amber-600 font-semibold transition-colors"
                        >
                          Retrait
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Container for Status and Earnings Cards - Same Line */}
                  <div className="sm:col-span-2 grid grid-cols-2 gap-4">
                    {/* Carte Limite Quotidienne - Affichée seulement pour VIP */}
                    {isUserVip && dailyLimit > 0 && (
                      <div className="relative overflow-hidden rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 border border-slate-700 flex flex-col items-center justify-center text-center">
                        <p className="text-xs text-slate-400 mb-3">Gains d'aujourd'hui</p>
                        <p className="text-3xl font-bold text-white mb-2">
                          {(todayEarnings / 100).toFixed(2)} MAD
                        </p>
                        <p className="text-sm text-slate-400 mb-4">
                          sur {(dailyLimit / 100).toFixed(2)} MAD
                        </p>
                        {/* Barre de progression */}
                        <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-500 to-emerald-600"
                            style={{ width: `${Math.min(100, (todayEarnings / dailyLimit) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    <div
                      className={`relative overflow-hidden rounded-2xl p-5 sm:p-6 flex flex-col items-center justify-center text-center ${
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
                      {(user?.dailyRateCents || 0) >= 2000 && (
                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-10">
                          <div className="text-center px-4">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-emerald-400 mx-auto mb-2">
                              <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                            </svg>
                            <p className="text-sm font-bold text-emerald-400 mb-1">Plan Maximum</p>
                            <p className="text-xs text-slate-300">ELITE 500 MAD</p>
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-slate-400 mb-3">{L.overviewVipTitle}</p>
                      <p className="text-2xl font-semibold mb-1">
                        {vipLabel}
                      </p>
                      {isUserVip && vipPlanAmount && (
                        <p className="text-sm font-medium text-amber-300 mb-2">
                          Plan {vipPlanAmount}
                        </p>
                      )}
                      <p className={`text-[11px] ${isUserVip ? "text-amber-100" : "text-indigo-300"}`}>
                        {vipExpiryText
                          ? vipExpiryText
                          : L.overviewVipHint || (isUserVip ? "Merci d'être VIP ✨" : "")}
                      </p>
                      {/* Trial days remaining for FREE users only */}
                      {!isUserVip && !trialExpired && trialDaysRemaining !== null && trialDaysRemaining > 0 && (
                        <div className="w-full mt-3 pt-3 border-t border-slate-600 flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-blue-400 text-xs">
                            {(L.trialDaysRemaining || '{days} jour(s) restant(s)').replace('{days}', trialDaysRemaining)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              ) : null}
              {user.role !== "admin" && selectedPlatform === null && (
                <section className="mb-8 px-4">
                  {/* Trial Expired Banner */}
                  {trialExpired && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-red-600/90 to-orange-600/90 rounded-xl border border-red-400/50 shadow-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-white font-bold text-lg">{L.trialExpired || 'Période d\'essai terminée !'}</h3>
                          <p className="text-white/90 text-sm">{L.trialExpiredDesc || 'Votre essai gratuit de 3 jours est terminé. Passez au VIP pour continuer.'}</p>
                        </div>
                        <button
                          onClick={() => setShowVipModal(true)}
                          className="flex-shrink-0 px-4 py-2 bg-white text-red-600 font-bold rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          {L.upgradeVip || 'Passer VIP'}
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-center mb-6">
                    <h2 className="text-xl font-bold tracking-tight text-white">
                      Choisissez une plateforme
                    </h2>
                  </div>

                  <div className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
                    {/* YouTube Card - ACTIVE (or disabled if limit reached or trial expired) */}
                    {(dailyLimit > 0 && todayEarnings >= dailyLimit) || trialExpired ? (
                      <div
                        className="group relative bg-gradient-to-br from-red-500/30 to-red-700/30 rounded-2xl p-8 border border-red-400/20 opacity-60 cursor-not-allowed"
                      >
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <svg className="w-16 h-16 text-white/50" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                          </svg>
                          <div className="text-center">
                            <h3 className="text-xl font-bold text-white/70 mb-1">YouTube</h3>
                            <p className="text-xs text-white/50">{trialExpired ? (L.trialEnded || 'Période d\'essai terminée') : (L.limitReached || 'Limite atteinte')}</p>
                          </div>
                          <div className="absolute top-2 right-2 bg-amber-500/40 rounded-full px-2 py-1">
                            <span className="text-[10px] font-semibold text-white">{trialExpired ? (L.ended || 'Terminé') : (L.limited || 'Limité')}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedPlatform('youtube');
                          setLoadingTasks(true);
                          const token = localStorage.getItem("token");
                          if (token) {
                            const fetchTasksForPlatform = async () => {
                              try {
                                const res = await fetch(buildApiUrl('/api/tasks'), {
                                  headers: { Authorization: `Bearer ${token}` },
                                });
                                const data = await res.json();
                                if (res.ok && Array.isArray(data)) {
                                  setTasks(data);
                                }
                              } catch (err) {
                                console.error(err);
                              } finally {
                                setLoadingTasks(false);
                              }
                            };
                            fetchTasksForPlatform();
                          }
                        }}
                        className="group relative bg-gradient-to-br from-red-500/90 to-red-700/90 hover:from-red-500 hover:to-red-700 rounded-2xl p-8 border border-red-400/20 hover:border-red-400/40 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-red-500/50"
                      >
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                          </svg>
                          <div className="text-center">
                            <h3 className="text-xl font-bold text-white mb-1">YouTube</h3>
                            <p className="text-xs text-white/80">Regarder des vidéos YouTube</p>
                          </div>
                          <div className="absolute top-2 right-2 bg-white/20 rounded-full px-2 py-1">
                            <span className="text-[10px] font-semibold text-white">{L.active || 'Actif'}</span>
                          </div>
                        </div>
                      </button>
                    )}

                    {/* Rate Stores Card - ACTIVE (or disabled if limit reached or trial expired) */}
                    {(dailyLimit > 0 && todayEarnings >= dailyLimit) || trialExpired ? (
                      <div
                        className="group relative bg-gradient-to-br from-emerald-500/30 to-teal-700/30 rounded-2xl p-8 border border-emerald-400/20 opacity-60 cursor-not-allowed"
                      >
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <svg className="w-16 h-16 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                          <div className="text-center">
                            <h3 className="text-xl font-bold text-white/70 mb-1">Rate Stores</h3>
                            <p className="text-xs text-white/50">{trialExpired ? (L.trialEnded || 'Période d\'essai terminée') : (L.limitReached || 'Limite atteinte')}</p>
                          </div>
                          <div className="absolute top-2 right-2 bg-amber-500/40 rounded-full px-2 py-1">
                            <span className="text-[10px] font-semibold text-white">{trialExpired ? (L.ended || 'Terminé') : (L.limited || 'Limité')}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedPlatform('ratestores');
                          setSelectedStore(null);
                        }}
                        className="group relative bg-gradient-to-br from-emerald-500/90 to-teal-700/90 hover:from-emerald-500 hover:to-teal-700 rounded-2xl p-8 border border-emerald-400/20 hover:border-emerald-400/40 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-emerald-500/50"
                      >
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                          <div className="text-center">
                            <h3 className="text-xl font-bold text-white mb-1">Rate Stores</h3>
                            <p className="text-xs text-white/80">{L.rateStoresDesc || 'Noter les produits des magasins'}</p>
                          </div>
                          <div className="absolute top-2 right-2 bg-white/20 rounded-full px-2 py-1">
                            <span className="text-[10px] font-semibold text-white">{L.active || 'Actif'}</span>
                          </div>
                        </div>
                      </button>
                    )}

                    {/* Google Ads Card */}
                    <div
                      className="group relative bg-gradient-to-br from-blue-500/30 via-green-500/30 to-yellow-500/30 rounded-2xl p-6 border border-blue-400/20 opacity-60 cursor-not-allowed"
                    >
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <svg className="w-16 h-16 text-white/50" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"/>
                        </svg>
                        <div className="text-center">
                          <h3 className="text-xl font-bold text-white/70 mb-1">Google Ads</h3>
                          <p className="text-xs text-white/50">Publicités Google à visionner</p>
                        </div>
                        <div className="absolute top-2 right-2 bg-amber-500/40 rounded-full px-3 py-1">
                          <span className="text-[10px] font-semibold text-white">Coming Soon</span>
                        </div>
                      </div>
                    </div>

                    {/* TikTok Card */}
                    <div
                      className="group relative bg-gradient-to-br from-gray-800/30 to-black/30 rounded-2xl p-6 border border-gray-600/20 opacity-60 cursor-not-allowed"
                    >
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <svg className="w-16 h-16 text-white/50" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                        </svg>
                        <div className="text-center">
                          <h3 className="text-xl font-bold text-white/70 mb-1">TikTok</h3>
                          <p className="text-xs text-white/50">Regarder des vidéos TikTok</p>
                        </div>
                        <div className="absolute top-2 right-2 bg-amber-500/40 rounded-full px-3 py-1">
                          <span className="text-[10px] font-semibold text-white">Coming Soon</span>
                        </div>
                      </div>
                    </div>

                    {/* Instagram Card */}
                    <div
                      className="group relative bg-gradient-to-br from-pink-500/30 via-purple-500/30 to-orange-500/30 rounded-2xl p-6 border border-pink-400/20 opacity-60 cursor-not-allowed"
                    >
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <svg className="w-16 h-16 text-white/50" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
                        </svg>
                        <div className="text-center">
                          <h3 className="text-xl font-bold text-white/70 mb-1">Instagram</h3>
                          <p className="text-xs text-white/50">Vidéos Instagram à visionner</p>
                        </div>
                        <div className="absolute top-2 right-2 bg-amber-500/40 rounded-full px-3 py-1">
                          <span className="text-[10px] font-semibold text-white">Coming Soon</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {user.role !== "admin" && selectedPlatform === 'ratestores' && (
                <section className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedPlatform(null);
                          setSelectedStore(null);
                          setStoreProducts([]);
                        }}
                        className="text-[11px] px-3 py-1 rounded-full border border-slate-700 hover:bg-slate-800 flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        {L.returnBtn || 'Retour'}
                      </button>
                      <h2 className="text-sm font-semibold tracking-tight">
                        {L.rateStoresTitle || 'Rate Stores - Noter les produits'}
                      </h2>
                    </div>
                  </div>

                  {/* Check if daily limit reached */}
                  {dailyLimit > 0 && todayEarnings >= dailyLimit ? (
                    <div className="bg-amber-900/30 border border-amber-500/40 rounded-xl p-6 text-center">
                      <svg className="w-16 h-16 text-amber-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <h3 className="text-lg font-bold text-amber-300 mb-2">{L.dailyLimitReached || 'Limite quotidienne atteinte !'}</h3>
                      <p className="text-sm text-slate-300 mb-2">
                        {(L.dailyLimitEarned || 'Vous avez gagné {amount} MAD').replace('{amount}', (todayEarnings / 100).toFixed(2))}
                      </p>
                      <p className="text-xs text-slate-400">
                        {L.comeBackTomorrow || 'Revenez demain !'}
                      </p>
                    </div>
                  ) : !selectedStore ? (
                    // Store Selection
                    <div>
                      <p className="text-sm text-slate-300 mb-4">
                        {user?.vipLevel === 'VIP' 
                          ? (L.chooseStore || 'Choisissez un magasin :')
                          : (L.chooseStoreRemaining || 'Choisissez un magasin ({count} restants)').replace('{count}', 5 - completedStores.length)
                        }
                      </p>
                      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                        {/* Marjane */}
                        {user?.vipLevel !== 'VIP' && completedStores.includes('marjane') ? (
                          <div className="relative bg-gradient-to-br from-red-600/30 to-red-800/30 rounded-xl p-4 border border-red-500/20 opacity-60 cursor-not-allowed">
                            <div className="flex flex-col items-center space-y-2">
                              <div className="w-14 h-14 bg-white/50 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                                <img src="/logos/marjane.svg" alt="Marjane" className="w-full h-full object-contain opacity-50" />
                              </div>
                              <span className="text-white/50 font-semibold text-sm">Marjane</span>
                            </div>
                            <div className="absolute top-1 right-1 bg-emerald-500/80 rounded-full p-1">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSelectStore('marjane')}
                            className="group bg-gradient-to-br from-red-600/80 to-red-800/80 hover:from-red-600 hover:to-red-800 rounded-xl p-4 border border-red-500/30 hover:border-red-400/50 transition-all duration-300 transform hover:scale-105"
                          >
                            <div className="flex flex-col items-center space-y-2">
                              <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                                <img src="/logos/marjane.svg" alt="Marjane" className="w-full h-full object-contain" />
                              </div>
                              <span className="text-white font-semibold text-sm">Marjane</span>
                            </div>
                          </button>
                        )}

                        {/* Carrefour */}
                        {user?.vipLevel !== 'VIP' && completedStores.includes('carrefour') ? (
                          <div className="relative bg-gradient-to-br from-blue-600/30 to-blue-800/30 rounded-xl p-4 border border-blue-500/20 opacity-60 cursor-not-allowed">
                            <div className="flex flex-col items-center space-y-2">
                              <div className="w-14 h-14 bg-white/50 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                                <img src="/logos/carrefour.svg" alt="Carrefour" className="w-full h-full object-contain opacity-50" />
                              </div>
                              <span className="text-white/50 font-semibold text-sm">Carrefour</span>
                            </div>
                            <div className="absolute top-1 right-1 bg-emerald-500/80 rounded-full p-1">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSelectStore('carrefour')}
                            className="group bg-gradient-to-br from-blue-600/80 to-blue-800/80 hover:from-blue-600 hover:to-blue-800 rounded-xl p-4 border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 transform hover:scale-105"
                          >
                            <div className="flex flex-col items-center space-y-2">
                              <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                                <img src="/logos/carrefour.svg" alt="Carrefour" className="w-full h-full object-contain" />
                              </div>
                              <span className="text-white font-semibold text-sm">Carrefour</span>
                            </div>
                          </button>
                        )}

                        {/* Jumia Maroc */}
                        {user?.vipLevel !== 'VIP' && completedStores.includes('jumia') ? (
                          <div className="relative bg-gradient-to-br from-orange-500/30 to-orange-700/30 rounded-xl p-4 border border-orange-400/20 opacity-60 cursor-not-allowed">
                            <div className="flex flex-col items-center space-y-2">
                              <div className="w-14 h-14 bg-white/50 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                                <img src="/logos/jumia.svg" alt="Jumia" className="w-full h-full object-contain opacity-50" />
                              </div>
                              <span className="text-white/50 font-semibold text-sm">Jumia Maroc</span>
                            </div>
                            <div className="absolute top-1 right-1 bg-emerald-500/80 rounded-full p-1">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSelectStore('jumia')}
                            className="group bg-gradient-to-br from-orange-500/80 to-orange-700/80 hover:from-orange-500 hover:to-orange-700 rounded-xl p-4 border border-orange-400/30 hover:border-orange-400/50 transition-all duration-300 transform hover:scale-105"
                          >
                            <div className="flex flex-col items-center space-y-2">
                              <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                                <img src="/logos/jumia.svg" alt="Jumia" className="w-full h-full object-contain" />
                              </div>
                              <span className="text-white font-semibold text-sm">Jumia Maroc</span>
                            </div>
                          </button>
                        )}

                        {/* Electroplanet */}
                        {user?.vipLevel !== 'VIP' && completedStores.includes('electroplanet') ? (
                          <div className="relative bg-gradient-to-br from-yellow-500/30 to-yellow-700/30 rounded-xl p-4 border border-yellow-400/20 opacity-60 cursor-not-allowed">
                            <div className="flex flex-col items-center space-y-2">
                              <div className="w-14 h-14 bg-white/50 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                                <img src="/logos/electroplanet.svg" alt="Electroplanet" className="w-full h-full object-contain opacity-50" />
                              </div>
                              <span className="text-white/50 font-semibold text-sm">Electroplanet</span>
                            </div>
                            <div className="absolute top-1 right-1 bg-emerald-500/80 rounded-full p-1">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSelectStore('electroplanet')}
                            className="group bg-gradient-to-br from-yellow-500/80 to-yellow-700/80 hover:from-yellow-500 hover:to-yellow-700 rounded-xl p-4 border border-yellow-400/30 hover:border-yellow-400/50 transition-all duration-300 transform hover:scale-105"
                          >
                            <div className="flex flex-col items-center space-y-2">
                              <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                                <img src="/logos/electroplanet.svg" alt="Electroplanet" className="w-full h-full object-contain" />
                              </div>
                              <span className="text-white font-semibold text-sm">Electroplanet</span>
                            </div>
                          </button>
                        )}

                        {/* Supeco */}
                        {user?.vipLevel !== 'VIP' && completedStores.includes('supeco') ? (
                          <div className="relative bg-gradient-to-br from-green-600/30 to-green-800/30 rounded-xl p-4 border border-green-500/20 opacity-60 cursor-not-allowed">
                            <div className="flex flex-col items-center space-y-2">
                              <div className="w-14 h-14 bg-white/50 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                                <img src="/logos/supeco.svg" alt="Supeco" className="w-full h-full object-contain opacity-50" />
                              </div>
                              <span className="text-white/50 font-semibold text-sm">Supeco</span>
                            </div>
                            <div className="absolute top-1 right-1 bg-emerald-500/80 rounded-full p-1">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSelectStore('supeco')}
                            className="group bg-gradient-to-br from-green-600/80 to-green-800/80 hover:from-green-600 hover:to-green-800 rounded-xl p-4 border border-green-500/30 hover:border-green-400/50 transition-all duration-300 transform hover:scale-105"
                          >
                            <div className="flex flex-col items-center space-y-2">
                              <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                                <img src="/logos/supeco.svg" alt="Supeco" className="w-full h-full object-contain" />
                              </div>
                              <span className="text-white font-semibold text-sm">Supeco</span>
                            </div>
                          </button>
                        )}
                      </div>
                      
                      {/* All stores completed message for FREE users */}
                      {user?.vipLevel !== 'VIP' && completedStores.length >= 5 && (
                        <div className="mt-6 p-4 bg-gradient-to-r from-emerald-600/80 to-teal-600/80 rounded-xl border border-emerald-400/30">
                          <div className="flex items-center gap-3">
                            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <div>
                              <h3 className="text-white font-bold">{L.allStoresCompleted || 'Tous les magasins notés !'}</h3>
                              <p className="text-white/80 text-sm">{L.allStoresCompletedHint || 'Passez au VIP pour noter plus de produits.'}</p>
                            </div>
                            <button
                              onClick={() => setShowVipModal(true)}
                              className="ml-auto px-4 py-2 bg-white text-emerald-600 font-bold rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              دير VIP
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Product Rating Section
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <button
                          onClick={() => {
                            setSelectedStore(null);
                            setStoreProducts([]);
                            setProductRatings({});
                            setProductComments({});
                            setValidatedProducts({});
                          }}
                          className="text-[11px] px-3 py-1 rounded-full border border-slate-700 hover:bg-slate-800 flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                          </svg>
                          {L.changeStore || 'Changer de magasin'}
                        </button>
                        <span className="text-sm font-semibold capitalize text-emerald-400">{selectedStore}</span>
                      </div>

                      <p className="text-sm text-slate-300 mb-4">Notez chaque produit et validez pour gagner :</p>
                      <div className="space-y-4">
                        {storeProducts.map((product) => {
                          const isValidated = validatedProducts[product.id];
                          const isValidating = validatingProduct === product.id;
                          const reward = productRewards[product.id] || '0.00';
                          
                          return (
                            <div 
                              key={product.id} 
                              className={`bg-slate-800/60 border rounded-xl p-4 transition-all ${isValidated ? 'border-emerald-500/50 bg-emerald-900/20' : 'border-slate-700'}`}
                            >
                              {/* Task Header with Reward */}
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-medium text-slate-400">Tâche de notation</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs bg-emerald-600/30 text-emerald-300 px-2 py-1 rounded-full font-semibold">
                                    +{reward} MAD
                                  </span>
                                  {isValidated && (
                                    <span className="text-xs bg-emerald-600 text-white px-2 py-1 rounded-full flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      {L.validated || 'Validé'}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-4">
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="w-20 h-20 object-cover rounded-lg"
                                  onError={(e) => { e.target.src = 'https://via.placeholder.com/80?text=Produit'; }}
                                />
                                <div className="flex-1">
                                  <h4 className="text-sm font-semibold text-white mb-1">{product.name}</h4>
                                  <p className="text-xs text-slate-400 mb-2">Prix: {product.price}</p>
                                  
                                  {/* Star Rating */}
                                  <div className="flex items-center gap-1 mb-2">
                                    <span className="text-xs text-slate-400 mr-2">Note :</span>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <button
                                        key={star}
                                        onClick={() => !isValidated && handleRatingChange(product.id, star)}
                                        disabled={isValidated}
                                        className={`focus:outline-none transition-transform ${isValidated ? 'cursor-not-allowed' : 'hover:scale-110'}`}
                                      >
                                        <svg
                                          className={`w-6 h-6 ${(productRatings[product.id] || 0) >= star ? 'text-yellow-400' : 'text-slate-600'}`}
                                          fill="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                        </svg>
                                      </button>
                                    ))}
                                    {productRatings[product.id] && (
                                      <span className="text-xs text-yellow-400 ml-2">{productRatings[product.id]}/5</span>
                                    )}
                                  </div>
                                  
                                  {/* Comment */}
                                  <textarea
                                    placeholder={L.commentPlaceholder || 'Votre commentaire (optionnel)...'}
                                    value={productComments[product.id] || ''}
                                    onChange={(e) => handleCommentChange(product.id, e.target.value)}
                                    disabled={isValidated}
                                    className={`w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none ${isValidated ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    rows={2}
                                  />
                                </div>
                              </div>

                              {/* Validation Button */}
                              {!isValidated ? (
                                <button
                                  onClick={() => handleValidateProduct(product.id)}
                                  disabled={isValidating || !productRatings[product.id]}
                                  className={`mt-3 w-full py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                                    isValidating 
                                      ? 'bg-slate-700 text-slate-400 cursor-wait'
                                      : !productRatings[product.id]
                                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  }`}
                                >
                                  {isValidating ? (
                                    <>
                                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      Validation...
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      {(L.validateTask || 'Valider (+{reward} MAD)').replace('{reward}', reward)}
                                    </>
                                  )}
                                </button>
                              ) : (
                                <div className="mt-3 w-full py-2 rounded-lg text-sm font-semibold bg-emerald-900/40 text-emerald-300 text-center flex items-center justify-center gap-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Tâche complétée - +{reward} MAD gagnés
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Summary when all validated */}
                      {storeProducts.length > 0 && storeProducts.every(p => validatedProducts[p.id]) && (
                        <div className="mt-6 bg-emerald-900/30 border border-emerald-500/40 rounded-xl p-4 text-center">
                          <svg className="w-12 h-12 text-emerald-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <h3 className="text-lg font-bold text-emerald-300 mb-1">Toutes les tâches complétées !</h3>
                          <p className="text-sm text-slate-300">
                            Total gagné : <span className="text-emerald-400 font-bold">
                              {storeProducts.reduce((sum, p) => sum + parseFloat(productRewards[p.id] || 0), 0).toFixed(2)} MAD
                            </span>
                          </p>
                          <button
                            onClick={() => {
                              setSelectedStore(null);
                              setStoreProducts([]);
                              setProductRatings({});
                              setProductComments({});
                              setValidatedProducts({});
                            }}
                            className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-all"
                          >
                            Continuer avec un autre magasin
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}

              {user.role !== "admin" && selectedPlatform !== null && selectedPlatform !== 'ratestores' && (
                <section className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedPlatform(null);
                          setTasks([]);
                        }}
                        className="text-[11px] px-3 py-1 rounded-full border border-slate-700 hover:bg-slate-800 flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        {L.returnBtn || 'Retour'}
                      </button>
                      <h2 className="text-sm font-semibold tracking-tight capitalize">
                        {selectedPlatform} - {L.tasksSectionTitle}
                      </h2>
                    </div>
                    {!(dailyLimit > 0 && todayEarnings >= dailyLimit) && (
                      <button
                        className="text-[11px] px-3 py-1 rounded-full border border-slate-700 hover:bg-slate-800"
                        onClick={() => {
                          setLoadingTasks(true);
                          const token = localStorage.getItem("token");
                          if (token) {
                            const fetchTasksForPlatform = async () => {
                              try {
                                const endpoint = selectedPlatform === 'youtube' ? '/api/tasks' : `/api/tasks/${selectedPlatform}`;
                                const res = await fetch(buildApiUrl(endpoint), {
                                  headers: { Authorization: `Bearer ${token}` },
                                });
                                const data = await res.json();
                                if (res.ok && Array.isArray(data)) {
                                  setTasks(data);
                                }
                              } catch (err) {
                                console.error(err);
                              } finally {
                                setLoadingTasks(false);
                              }
                            };
                            fetchTasksForPlatform();
                          }
                        }}
                      >
                        {L.tasksRefresh}
                      </button>
                    )}
                  </div>

                  {/* Check if daily limit reached */}
                  {dailyLimit > 0 && todayEarnings >= dailyLimit ? (
                    <div className="bg-amber-900/30 border border-amber-500/40 rounded-xl p-6 text-center">
                      <svg className="w-16 h-16 text-amber-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <h3 className="text-lg font-bold text-amber-300 mb-2">{L.dailyLimitReached || 'Limite quotidienne atteinte !'}</h3>
                      <p className="text-sm text-slate-300 mb-2">
                        {(L.dailyLimitEarned || 'Vous avez gagné {amount} MAD').replace('{amount}', (todayEarnings / 100).toFixed(2))}
                      </p>
                      <p className="text-xs text-slate-400">
                        {L.comeBackTomorrow || 'Revenez demain !'}
                      </p>
                    </div>
                  ) : loadingTasks ? (
                    <p className="text-xs text-slate-400">
                      {L.tasksLoading}
                    </p>
                  ) : tasks.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      {L.tasksNone}
                    </p>
                  ) : (
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
                      {tasks.map((task) => {
                        const locked = isTaskLockedForUser(task);
                        return (
                          <article
                            key={task.id}
                            className="bg-slate-800/80 border border-slate-700 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="text-sm font-semibold">
                                  {task.title}
                                </h3>
                                <span className="text-[11px] px-2 py-1 rounded-full bg-slate-700 text-slate-200">
                                  Level: {formatTaskLevel(task)}
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
                              {!locked && task.isEligible === false && user?.vipLevel === 'FREE' && (
                                <div className="mt-2 p-2 bg-amber-900/30 border border-amber-500/40 rounded-lg">
                                  <p className="text-[11px] text-amber-200">
                                    ⚠️ Vous n'êtes pas éligible pour gagner avec cette tâche. Passez en VIP pour débloquer les gains !
                                  </p>
                                </div>
                              )}
                            </div>
                            <button
                              className={`mt-3 w-full rounded-lg py-2 text-xs font-semibold transition ${
                                locked
                                  ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                                  : task.isEligible === false && user?.vipLevel === 'FREE'
                                  ? "bg-amber-600 hover:bg-amber-700"
                                  : "bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99]"
                              }`}
                              onClick={() => !locked && handleOpenTask(task)}
                              disabled={locked}
                            >
                              {locked ? "Réservé VIP" : task.isEligible === false && user?.vipLevel === 'FREE' ? "Voir (Non éligible)" : L.taskStartButton}
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



          {/* REFERRALS */}
          {activeSection === "referrals" && (
            <section className="mb-10 bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold tracking-tight">Parrainage</h2>
                <button 
                  onClick={() => setActiveSection("overview")}
                  className="text-xs py-1.5 px-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                  Retour
                </button>
              </div>
              
              <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 mb-6">
                {/* Code d'invitation */}
                <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 sm:p-6 flex flex-col items-center justify-center text-center">
                  <p className="text-xs text-slate-400 mb-3">Votre code d'invitation</p>
                  <p className="text-2xl font-semibold mb-2 tracking-[0.08em] text-indigo-300">
                    {referrals?.inviteCode || user.inviteCode || "—"}
                  </p>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(referrals?.inviteCode || user.inviteCode);
                      setToast({ message: "Code copié!", type: "success" });
                    }}
                    className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors"
                  >
                    Copier le code
                  </button>
                </div>
                
                {/* Statistiques */}
                <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 sm:p-6 flex flex-col items-center justify-center text-center">
                  <p className="text-xs text-slate-400 mb-3">Vos filleuls</p>
                  <p className="text-2xl font-semibold mb-1">
                    {referrals?.invitedCount ?? 0}
                  </p>
                  <p className="text-sm text-slate-400 mb-3">Total gains</p>
                  <p className="text-xl font-bold text-emerald-400">
                    {((referrals?.totalBonusCents ?? 0) / 100).toFixed(2)} MAD
                  </p>
                </div>
              </div>
              
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 sm:p-6">
                <h3 className="text-md font-semibold mb-3">Comment ça marche?</h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-start">
                    <span className="text-emerald-400 mr-2">✓</span>
                    <span>Partagez votre code d'invitation avec vos amis</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-emerald-400 mr-2">✓</span>
                    <span>Ils s'inscrivent en utilisant votre code</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-emerald-400 mr-2">✓</span>
                    <span>Vous touchez une commission sur leurs gains</span>
                  </li>
                </ul>
              </div>
            </section>
          )}

          {/* HISTORIQUE COMPLET */}
          {activeSection === "history" && (
            <section className="mb-10">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold tracking-tight">
                  {L.historyFullTitle}
                </h2>
                <button 
                  onClick={() => setActiveSection("profile")}
                  className="text-xs py-1.5 px-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                  Retour
                </button>
              </div>
              {historyLoading ? (
                <p className="text-sm text-slate-400">
                  {L.historyLoading}
                </p>
              ) : (
                <div className="grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-2">
                  <div className="bg-slate-800/80 border border-slate-700 rounded-xl sm:rounded-2xl p-6 sm:p-8">
                    <h3 className="text-base font-semibold mb-4">
                      {L.historyDepositsTitle}
                    </h3>
                    {history.deposits?.length === 0 ? (
                      <p className="text-sm text-slate-400">
                        {L.historyDepositsNone}
                      </p>
                    ) : (
                      <ul className="text-sm space-y-4 text-slate-300">
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
                              className="flex items-center justify-between border-b border-slate-700/60 pb-3 last:border-b-0 last:pb-0"
                            >
                              <span className="text-base">
                                {new Date(d.createdAt).toLocaleString()}
                              </span>
                              <div className="flex items-center gap-3">
                                  <div className="flex flex-col items-end">
                                    <span className="text-lg text-emerald-300 font-semibold">+{d.amountCents / 100} MAD</span>
                                    {d.depositorFullName && (
                                      <span className="text-sm text-slate-400">{d.depositorFullName}</span>
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

                  <div className="bg-slate-800/80 border border-slate-700 rounded-xl sm:rounded-2xl p-6 sm:p-8">
                    <h3 className="text-base font-semibold mb-4">
                      {L.historyWithdrawalsTitle}
                    </h3>
                    {history.withdrawals?.length === 0 ? (
                      <p className="text-sm text-slate-400">
                        {L.historyWithdrawalsNone}
                      </p>
                    ) : (
                      <ul className="text-sm space-y-4 text-slate-300">
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
                              className="flex items-center justify-between border-b border-slate-700/60 pb-3 last:border-b-0 last:pb-0"
                            >
                              <div className="flex flex-col">
                                <span className="text-base">
                                  {new Date(w.createdAt).toLocaleString()}
                                </span>
                                {w.reference && (
                                  <span className="text-sm text-cyan-400 font-mono">
                                    Réf: {w.reference}
                                  </span>
                                )}
                                <span className="text-sm text-slate-400">
                                  {L.historyStatusLabel}: {w.status}
                                </span>
                              </div>
                              <span className="text-lg text-amber-300 font-semibold">
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
              
              {/* Profile Info Card */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-5 mb-6 shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                  {(() => {
                    const vipStyle = getVipBorderStyle(user?.dailyRateCents);
                    if (vipStyle) {
                      return (
                        <div className="relative">
                          {/* VIP Border Effect */}
                          <div className={`absolute inset-0 rounded-full ${vipStyle.glow} blur-lg animate-pulse`}></div>
                          
                          {/* VIP Animated Circles */}
                          {vipStyle.animated && (
                            <>
                              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 animate-spin" style={{ animationDuration: '3s' }}></div>
                              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 animate-spin" style={{ animationDuration: '4s', animationDirection: 'reverse' }}></div>
                            </>
                          )}
                          
                          {/* VIP Gradient Border */}
                          <div className={`relative p-0.5 rounded-full bg-gradient-to-r ${vipStyle.gradient} shadow-xl ${vipStyle.shadow} ${vipStyle.animated ? 'animate-pulse' : ''}`}>
                            <img
                              src={avatarUrlFull || generateDefaultAvatar(user.id, user.fullName)}
                              alt="Avatar"
                              className="h-16 w-16 rounded-full object-cover border-2 border-slate-900 bg-slate-800"
                            />
                          </div>
                          
                          {/* VIP Badge */}
                          <div className={`absolute -bottom-0.5 -right-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r ${vipStyle.gradient} border border-slate-900 flex items-center justify-center shadow-md ${vipStyle.animated ? 'animate-bounce' : ''}`}>
                            <span className="text-[7px] font-black text-slate-900">{vipStyle.label}</span>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <img
                          src={avatarUrlFull || generateDefaultAvatar(user.id, user.fullName)}
                          alt="Avatar"
                          className="h-16 w-16 rounded-full object-cover border-2 border-slate-600/50 shadow-lg bg-slate-800"
                        />
                      );
                    }
                  })()}
                  
                  <div>
                    <h3 className="text-lg font-bold text-white">{user.fullName || "Utilisateur"}</h3>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold">ID</span>
                      <span className="text-sm font-mono text-slate-300 bg-slate-700/50 px-2 py-1 rounded">#{user.id}</span>
                    </div>
                    <p className="text-sm text-slate-300">{user.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                  <div className="text-center">
                    <p className="text-xs text-slate-400">Statut</p>
                    <p className="text-sm font-semibold text-amber-300">{user.vipLevel === "VIP" ? "VIP" : "Gratuit"}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400">Gains d'aujourd'hui</p>
                    <p className="text-sm font-semibold text-emerald-300">{((todayEarnings || 0) / 100).toFixed(2)} MAD</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400">Inscrit le</p>
                    <p className="text-sm font-semibold text-slate-300">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                
                {/* Edit Profile Button */}
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <button
                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                    className="w-full py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-medium text-sm transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                    {isEditingProfile ? "Annuler l'édition" : "Modifier le profil"}
                  </button>
                </div>
              </div>
              
              {/* Profile Edit Form */}
              {isEditingProfile && (
                <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 mb-6">
                  <h3 className="text-sm font-semibold mb-4 text-slate-200">Modifier les informations du profil</h3>
                  <form
                    className="space-y-4"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      
                      try {
                        const token = localStorage.getItem("token");
                        // In a real implementation, you would send a request to update the profile
                        // For now, we're just updating the local state
                        const updatedUser = { ...user, fullName: user.fullName };
                        setUser(updatedUser);
                        localStorage.setItem("user", JSON.stringify(updatedUser));
                        alert("Profil mis à jour avec succès.");
                      } catch (err) {
                        console.error(err);
                        alert("Erreur lors de la mise à jour du profil.");
                      }
                    }}
                  >
                    <div>
                      <label className="block text-xs mb-1 text-slate-300">
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
                        className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs mb-1 text-slate-300">
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
                    
                    <div className="mb-4">
                      <label className="block text-xs mb-1 text-slate-300">
                        {L.avatarLabel}
                      </label>
                      <div className="flex items-center gap-3">
                        {avatarError && (
                          <p className="text-[11px] text-red-400 mb-1">
                            {avatarError}
                          </p>
                        )}
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarFileChange}
                            className="hidden"
                            id="avatar-upload"
                          />
                          <label
                            htmlFor="avatar-upload"
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 hover:border-indigo-500 bg-slate-800/50 cursor-pointer transition-all hover:bg-slate-800 group"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
                              />
                            </svg>
                            <span className="text-[11px] text-slate-300 group-hover:text-indigo-300 transition-colors">
                              Choisir une photo
                            </span>
                          </label>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          {L.avatarHint}
                        </p>
                        {avatarUploading && (
                          <p className="text-[11px] text-slate-300">
                            {L.avatarUploading}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      {L.profileSaveButton}
                    </button>
                  </form>
                </div>
              )}
              
              {/* Password Change Form */}
              {isEditingProfile && (
                <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 mb-6">
                  <h3 className="text-sm font-semibold mb-4 text-slate-200">Changer le mot de passe</h3>
                  <form
                    className="space-y-4"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      
                      const currentPassword = e.target.currentPassword.value;
                      const newPassword = e.target.newPassword.value;
                      const confirmNewPassword = e.target.confirmNewPassword.value;
                      
                      if (newPassword !== confirmNewPassword) {
                        setPasswordModalMessage("Le nouveau mot de passe et la confirmation ne correspondent pas.");
                        setPasswordModalType("error");
                        setShowPasswordModal(true);
                        return;
                      }
                      
                      if (newPassword.length < 6) {
                        setPasswordModalMessage("Le nouveau mot de passe doit contenir au moins 6 caractères.");
                        setPasswordModalType("error");
                        setShowPasswordModal(true);
                        return;
                      }
                      
                      try {
                        const token = localStorage.getItem("token");
                        const res = await fetch(buildApiUrl("/api/profile/change-password"), {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({
                            currentPassword,
                            newPassword,
                            confirmNewPassword,
                          }),
                        });
                        
                        // Check if the response is JSON before parsing
                        const contentType = res.headers.get("content-type");
                        let data = {};
                        
                        if (contentType && contentType.includes("application/json")) {
                          data = await res.json();
                        } else {
                          // If not JSON, try to extract error message from HTML or use default
                          const textResponse = await res.text();
                          console.error("Non-JSON response:", textResponse);
                          data = { message: res.status === 404 ? "Endpoint non trouvé. Vérifiez que l'API est correctement déployée." : `Erreur HTTP ${res.status}` };
                        }
                        
                        if (res.ok) {
                          setPasswordModalMessage("Mot de passe mis à jour avec succès.");
                          setPasswordModalType("success");
                          setShowPasswordModal(true);
                          // Reset form
                          e.target.reset();
                        } else {
                          setPasswordModalMessage(data.message || `Erreur: ${res.status}`);
                          setPasswordModalType("error");
                          setShowPasswordModal(true);
                        }
                      } catch (err) {
                        console.error(err);
                        setPasswordModalMessage("Erreur réseau lors de la modification du mot de passe.");
                        setPasswordModalType("error");
                        setShowPasswordModal(true);
                      }
                    }}
                  >
                    <div>
                      <label className="block text-xs mb-1 text-slate-300">
                        Ancien mot de passe
                      </label>
                      <input
                        type="password"
                        name="currentPassword"
                        required
                        className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs mb-1 text-slate-300">
                        Nouveau mot de passe
                      </label>
                      <input
                        type="password"
                        name="newPassword"
                        required
                        minLength="6"
                        className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs mb-1 text-slate-300">
                        Confirmer le nouveau mot de passe
                      </label>
                      <input
                        type="password"
                        name="confirmNewPassword"
                        required
                        minLength="6"
                        className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                      />
                    </div>
                    
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white w-full"
                    >
                      Changer le mot de passe
                    </button>
                  </form>
                </div>
              )}
              
              {/* Navigation Links - Modern Design */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button 
                  onClick={() => setActiveSection("history")}
                  className="text-sm py-3 px-4 rounded-xl bg-gradient-to-br from-slate-700/50 to-slate-800/50 hover:from-slate-700 hover:to-slate-700 text-slate-200 text-left transition-all duration-200 shadow-sm hover:shadow-md border border-slate-600/30 hover:border-slate-500/50 flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Historique
                </button>
                <button 
                  onClick={() => setActiveSection("bank")}
                  className="text-sm py-3 px-4 rounded-xl bg-gradient-to-br from-slate-700/50 to-slate-800/50 hover:from-slate-700 hover:to-slate-700 text-slate-200 text-left transition-all duration-200 shadow-sm hover:shadow-md border border-slate-600/30 hover:border-slate-500/50 flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                  </svg>
                  Banque
                </button>
                <button 
                  onClick={() => setActiveSection("language")}
                  className="text-sm py-3 px-4 rounded-xl bg-gradient-to-br from-slate-700/50 to-slate-800/50 hover:from-slate-700 hover:to-slate-700 text-slate-200 text-left transition-all duration-200 shadow-sm hover:shadow-md border border-slate-600/30 hover:border-slate-500/50 flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                  </svg>
                  Langue
                </button>
                {user?.vipLevel === "VIP" && (
                  <button 
                    onClick={() => setActiveSection("promo")}
                    className="text-sm py-3 px-4 rounded-xl bg-gradient-to-br from-slate-700/50 to-slate-800/50 hover:from-slate-700 hover:to-slate-700 text-slate-200 text-left transition-all duration-200 shadow-sm hover:shadow-md border border-slate-600/30 hover:border-slate-500/50 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                    </svg>
                    Promo
                  </button>
                )}

              </div>




              
              {/* Logout Button */}
              <div className="pt-6 mt-6 border-t border-slate-800">
                <button
                  onClick={handleLogout}
                  className="w-full py-3 rounded-lg transition-all bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 shadow-lg shadow-red-500/20 font-semibold flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  </svg>
                  {L.logout}
                </button>
              </div>
            </section>
          )}

          {/* BANQUE */}
          {activeSection === "bank" && (
            <section className="mb-10 bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-semibold tracking-tight">
                  {L.bankSectionTitle}
                </h2>
                <button 
                  onClick={() => setActiveSection("profile")}
                  className="text-xs py-1.5 px-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                  Retour
                </button>
              </div>
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
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-semibold tracking-tight">
                  {L.languageSectionTitle}
                </h2>
                <button 
                  onClick={() => setActiveSection("profile")}
                  className="text-xs py-1.5 px-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                  Retour
                </button>
              </div>
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

          {/* DOWNLOAD APP */}
          {activeSection === "download" && (
            <section className="mb-10 bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-semibold tracking-tight">
                  {L.downloadSectionTitle}
                </h2>
                <button 
                  onClick={() => setActiveSection("overview")}
                  className="text-xs py-1.5 px-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                  Retour
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mb-4">
                {L.downloadHint}
              </p>
              
              {/* Android Download Card */}
              <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 border border-green-700/50 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-green-600/20 rounded-xl flex items-center justify-center">
                    <svg className="w-10 h-10 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.523 15.342c-.295 0-.585-.08-.835-.237l-5.173-3.234a1.512 1.512 0 010-2.572l5.173-3.234c.25-.156.54-.237.835-.237.854 0 1.55.696 1.55 1.55v6.414c0 .854-.696 1.55-1.55 1.55zM6.477 8.658c.295 0 .585.08.835.237l5.173 3.234a1.512 1.512 0 010 2.572l-5.173 3.234c-.25.156-.54.237-.835.237-.854 0-1.55-.696-1.55-1.55V10.208c0-.854.696-1.55 1.55-1.55z"/>
                      <path d="M6 18c0 1.105.672 2 1.5 2s1.5-.895 1.5-2-.672-2-1.5-2S6 16.895 6 18zM15 18c0 1.105.672 2 1.5 2s1.5-.895 1.5-2-.672-2-1.5-2-1.5.895-1.5 2zM3 6l3.464 2 3.464-2-3.464-2L3 6zM14.072 6l3.464 2 3.464-2-3.464-2-3.464 2z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-green-300 mb-1">Android</h3>
                    <p className="text-[11px] text-slate-400">APK - v1.0.0</p>
                  </div>
                </div>
                <a
                  href="/Windelevery.apk"
                  download="Windelevery.apk"
                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {L.downloadButton}
                </a>
              </div>
              
              <p className="text-[10px] text-slate-500 text-center">
                {L.downloadNote}
              </p>
            </section>
          )}

          {/* PROMO CODE (user) */}
          {activeSection === "promo" && (
            <section className="mb-10 bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-semibold tracking-tight">Code promo</h2>
                <button 
                  onClick={() => setActiveSection("profile")}
                  className="text-xs py-1.5 px-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                  Retour
                </button>
              </div>
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
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm font-semibold tracking-tight">
          {L.supportSectionTitle}
        </h2>
        <button 
          onClick={() => setActiveSection("profile")}
          className="text-xs py-1.5 px-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Retour
        </button>
      </div>
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

          {/* VIP UPGRADE */}
          {activeSection === "vip" && (
            <section className="mb-10 bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-semibold tracking-tight">Upgrade to VIP</h2>
                <button 
                  onClick={() => setActiveSection("overview")}
                  className="text-xs py-1.5 px-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                  Retour
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mb-4">Devenir membre VIP pour accéder à des avantages exclusifs.</p>
              <button
                onClick={handleUpgradeVip}
                className="w-full py-3 text-base rounded-lg bg-indigo-600 hover:bg-indigo-700 font-semibold"
              >
                Go VIP
              </button>
            </section>
          )}

      {/* Floating support button */}
      <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-2">
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

        {/* BOTTOM NAVIGATION */}
        <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-b from-slate-900 to-slate-950 border-t border-slate-800/50 p-3 shadow-2xl shadow-black/50 z-10">
          <div className="max-w-6xl mx-auto grid grid-cols-5 gap-1">
            <button
              onClick={() => setActiveSection("overview")}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all ${activeSection === "overview" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/50"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 mb-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
              <span className="text-xs font-medium">Vue</span>
            </button>
            
            <button
              onClick={() => setActiveSection("referrals")}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all ${activeSection === "referrals" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/50"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 mb-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.522c-.126.252-.256.499-.392.741m5.058-.741a9.094 9.094 0 01.392-.741M12 12.75a5.995 5.995 0 00-5.058 2.522C6.012 15.75 6 15.973 6 16.2v.75" />
              </svg>
              <span className="text-xs font-medium">Parrainage</span>
            </button>
            
            <button
              onClick={() => setActiveSection("vip")}
              className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl transition-all ${activeSection === "vip" ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30" : "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/20"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 mb-1 drop-shadow">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="text-xs font-bold">Upgrade VIP</span>
            </button>
            
            <button
              onClick={() => setActiveSection("download")}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all ${activeSection === "download" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/50"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 mb-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              <span className="text-xs font-medium">Télécharger</span>
            </button>
            
            <button
              onClick={() => setActiveSection("profile")}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all ${activeSection === "profile" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/50"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 mb-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              <span className="text-xs font-medium">Profil</span>
            </button>
          </div>
        </nav>
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

            <div className="aspect-video mb-3 bg-black rounded-lg overflow-hidden relative">
              {selectedPlatform && selectedPlatform !== 'youtube' ? (
                <>
                  {playerLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/50">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-600 border-t-blue-500 mx-auto mb-3"></div>
                        <p className="text-white text-sm">Chargement de la vidéo {selectedPlatform}...</p>
                      </div>
                    </div>
                  )}
                  <iframe
                    src={getEmbedUrl(currentTask.videoUrl, selectedPlatform)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    style={{ border: 'none' }}
                    onLoad={() => setPlayerLoading(false)}
                    onError={() => {
                      console.error('Erreur chargement iframe');
                      setPlayerLoading(false);
                    }}
                  />
                </>
              ) : (
                <>
                  {playerLoading && getYoutubeIdFromUrl(currentTask.videoUrl) && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/50">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-600 border-t-red-500 mx-auto mb-3"></div>
                        <p className="text-white text-sm">Chargement de la vidéo...</p>
                      </div>
                    </div>
                  )}
                  {!getYoutubeIdFromUrl(currentTask.videoUrl) ? (
                    <div className="absolute inset-0 flex items-center justify-center text-center p-4">
                      <div>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto mb-4 text-red-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                        <p className="text-white text-sm font-semibold mb-2">URL YouTube invalide</p>
                        <p className="text-slate-400 text-xs">Impossible de charger la vidéo.</p>
                        <p className="text-slate-500 text-xs mt-2 break-all">{currentTask.videoUrl}</p>
                      </div>
                    </div>
                  ) : (
                    <YouTube
                      videoId={getYoutubeIdFromUrl(currentTask.videoUrl)}
                      className="w-full h-full"
                      opts={{
                      width: "100%",
                      height: "100%",
                      playerVars: {
                        autoplay: 1,
                        rel: 0,           // Ne pas afficher les vidéos recommandées à la fin
                        modestbranding: 1, // Logo YouTube discret
                        fs: 1,             // Permettre le plein écran
                        enablejsapi: 1,    // Permettre l'API JavaScript
                        origin: window.location.origin, // Pour le comptage des vues
                        widget_referrer: window.location.href, // Référent pour le suivi
                      },
                    }}
                    onStateChange={handlePlayerStateChange}
                    onReady={(event) => {
                      // S'assurer que la vidéo est prête et que le comptage commence
                      console.log('Lecteur YouTube prêt');
                      setPlayerLoading(false);
                      if (event.target) {
                        try {
                          event.target.playVideo();
                        } catch (err) {
                          console.error('Erreur lors du lancement de la vidéo:', err);
                        }
                      }
                    }}
                    onError={(error) => {
                      console.error('Erreur du lecteur YouTube:', error);
                      setPlayerLoading(false);
                    }}
                  />
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-between mb-3 gap-3">
              {(!selectedPlatform || selectedPlatform === 'youtube') && (
                <button
                  onClick={handleLikeVideo}
                  disabled={hasLikedCurrentVideo}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white text-xs font-semibold transition-all shadow-lg ${
                    hasLikedCurrentVideo
                      ? 'bg-emerald-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 hover:shadow-red-500/50 hover:scale-105'
                  }`}
                >
                  {hasLikedCurrentVideo ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                      </svg>
                      Déjà liké ✓
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 016 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.230l-3.114-1.04a4.501 4.501 0 00-1.423-.23h-.777zM2.331 10.977a11.969 11.969 0 00-.831 4.398 12 12 0 00.52 3.507c.26.85 1.084 1.368 1.973 1.368H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 01-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227z" />
                      </svg>
                      J'aime
                    </>
                  )}
                </button>
              )}
              <div className="flex-1 text-xs">
                <p className="text-slate-300">
                  {L.videoModalTimeSeen}:{" "}
                  <span className="font-semibold">
                    {Math.floor(watchedSeconds)} s
                  </span>{" "}
                  / {currentTask.durationSeconds} s
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end mb-3 text-xs">
              {!canContinue ? (
                <p className="text-amber-300">
                  {L.videoModalNeedToWatchPrefix}{" "}
                  {currentTask.durationSeconds}{" "}
                  {L.videoModalNeedToWatchSuffix}
                </p>
              ) : needsLike && !hasLikedCurrentVideo ? (
                <p className="text-red-300 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                  </svg>
                  Clique sur "J'aime" pour valider la tâche
                </p>
              ) : (
                <p className="text-emerald-300">
                  {L.videoModalCanContinue}
                </p>
              )}
            </div>

            <button
              className={`w-full py-2 rounded-lg text-sm font-semibold transition ${
                canContinue && (!needsLike || hasLikedCurrentVideo)
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-slate-700 text-slate-400 cursor-not-allowed"
              }`}
              disabled={!canContinue || (needsLike && !hasLikedCurrentVideo)}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🖱️ BOUTON CLIQUÉ - event.detail:', e.detail);
                handleContinueAfterWatch();
              }}
            >
              {L.videoModalContinueButton}
            </button>
          </div>
        </div>
      )}

      {/* POPUP DE CONFIRMATION LIKE YOUTUBE */}
      {showLikePopup && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-40 p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 backdrop-blur-xl rounded-2xl p-6 max-w-md w-full border border-slate-700/50 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center mb-4 shadow-lg shadow-red-500/50">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-white">
                  <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 016 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.230l-3.114-1.04a4.501 4.501 0 00-1.423-.23h-.777zM2.331 10.977a11.969 11.969 0 00-.831 4.398 12 12 0 00.52 3.507c.26.85 1.084 1.368 1.973 1.368H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 01-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                ❤️ Liker cette vidéo YouTube
              </h3>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
                <p className="text-xs text-amber-200 font-semibold flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                  </svg>
                  Important : Tu dois liker pour valider la tâche !
                </p>
              </div>
              <p className="text-sm text-slate-300 mb-2 leading-relaxed">
                1️⃣ Connecte-toi à ton compte Google/YouTube
              </p>
              <p className="text-sm text-slate-300 mb-2 leading-relaxed">
                2️⃣ Clique sur le bouton "J'aime" 👍 sur la vidéo
              </p>
              <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                3️⃣ Reviens ici et le bouton de validation sera activé
              </p>
              <p className="text-xs text-slate-400 mb-6">
                💡 Si tu as déjà liké cette vidéo avant, pas besoin de le refaire !
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowLikePopup(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmLikeVideo}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-sm font-semibold transition-all shadow-lg hover:shadow-red-500/50"
                >
                  Ouvrir YouTube
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SOLDE INSUFFISANT POUR VIP */}
      {showInsufficientBalanceModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-red-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2">Solde insuffisant</h3>
                <p className="text-sm text-slate-300 mb-3">
                  Votre solde actuel est de <span className="font-semibold text-emerald-400">{(user.balanceCents || 0) / 100} MAD</span>.
                </p>
                <p className="text-sm text-slate-300">
                  Il vous faut au moins <span className="font-semibold text-red-400">{requiredAmount} MAD</span> pour passer à ce plan VIP.
                </p>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4 mb-4 border border-slate-700/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Montant nécessaire:</span>
                <span className="font-bold text-white">{requiredAmount} MAD</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-slate-400">Votre solde:</span>
                <span className="font-semibold text-slate-300">{(user.balanceCents || 0) / 100} MAD</span>
              </div>
              <div className="border-t border-slate-700 my-2"></div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">À déposer:</span>
                <span className="font-bold text-red-400">{Math.max(0, requiredAmount - (user.balanceCents || 0) / 100).toFixed(2)} MAD</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowInsufficientBalanceModal(false);
                  navigate('/deposit');
                }}
                className="flex-1 py-3 rounded-lg text-sm font-semibold bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-lg hover:shadow-xl"
              >
                Faire un dépôt
              </button>
              <button
                onClick={() => setShowInsufficientBalanceModal(false)}
                className="px-6 py-3 rounded-lg text-sm border border-slate-600 hover:bg-slate-800 transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spin Wheel Popup - Weekly Monday */}
      {showSpinWheel && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-purple-900 via-slate-900 to-indigo-900 border-2 border-purple-500/50 rounded-3xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
              <div className="absolute top-2 left-4 text-yellow-400 text-2xl animate-pulse">✨</div>
              <div className="absolute top-8 right-6 text-purple-300 text-xl animate-ping">★</div>
              <div className="absolute bottom-10 left-8 text-indigo-300 text-lg animate-pulse">✨</div>
            </div>
            
            <h2 className="text-2xl font-bold text-center text-white mb-2">🎰 Roue de la Chance!</h2>
            <p className="text-center text-purple-200 text-sm mb-6">Tournez la roue pour gagner des récompenses!</p>
            
            {/* Wheel Container */}
            <div className="relative w-64 h-64 mx-auto mb-6">
              {/* Arrow pointer */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
                <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[25px] border-l-transparent border-r-transparent border-t-yellow-400 drop-shadow-lg"></div>
              </div>
              
              {/* Wheel */}
              <div 
                className="w-full h-full rounded-full border-4 border-yellow-400 shadow-xl transition-transform duration-[4000ms] ease-out"
                style={{
                  transform: `rotate(${wheelRotation}deg)`,
                  background: `conic-gradient(
                    from 0deg,
                    #ef4444 0deg 51.43deg,
                    #22c55e 51.43deg 102.86deg,
                    #ef4444 102.86deg 154.29deg,
                    #f59e0b 154.29deg 205.71deg,
                    #ef4444 205.71deg 257.14deg,
                    #8b5cf6 257.14deg 308.57deg,
                    #22c55e 308.57deg 360deg
                  )`
                }}
              >
                {/* Slice labels */}
                <div className="absolute inset-0">
                  {/* Slice 0: Oops - red */}
                  <div className="absolute w-full h-full flex items-center justify-center" style={{transform: 'rotate(25.7deg)'}}>
                    <span className="text-white text-[10px] font-bold" style={{transform: 'translateY(-85px) rotate(-25.7deg)'}}>Oops!</span>
                  </div>
                  {/* Slice 1: 7 MAD - green */}
                  <div className="absolute w-full h-full flex items-center justify-center" style={{transform: 'rotate(77.1deg)'}}>
                    <span className="text-white text-[10px] font-bold" style={{transform: 'translateY(-85px) rotate(-77.1deg)'}}>7 MAD</span>
                  </div>
                  {/* Slice 2: Oops - red */}
                  <div className="absolute w-full h-full flex items-center justify-center" style={{transform: 'rotate(128.5deg)'}}>
                    <span className="text-white text-[10px] font-bold" style={{transform: 'translateY(-85px) rotate(-128.5deg)'}}>Oops!</span>
                  </div>
                  {/* Slice 3: 100 MAD - orange */}
                  <div className="absolute w-full h-full flex items-center justify-center" style={{transform: 'rotate(180deg)'}}>
                    <span className="text-white text-[10px] font-bold" style={{transform: 'translateY(-85px) rotate(-180deg)'}}>100 MAD</span>
                  </div>
                  {/* Slice 4: Oops - red */}
                  <div className="absolute w-full h-full flex items-center justify-center" style={{transform: 'rotate(231.4deg)'}}>
                    <span className="text-white text-[10px] font-bold" style={{transform: 'translateY(-85px) rotate(-231.4deg)'}}>Oops!</span>
                  </div>
                  {/* Slice 5: 500 MAD - purple */}
                  <div className="absolute w-full h-full flex items-center justify-center" style={{transform: 'rotate(282.8deg)'}}>
                    <span className="text-white text-[10px] font-bold" style={{transform: 'translateY(-85px) rotate(-282.8deg)'}}>500 MAD</span>
                  </div>
                  {/* Slice 6: 7 MAD - green */}
                  <div className="absolute w-full h-full flex items-center justify-center" style={{transform: 'rotate(334.2deg)'}}>
                    <span className="text-white text-[10px] font-bold" style={{transform: 'translateY(-85px) rotate(-334.2deg)'}}>7 MAD</span>
                  </div>
                </div>
                {/* Center circle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 border-4 border-white shadow-lg flex items-center justify-center">
                  <span className="text-white text-xl">🎲</span>
                </div>
              </div>
            </div>
            
            {/* Result display */}
            {spinResult && (
              <div className={`text-center mb-4 p-4 rounded-xl ${spinResult.result === 'oops' ? 'bg-red-900/50 border border-red-500/50' : 'bg-emerald-900/50 border border-emerald-500/50'}`}>
                {spinResult.result === 'oops' ? (
                  <>
                    <p className="text-2xl mb-2">😢</p>
                    <p className="text-lg font-bold text-red-300">Oops! À la prochaine!</p>
                    <p className="text-sm text-red-200">Revenez lundi prochain pour retenter votre chance!</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl mb-2">🎉</p>
                    <p className="text-lg font-bold text-emerald-300">Félicitations!</p>
                    <p className="text-xl font-bold text-white">Vous avez gagné {(spinResult.rewardCents / 100).toFixed(2)} MAD!</p>
                    <p className="text-sm text-emerald-200">Le montant a été ajouté à votre solde.</p>
                  </>
                )}
              </div>
            )}
            
            {/* Message when not Monday */}
            {!canActuallySpin && !spinResult && spinMessage && (
              <div className="text-center mb-4 p-4 rounded-xl bg-amber-900/50 border border-amber-500/50">
                <p className="text-2xl mb-2">⏰</p>
                <p className="text-lg font-bold text-amber-300">{spinMessage}</p>
                <p className="text-sm text-amber-200">La roue tourne uniquement le lundi!</p>
              </div>
            )}
            
            {/* Buttons */}
            <div className="flex gap-3">
              {!spinResult ? (
                canActuallySpin ? (
                  <button
                    onClick={handleSpin}
                    disabled={isSpinning}
                    className={`flex-1 py-3 rounded-xl font-bold text-white transition-all ${isSpinning ? 'bg-slate-600 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg hover:shadow-purple-500/30'}`}
                  >
                    {isSpinning ? 'Tirage en cours...' : '🎰 Tourner la roue!'}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowSpinWheel(false);
                      setSpinResult(null);
                      setWheelRotation(0);
                    }}
                    className="flex-1 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600"
                  >
                    Fermer
                  </button>
                )
              ) : (
                <button
                  onClick={() => {
                    setShowSpinWheel(false);
                    setSpinResult(null);
                    setWheelRotation(0);
                  }}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600"
                >
                  Fermer
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIP Features Popup */}
      {showVipFeaturesPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-purple-500/50 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative overflow-hidden animate-fadeIn">
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500 rounded-full filter blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-500 rounded-full filter blur-3xl"></div>
            </div>
            
            {/* Close button */}
            <button
              onClick={() => setShowVipFeaturesPopup(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-700/80 hover:bg-slate-600 flex items-center justify-center z-10 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Plan 1: STARTER */}
            {showVipFeaturesPopup === 1 && (
              <div className="relative z-10">
                <div className="text-center mb-6">
                  <div className="inline-block px-4 py-2 rounded-full bg-indigo-500/20 text-indigo-400 text-sm font-bold mb-3">
                    ⭐ PACK STARTER
                  </div>
                  <h3 className="text-3xl font-black text-white mb-1">80 MAD</h3>
                  <p className="text-slate-400">Validité: 2 mois</p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                      <p className="font-semibold text-white">5 MAD / Jour</p>
                      <p className="text-xs text-slate-400">Gains journaliers garantis</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <div>
                      <p className="font-semibold text-white">60 jours d'accès</p>
                      <p className="text-xs text-slate-400">Accès complet pendant 2 mois</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                    </div>
                    <div>
                      <p className="font-semibold text-white">Codes promo acceptés</p>
                      <p className="text-xs text-slate-400">Utilisez vos codes de réduction</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <div>
                      <p className="font-semibold text-white">Gain total: ~300 MAD</p>
                      <p className="text-xs text-slate-400">Retour sur investissement x3.75</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => { setShowVipFeaturesPopup(null); setSelectedVipPlan(1); }}
                  className="w-full mt-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg"
                >
                  Choisir ce pack
                </button>
              </div>
            )}

            {/* Plan 2: POPULAIRE */}
            {showVipFeaturesPopup === 2 && (
              <div className="relative z-10">
                <div className="text-center mb-6">
                  <div className="inline-block px-4 py-2 rounded-full bg-purple-500/20 text-purple-400 text-sm font-bold mb-3">
                    🔥 PACK POPULAIRE
                  </div>
                  <h3 className="text-3xl font-black text-white mb-1">150 MAD</h3>
                  <p className="text-slate-400">Validité: 3 mois</p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                      <p className="font-semibold text-white">8 MAD / Jour</p>
                      <p className="text-xs text-slate-400">Gains journaliers garantis</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <div>
                      <p className="font-semibold text-white">90 jours d'accès</p>
                      <p className="text-xs text-slate-400">Accès complet pendant 3 mois</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                    </div>
                    <div>
                      <p className="font-semibold text-white">Codes promo acceptés</p>
                      <p className="text-xs text-slate-400">Utilisez vos codes de réduction</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <div>
                      <p className="font-semibold text-white">Gain total: ~720 MAD</p>
                      <p className="text-xs text-slate-400">Retour sur investissement x4.8</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => { setShowVipFeaturesPopup(null); setSelectedVipPlan(2); }}
                  className="w-full mt-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg"
                >
                  Choisir ce pack
                </button>
              </div>
            )}

            {/* Plan 3: PREMIUM */}
            {showVipFeaturesPopup === 3 && (
              <div className="relative z-10">
                <div className="text-center mb-6">
                  <div className="inline-block px-4 py-2 rounded-full bg-amber-500/20 text-amber-400 text-sm font-bold mb-3">
                    💎 PACK PREMIUM
                  </div>
                  <h3 className="text-3xl font-black text-white mb-1">300 MAD</h3>
                  <p className="text-slate-400">Validité: 3 mois</p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                      <p className="font-semibold text-white">15 MAD / Jour</p>
                      <p className="text-xs text-slate-400">Gains journaliers garantis</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <div>
                      <p className="font-semibold text-white">90 jours d'accès</p>
                      <p className="text-xs text-slate-400">Accès complet pendant 3 mois</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                    </div>
                    <div>
                      <p className="font-semibold text-white">Codes promo acceptés</p>
                      <p className="text-xs text-slate-400">Utilisez vos codes de réduction</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <div>
                      <p className="font-semibold text-white">Gain total: ~1350 MAD</p>
                      <p className="text-xs text-slate-400">Retour sur investissement x4.5</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => { setShowVipFeaturesPopup(null); setSelectedVipPlan(3); }}
                  className="w-full mt-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 transition-all shadow-lg"
                >
                  Choisir ce pack
                </button>
              </div>
            )}

            {/* Plan 4: ELITE VIP */}
            {showVipFeaturesPopup === 4 && (
              <div className="relative z-10">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-500/30 to-amber-500/30 border border-yellow-500/50 text-yellow-400 text-sm font-bold mb-3">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
                    PACK ELITE VIP GOLD
                  </div>
                  <h3 className="text-3xl font-black bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent mb-1">500 MAD</h3>
                  <p className="text-yellow-400/80">Validité: 6 mois</p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-yellow-900/20 border border-yellow-500/30">
                    <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                      <p className="font-semibold text-white">20 MAD / Jour</p>
                      <p className="text-xs text-yellow-400/70">Les meilleurs gains disponibles</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-yellow-900/20 border border-yellow-500/30">
                    <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <div>
                      <p className="font-semibold text-white">180 jours d'accès</p>
                      <p className="text-xs text-yellow-400/70">Accès VIP pendant 6 mois complets</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-yellow-900/20 border border-yellow-500/30">
                    <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                    </div>
                    <div>
                      <p className="font-semibold text-white">Statut ELITE exclusif</p>
                      <p className="text-xs text-yellow-400/70">Badge doré et privilèges spéciaux</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-yellow-900/20 border border-yellow-500/30">
                    <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <div>
                      <p className="font-semibold text-white">Gain total: ~3600 MAD</p>
                      <p className="text-xs text-yellow-400/70">Retour sur investissement x7.2</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => { setShowVipFeaturesPopup(null); setSelectedVipPlan(4); }}
                  className="w-full mt-6 py-3 rounded-xl font-bold text-black bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 transition-all shadow-lg shadow-yellow-500/30"
                >
                  ⭐ Choisir ce pack ELITE
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIP Success Celebration Popup */}
            {showVipSuccessPopup && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
                <div className={`relative w-full max-w-md rounded-3xl p-8 shadow-2xl overflow-hidden animate-fadeIn ${
                  vipSuccessData.planId === 4 
                    ? 'bg-gradient-to-br from-yellow-900/90 via-amber-900/90 to-orange-900/90 border-2 border-yellow-500/50 shadow-yellow-500/30'
                    : vipSuccessData.planId === 3
                    ? 'bg-gradient-to-br from-amber-900/90 via-slate-900 to-orange-900/90 border-2 border-amber-500/50 shadow-amber-500/20'
                    : vipSuccessData.planId === 2
                    ? 'bg-gradient-to-br from-purple-900/90 via-slate-900 to-pink-900/90 border-2 border-purple-500/50 shadow-purple-500/20'
                    : 'bg-gradient-to-br from-indigo-900/90 via-slate-900 to-purple-900/90 border-2 border-indigo-500/50 shadow-indigo-500/20'
                }`}>
                  {/* Confetti animation */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-0 left-1/4 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
                    <div className="absolute top-10 right-1/4 w-2 h-2 bg-pink-400 rounded-full animate-ping" style={{animationDelay: '0.2s'}}></div>
                    <div className="absolute top-5 left-3/4 w-2 h-2 bg-emerald-400 rounded-full animate-ping" style={{animationDelay: '0.4s'}}></div>
                    <div className="absolute top-16 left-1/3 w-2 h-2 bg-blue-400 rounded-full animate-ping" style={{animationDelay: '0.6s'}}></div>
                    <div className="absolute top-8 right-1/3 w-3 h-3 bg-purple-400 rounded-full animate-ping" style={{animationDelay: '0.8s'}}></div>
                    <div className="absolute bottom-20 left-1/4 w-2 h-2 bg-amber-400 rounded-full animate-ping" style={{animationDelay: '0.3s'}}></div>
                    <div className="absolute bottom-16 right-1/4 w-2 h-2 bg-indigo-400 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
                  </div>
      
                  {/* Trophy/Star Icon */}
                  <div className="flex justify-center mb-6">
                    <div className={`relative w-24 h-24 rounded-full flex items-center justify-center ${
                      vipSuccessData.planId === 4 
                        ? 'bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg shadow-yellow-500/50'
                        : vipSuccessData.planId === 3
                        ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/50'
                        : vipSuccessData.planId === 2
                        ? 'bg-gradient-to-br from-purple-400 to-pink-500 shadow-lg shadow-purple-500/50'
                        : 'bg-gradient-to-br from-indigo-400 to-purple-500 shadow-lg shadow-indigo-500/50'
                    }`}>
                      <svg className="w-14 h-14 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                      </svg>
                      <div className="absolute inset-0 rounded-full animate-ping opacity-30" style={{
                        background: vipSuccessData.planId === 4 ? 'linear-gradient(to br, #facc15, #f59e0b)' :
                                   vipSuccessData.planId === 3 ? 'linear-gradient(to br, #fbbf24, #f97316)' :
                                   vipSuccessData.planId === 2 ? 'linear-gradient(to br, #a855f7, #ec4899)' :
                                   'linear-gradient(to br, #818cf8, #a855f7)'
                      }}></div>
                    </div>
                  </div>
      
                  {/* Success Message */}
                  <div className="text-center mb-6">
                    <h2 className="text-3xl font-black text-white mb-2">🎉 Félicitations!</h2>
                    <p className={`text-lg font-semibold mb-1 ${
                      vipSuccessData.planId === 4 ? 'text-yellow-400' :
                      vipSuccessData.planId === 3 ? 'text-amber-400' :
                      vipSuccessData.planId === 2 ? 'text-purple-400' : 'text-indigo-400'
                    }`}>
                      Vous êtes maintenant {vipSuccessData.planName}!
                    </p>
                    <p className="text-sm text-slate-300">Votre upgrade a été activé avec succès</p>
                  </div>
      
                  {/* Plan Details */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/10 border border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="text-white font-medium">Gains journaliers</span>
                      </div>
                      <span className="text-emerald-400 font-bold text-lg">{vipSuccessData.dailyRate} MAD/jour</span>
                    </div>
      
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/10 border border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <span className="text-white font-medium">Durée</span>
                      </div>
                      <span className="text-blue-400 font-bold text-lg">{vipSuccessData.months} mois</span>
                    </div>
      
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/10 border border-white/10">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          vipSuccessData.planId === 4 ? 'bg-yellow-500/20' :
                          vipSuccessData.planId === 3 ? 'bg-amber-500/20' :
                          vipSuccessData.planId === 2 ? 'bg-purple-500/20' : 'bg-indigo-500/20'
                        }`}>
                          <svg className={`w-5 h-5 ${
                            vipSuccessData.planId === 4 ? 'text-yellow-400' :
                            vipSuccessData.planId === 3 ? 'text-amber-400' :
                            vipSuccessData.planId === 2 ? 'text-purple-400' : 'text-indigo-400'
                          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <span className="text-white font-medium">Gain total potentiel</span>
                      </div>
                      <span className={`font-bold text-lg ${
                        vipSuccessData.planId === 4 ? 'text-yellow-400' :
                        vipSuccessData.planId === 3 ? 'text-amber-400' :
                        vipSuccessData.planId === 2 ? 'text-purple-400' : 'text-indigo-400'
                      }`}>~{(vipSuccessData.dailyRate * vipSuccessData.months * 30).toFixed(0)} MAD</span>
                    </div>
                  </div>
      
                  {/* Close Button */}
                  <button
                    onClick={() => setShowVipSuccessPopup(false)}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg ${
                      vipSuccessData.planId === 4 
                        ? 'bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black shadow-yellow-500/30'
                        : vipSuccessData.planId === 3
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-amber-500/30'
                        : vipSuccessData.planId === 2
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white shadow-purple-500/30'
                        : 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white shadow-indigo-500/30'
                    }`}
                  >
                    🚀 Commencer à gagner!
                  </button>
                </div>
              </div>
            )}
      
            {/* Modal de succès - Tâche complétée */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-900 border-2 border-emerald-500/50 rounded-2xl p-8 w-full max-w-md shadow-2xl shadow-emerald-500/20 relative overflow-hidden">
            {/* Animation de confettis en arrière-plan */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/4 w-2 h-2 bg-emerald-400 rounded-full animate-ping"></div>
              <div className="absolute top-10 right-1/4 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-ping" style={{animationDelay: '0.3s'}}></div>
              <div className="absolute top-5 left-3/4 w-1 h-1 bg-indigo-400 rounded-full animate-ping" style={{animationDelay: '0.6s'}}></div>
              <div className="absolute top-16 left-1/3 w-1.5 h-1.5 bg-pink-400 rounded-full animate-ping" style={{animationDelay: '0.9s'}}></div>
            </div>

            {/* Icône de succès */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/50 animate-bounce">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-white">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="absolute inset-0 w-20 h-20 rounded-full bg-emerald-400/50 animate-ping"></div>
              </div>
            </div>

            {/* Titre et message */}
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">🎉 Félicitations !</h3>
              <p className="text-lg text-emerald-300 font-semibold mb-1">Tâche complétée avec succès</p>
              <p className="text-sm text-slate-400">Vous avez gagné des points !</p>
            </div>

            {/* Détails de la récompense */}
            <div className="bg-slate-800/60 rounded-xl p-5 mb-6 border border-emerald-500/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-300 text-sm">Récompense:</span>
                <span className="text-2xl font-bold text-emerald-400">+{successData.reward.toFixed(2)} MAD</span>
              </div>
              <div className="border-t border-slate-700 my-3"></div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300 text-sm">Nouveau solde:</span>
                <span className="text-xl font-bold text-white">{successData.newBalance.toFixed(2)} MAD</span>
              </div>
            </div>

            {/* Bouton de fermeture */}
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3 rounded-lg text-base font-semibold bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-lg hover:shadow-xl text-white"
            >
              Continuer
            </button>
          </div>
        </div>
      )}

      {/* Modal d'erreur - Tâche introuvable ou autre erreur */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-gradient-to-br from-red-900 via-slate-900 to-slate-900 border-2 border-red-500/50 rounded-2xl p-8 w-full max-w-md shadow-2xl shadow-red-500/20 relative overflow-hidden">
            {/* Animation en arrière-plan */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/4 w-2 h-2 bg-red-400 rounded-full animate-ping"></div>
              <div className="absolute top-10 right-1/4 w-1.5 h-1.5 bg-orange-400 rounded-full animate-ping" style={{animationDelay: '0.3s'}}></div>
              <div className="absolute top-5 left-3/4 w-1 h-1 bg-red-300 rounded-full animate-ping" style={{animationDelay: '0.6s'}}></div>
            </div>

            {/* Icône d'erreur */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/50 animate-pulse">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-white">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="absolute inset-0 w-20 h-20 rounded-full bg-red-400/50 animate-ping"></div>
              </div>
            </div>

            {/* Titre et message */}
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">❌ Oups !</h3>
              <p className="text-lg text-red-300 font-semibold mb-1">Une erreur est survenue</p>
              <p className="text-sm text-slate-400">Veuillez réessayer</p>
            </div>

            {/* Message d'erreur */}
            <div className="bg-slate-800/60 rounded-xl p-5 mb-6 border border-red-500/30">
              <div className="flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <p className="text-slate-300 text-sm leading-relaxed">{errorMessage}</p>
              </div>
            </div>

            {/* Bouton de fermeture */}
            <button
              onClick={() => setShowErrorModal(false)}
              className="w-full py-3 rounded-lg text-base font-semibold bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:shadow-xl text-white"
            >
              Compris
            </button>
          </div>
        </div>
      )}

      {/* Modal de limite horaire - Dépôt/Retrait hors horaire */}
      {showTimeLimitModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-gradient-to-br from-orange-900 via-slate-900 to-slate-900 border-2 border-orange-500/50 rounded-2xl p-8 w-full max-w-md shadow-2xl shadow-orange-500/20 relative overflow-hidden">
            {/* Animation en arrière-plan */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/4 w-2 h-2 bg-orange-400 rounded-full animate-ping"></div>
              <div className="absolute top-10 right-1/4 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-ping" style={{animationDelay: '0.3s'}}></div>
              <div className="absolute top-5 left-3/4 w-1 h-1 bg-amber-400 rounded-full animate-ping" style={{animationDelay: '0.6s'}}></div>
            </div>

            {/* Icône d'horloge */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/50 animate-pulse">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-white">
                    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="absolute inset-0 w-20 h-20 rounded-full bg-orange-400/50 animate-ping"></div>
              </div>
            </div>

            {/* Titre et message */}
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">⏰ Hors horaire</h3>
              <p className="text-lg text-orange-300 font-semibold mb-1">
                {timeLimitOperation === "deposit" ? "Dépôt" : "Retrait"} non autorisé
              </p>
              <p className="text-sm text-slate-400">Merci de revenir pendant les heures permises</p>
            </div>

            {/* Horaires autorisés */}
            <div className="bg-slate-800/60 rounded-xl p-5 mb-6 border border-orange-500/30">
              <div className="bg-slate-900/50 rounded-lg p-3 border border-orange-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-400">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs text-slate-400 font-semibold">Horaires autorisés:</span>
                </div>
                <p className="text-emerald-300 font-bold text-lg text-center">10h00 - 19h30</p>
                <p className="text-slate-400 text-xs text-center mt-1">(Heure du serveur)</p>
              </div>
            </div>

            {/* Bouton de fermeture */}
            <button
              onClick={() => setShowTimeLimitModal(false)}
              className="w-full py-3 rounded-lg text-base font-semibold bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 transition-all shadow-lg hover:shadow-xl text-white"
            >
              J'ai compris
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

      {/* MODAL VIP - 4 PLANS DE PRICING */}
      {showVipModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-4 sm:p-6 w-full max-w-6xl mt-4 sm:my-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Passer en VIP
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Choisissez le plan qui vous convient le mieux
                </p>
              </div>
              <button
                className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
                onClick={() => {
                  setShowVipModal(false);
                  setSelectedVipPlan(null);
                  setVipPromoCode("");
                  setVipError("");
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Solde actuel */}
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl bg-slate-800/50 border border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-slate-300">Votre solde actuel:</span>
                <span className="text-lg sm:text-xl font-bold text-emerald-400">
                  {(user.balanceCents || 0) / 100} MAD
                </span>
              </div>
            </div>

            {/* Grille des 4 cartes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 max-h-[60vh] sm:max-h-none overflow-y-auto sm:overflow-visible">
              {/* Carte 1: 80 MAD - 1 mois */}
              {(() => {
                const isVip = (user?.vipLevel || "").toUpperCase().includes("VIP");
                const currentDailyRate = user?.dailyRateCents || 0;
                const plan1DailyRate = 500;
                const isDisabled = isVip && currentDailyRate >= plan1DailyRate;
                return (
              <div
                className={`relative rounded-xl border-2 p-4 sm:p-6 transition-all duration-300 ${
                  isDisabled
                    ? "border-slate-700 bg-slate-800/30 opacity-50 cursor-not-allowed"
                    : selectedVipPlan === 1
                    ? "border-indigo-500 bg-gradient-to-br from-indigo-900/50 to-purple-900/50 shadow-xl shadow-indigo-500/30 scale-105 cursor-pointer"
                    : "border-slate-700 bg-slate-800/50 hover:border-indigo-600 hover:shadow-lg cursor-pointer"
                }`}
                onClick={() => !isDisabled && setSelectedVipPlan(1)}
              >
                {isDisabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                    <span className="text-sm font-semibold text-slate-300">Déjà VIP</span>
                  </div>
                )}
                {selectedVipPlan === 1 && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <div className="mb-4">
                  <div className="inline-block px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-semibold mb-3">
                    STARTER
                  </div>
                  <div className="text-4xl font-black text-white mb-1">80 <span className="text-xl">MAD</span></div>
                  <div className="text-sm text-slate-400">pour 2 mois</div>
                </div>
                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-slate-300">Abonnement valable <span className="font-semibold text-white">2 mois</span></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-slate-300">Tâches fixées à <span className="font-semibold text-white">5 MAD/Jour</span></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-slate-300">Code promo accepté</span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowVipFeaturesPopup(1); }}
                  className="w-full mt-4 py-2 rounded-lg text-xs font-semibold text-indigo-300 border border-indigo-500/50 hover:bg-indigo-500/20 transition-all"
                >
                  ℹ️ Voir les avantages
                </button>
              </div>
              );
              })()}

              {/* Carte 2: 150 MAD - 3 mois */}
              {(() => {
                const currentDailyRate = user?.dailyRateCents || 0;
                const plan2DailyRate = 800;
                const isDisabled = currentDailyRate >= plan2DailyRate;
                return (
              <div
                className={`relative rounded-xl border-2 p-4 sm:p-6 transition-all duration-300 ${
                  isDisabled
                    ? "border-slate-700 bg-slate-800/30 opacity-50 cursor-not-allowed"
                    : selectedVipPlan === 2
                    ? "border-purple-500 bg-gradient-to-br from-purple-900/50 to-pink-900/50 shadow-xl shadow-purple-500/30 scale-105 cursor-pointer"
                    : "border-slate-700 bg-slate-800/50 hover:border-purple-600 hover:shadow-lg cursor-pointer"
                }`}
                onClick={() => !isDisabled && setSelectedVipPlan(2)}
              >
                {isDisabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                    <span className="text-sm font-semibold text-slate-300">Plan actuel ou inférieur</span>
                  </div>
                )}
                {selectedVipPlan === 2 && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <div className="mb-4">
                  <div className="inline-block px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-semibold mb-3">
                    POPULAIRE
                  </div>
                  <div className="text-4xl font-black text-white mb-1">150 <span className="text-xl">MAD</span></div>
                  <div className="text-sm text-slate-400">pour 3 mois</div>
                </div>
                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-slate-300">Abonnement valable <span className="font-semibold text-white">3 mois</span></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-slate-300">Tâches fixées à <span className="font-semibold text-white">8 MAD/Jour</span></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-slate-300">Code promo accepté</span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowVipFeaturesPopup(2); }}
                  className="w-full mt-4 py-2 rounded-lg text-xs font-semibold text-purple-300 border border-purple-500/50 hover:bg-purple-500/20 transition-all"
                >
                  ℹ️ Voir les avantages
                </button>
              </div>
              );
              })()}

              {/* Carte 3: 300 MAD - 3 mois */}
              {(() => {
                const currentDailyRate = user?.dailyRateCents || 0;
                const plan3DailyRate = 1500;
                const isDisabled = currentDailyRate >= plan3DailyRate;
                return (
              <div
                className={`relative rounded-xl border-2 p-4 sm:p-6 transition-all duration-300 ${
                  isDisabled
                    ? "border-slate-700 bg-slate-800/30 opacity-50 cursor-not-allowed"
                    : selectedVipPlan === 3
                    ? "border-amber-500 bg-gradient-to-br from-amber-900/50 to-orange-900/50 shadow-xl shadow-amber-500/30 scale-105 cursor-pointer"
                    : "border-slate-700 bg-slate-800/50 hover:border-amber-600 hover:shadow-lg cursor-pointer"
                }`}
                onClick={() => !isDisabled && setSelectedVipPlan(3)}
              >
                {isDisabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                    <span className="text-sm font-semibold text-slate-300">Plan actuel ou inférieur</span>
                  </div>
                )}
                {selectedVipPlan === 3 && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <div className="mb-4">
                  <div className="inline-block px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-semibold mb-3">
                    PREMIUM
                  </div>
                  <div className="text-4xl font-black text-white mb-1">300 <span className="text-xl">MAD</span></div>
                  <div className="text-sm text-slate-400">pour 3 mois</div>
                </div>
                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-slate-300">Abonnement valable <span className="font-semibold text-white">3 mois</span></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-slate-300">Tâches fixées à <span className="font-semibold text-white">15 MAD/Jour</span></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-slate-300">Code promo accepté</span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowVipFeaturesPopup(3); }}
                  className="w-full mt-4 py-2 rounded-lg text-xs font-semibold text-amber-300 border border-amber-500/50 hover:bg-amber-500/20 transition-all"
                >
                  ℹ️ Voir les avantages
                </button>
              </div>
              );
              })()}

              {/* Carte 4: 500 MAD - 6 mois - ELITE GOLD */}
              {(() => {
                const currentDailyRate = user?.dailyRateCents || 0;
                const plan4DailyRate = 2000;
                const isDisabled = currentDailyRate >= plan4DailyRate;
                return (
              <div
                className={`relative rounded-xl border-2 p-4 sm:p-6 transition-all duration-300 overflow-hidden ${
                  isDisabled
                    ? "border-slate-700 bg-slate-800/30 opacity-50 cursor-not-allowed"
                    : selectedVipPlan === 4
                    ? "border-yellow-500 bg-gradient-to-br from-yellow-900/40 via-amber-900/40 to-orange-900/40 shadow-2xl shadow-yellow-500/40 scale-105 cursor-pointer"
                    : "border-yellow-600/50 bg-gradient-to-br from-yellow-900/30 via-amber-900/30 to-orange-900/30 hover:border-yellow-500 hover:shadow-xl hover:shadow-yellow-500/30 cursor-pointer hover:scale-102"
                }`}
                onClick={() => !isDisabled && setSelectedVipPlan(4)}
              >
                {/* Effet brillant animé en arrière-plan */}
                {!isDisabled && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500/10 to-transparent animate-shimmer" 
                       style={{
                         backgroundSize: '200% 100%',
                         animation: 'shimmer 3s infinite'
                       }}
                  />
                )}
                
                {/* Badge GOLD animé en haut à gauche */}
                {!isDisabled && (
                  <div className="absolute -top-1 -left-1 w-20 h-20 overflow-hidden">
                    <div className="absolute top-3 -left-7 transform rotate-[-45deg] bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 text-black text-[10px] font-black tracking-wider py-1 px-8 shadow-lg animate-pulse">
                      GOLD
                    </div>
                  </div>
                )}
                
                
                {isDisabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl z-10">
                    <span className="text-sm font-semibold text-slate-300">Plan actuel ou inférieur</span>
                  </div>
                )}
                {selectedVipPlan === 4 && (
                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg border-2 border-yellow-300 z-10">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-black">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <div className="mb-4 relative z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500/30 via-amber-500/30 to-yellow-500/30 border border-yellow-500/50 text-yellow-400 text-xs font-black mb-3 shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 animate-pulse">
                      <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                    </svg>
                    ELITE VIP
                  </div>
                  <div className="text-5xl font-black bg-gradient-to-br from-yellow-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent mb-1 drop-shadow-lg">
                    500 <span className="text-2xl">MAD</span>
                  </div>
                  <div className="text-sm font-semibold text-yellow-400/90">pour 6 mois</div>
                </div>
                <div className="space-y-3 mb-6 relative z-10">
                  <div className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-slate-200">Abonnement valable <span className="font-bold text-yellow-400">6 mois</span></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-slate-200">Tâches fixées à <span className="font-bold text-yellow-400">20 MAD/Jour</span></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-slate-200">Code promo accepté</span>
                  </div>
                  <div className="flex items-start gap-2 pt-2 border-t border-yellow-500/30">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0 animate-pulse">
                      <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 010 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 01-1.422 0l-.395-1.183a1.5 1.5 0 00-.948-.948l-1.183-.395a.75.75 0 010-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0116.5 15z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-semibold text-yellow-400">💎 Plan Premium Exclusif</span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowVipFeaturesPopup(4); }}
                  className="w-full mt-4 py-2 rounded-lg text-xs font-semibold text-yellow-400 border border-yellow-500/50 hover:bg-yellow-500/20 transition-all relative z-10"
                >
                  ⭐ Voir les avantages ELITE
                </button>
              </div>
              );
              })()}
            </div>

            {/* Actions */}
            {selectedVipPlan && (user?.dailyRateCents || 0) < 2000 && (
              <div className="space-y-4">
                {vipError && (
                  <div className="p-4 rounded-lg bg-red-900/50 border border-red-700 text-red-300 text-sm">
                    {vipError}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center max-w-md mx-auto">
                  <button
                    className="w-full sm:w-auto px-8 py-3 rounded-lg text-base font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                    onClick={handleConfirmUpgradeVip}
                    disabled={vipLoading}
                  >
                    {vipLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Traitement...
                      </span>
                    ) : (
                      "Confirmer le paiement"
                    )}
                  </button>
                  <button
                    className="w-full sm:w-auto px-8 py-3 rounded-lg text-base border border-slate-600 hover:bg-slate-800 transition-all"
                    onClick={() => {
                      setShowVipModal(false);
                      setSelectedVipPlan(null);
                      setVipPromoCode("");
                      setVipError("");
                    }}
                    disabled={vipLoading}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {!selectedVipPlan && (user?.dailyRateCents || 0) < 2000 && (
              <p className="text-center text-sm text-slate-400 mt-4">
                Sélectionnez un plan ci-dessus pour continuer
              </p>
            )}
          </div>
        </div>
      )}

      {/* MODAL ERREUR UPGRADE VIP */}
      {showUpgradeErrorModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-amber-600/50 rounded-2xl p-8 max-w-md w-full shadow-2xl shadow-amber-600/20 animate-in fade-in zoom-in duration-300">
            {/* Icône d'avertissement */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-500/30 rounded-full blur-xl animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-amber-500 to-orange-600 rounded-full p-4">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-white">
                    <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Titre */}
            <h3 className="text-2xl font-bold text-center mb-4 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400 bg-clip-text text-transparent">
              Upgrade Non Disponible
            </h3>

            {/* Message */}
            <div className="bg-slate-800/50 rounded-xl p-6 mb-6 border border-slate-700">
              <p className="text-slate-200 text-center leading-relaxed">
                {upgradeErrorMessage}
              </p>
            </div>

            {/* Information supplémentaire */}
            <div className="bg-gradient-to-r from-amber-900/20 to-orange-900/20 rounded-lg p-4 mb-6 border border-amber-600/30">
              <div className="flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-amber-200/90">
                  Pour améliorer votre plan, veuillez sélectionner un plan avec un gain quotidien plus élevé que votre plan actuel.
                </p>
              </div>
            </div>

            {/* Bouton */}
            <button
              className="w-full py-3 rounded-xl text-base font-semibold bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => {
                setShowUpgradeErrorModal(false);
                setUpgradeErrorMessage("");
                setShowVipModal(true);
              }}
            >
              Compris
            </button>
          </div>
        </div>
      )}
      
      {/* MODAL DE CHANGEMENT DE MOT DE PASSE */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-center mb-4">
              {passwordModalType === "success" ? (
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-emerald-400">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-red-400">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            
            <h3 className={`text-lg font-semibold text-center mb-3 ${passwordModalType === "success" ? "text-emerald-400" : "text-red-400"}`}>
              {passwordModalType === "success" ? "Succès" : "Erreur"}
            </h3>
            
            <p className="text-center text-slate-300 mb-6">
              {passwordModalMessage}
            </p>
            
            <button
              onClick={() => setShowPasswordModal(false)}
              className={`w-full py-2.5 rounded-lg text-sm font-semibold ${passwordModalType === "success" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"} text-white transition-colors`}
            >
              OK
            </button>
          </div>
        </div>
      )}
      </div>
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
