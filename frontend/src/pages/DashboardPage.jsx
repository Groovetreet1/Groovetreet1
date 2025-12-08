import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import YouTube from "react-youtube";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  const [history, setHistory] = useState({ deposits: [], withdrawals: [] });
  const [historyLoading, setHistoryLoading] = useState(true);

  // section active dans le contenu principal
  const [activeSection, setActiveSection] = useState("overview");

  const navigate = useNavigate();

  // 🎥 état pour la vidéo
  const [showPlayer, setShowPlayer] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [canContinue, setCanContinue] = useState(false);
  const watchIntervalRef = useRef(null);

  // 💰 état pour le dépôt
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositError, setDepositError] = useState("");
  const [depositLoading, setDepositLoading] = useState(false);

  // 📸 état pour l'avatar
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  // 🌍 langue (juste côté front pour l’instant)
  const [language, setLanguage] = useState(
    () => localStorage.getItem("language") || "fr"
  );

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (!storedUser || !token) {
      navigate("/login");
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);

    const fetchTasks = async () => {
      try {
        const res = await fetch("http://localhost:4000/api/tasks", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (!res.ok) {
          console.error(data);
        } else {
          setTasks(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingTasks(false);
      }
    };

    const fetchHistory = async () => {
      try {
        const res = await fetch("http://localhost:4000/api/wallet/history", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (!res.ok) {
          console.error(data);
        } else {
          setHistory(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchTasks();
    fetchHistory();

    return () => {
      if (watchIntervalRef.current) clearInterval(watchIntervalRef.current);
    };
  }, [navigate]);

  const handleCompleteTask = async (taskId) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(
        `http://localhost:4000/api/tasks/${taskId}/complete`,
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
      alert("Erreur réseau");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  // ➕ Quand l'utilisateur clique sur "Commencer la tâche"
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

  // 🧩 extraire l'ID YouTube depuis l'URL
  const getYoutubeIdFromUrl = (url) => {
    if (!url) return "";
    const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
    if (shortMatch) return shortMatch[1];
    const longMatch = url.match(/[?&]v=([^&]+)/);
    if (longMatch) return longMatch[1];
    return "";
  };

  // 🎥 callbacks du player YouTube
  const handlePlayerStateChange = (event) => {
    const player = event.target;
    const minSeconds = currentTask?.durationSeconds || 15;

    if (event.data === 1) {
      if (watchIntervalRef.current) {
        clearInterval(watchIntervalRef.current);
      }
      watchIntervalRef.current = setInterval(() => {
        const secs = player.getCurrentTime();
        setWatchedSeconds(secs);
        if (secs >= minSeconds) {
          setCanContinue(true);
          clearInterval(watchIntervalRef.current);
        }
      }, 500);
    } else {
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

  // 💰 DÉPÔT – ouvrir / fermer modal
  const openDepositModal = () => {
    setDepositAmount("");
    setDepositError("");
    setShowDepositModal(true);
  };

  const closeDepositModal = () => {
    setShowDepositModal(false);
    setDepositError("");
    setDepositAmount("");
    setDepositLoading(false);
  };

  const refreshHistory = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("http://localhost:4000/api/wallet/history", {
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

    setDepositLoading(true);
    setDepositError("");
    const token = localStorage.getItem("token");

    try {
      const res = await fetch("http://localhost:4000/api/wallet/deposit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDepositError(data.message || "Erreur lors du dépôt.");
      } else {
        alert(data.message);
        setUser((prev) => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            balanceCents: data.new_balance_cents,
          };
          localStorage.setItem("user", JSON.stringify(updated));
          return updated;
        });
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

  // 💸 RETRAIT – page de retrait
  const handleWithdrawClick = () => {
    navigate("/withdraw");
  };

  // 👑 Aller à la page admin
  const handleAdminClick = () => {
    navigate("/admin/withdrawals");
  };

  // 🌍 langue
  const changeLanguage = (code) => {
    setLanguage(code);
    localStorage.setItem("language", code);
  };

  // 📸 upload avatar
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
      const res = await fetch("http://localhost:4000/api/profile/avatar", {
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
        // data.user contient l'utilisateur mis à jour (avatarUrl compris)
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

  // URL complète de l'avatar
  const avatarUrlFull =
    user.avatarUrl && user.avatarUrl.startsWith("http")
      ? user.avatarUrl
      : user.avatarUrl
      ? `http://localhost:4000${user.avatarUrl}`
      : null;

  // construire un mini flux d'événements pour l'historique
  const historyEvents = (() => {
    const depositEvents =
      history.deposits?.map((d) => ({
        type: "DEPOSIT",
        amountCents: d.amountCents,
        createdAt: d.createdAt,
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
    { id: "overview", label: "Vue d'ensemble" },
    { id: "history", label: "Historique dépôts/retraits" },
    { id: "profile", label: "Paramètres du profil" },
    { id: "bank", label: "Infos bancaires" },
    { id: "language", label: "Langue" },
    { id: "support", label: "Service client" },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* HEADER */}
      <header className="w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center text-sm font-bold">
              P
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">
                Windelevery!
              </div>
              <div className="text-[11px] text-slate-400">
                Panel des tâches rémunérées
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user.role === "admin" && (
              <button
                onClick={handleAdminClick}
                className="text-[11px] border border-indigo-500 px-3 py-1 rounded-lg hover:bg-indigo-600/20"
              >
                Admin
              </button>
            )}
            <div className="text-right text-xs">
              <div className="font-semibold">
                {user.fullName || "Utilisateur"}
              </div>
              <div className="text-slate-400">
                VIP {user.vipLevel || "FREE"}
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Solde : {(user.balanceCents || 0) / 100} MAD
            </span>
            <button
              className="text-[11px] border border-slate-600 px-3 py-1 rounded-lg hover:bg-slate-800"
              onClick={handleLogout}
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* CONTENU AVEC SIDEBAR */}
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col md:flex-row gap-4">
        {/* SIDEBAR */}
        <aside className="md:w-64 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
          {/* profil */}
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
            <div>
              <div className="text-sm font-semibold">
                {user.fullName || "Utilisateur"}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {user.email}
              </div>
            </div>
          </div>

          {/* solde et actions */}
          <div className="text-xs bg-slate-800/80 rounded-xl p-3 border border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Solde</span>
              <span className="font-semibold text-emerald-300">
                {(user.balanceCents || 0) / 100} MAD
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Statut</span>
              <span className="text-indigo-300">
                VIP {user.vipLevel || "FREE"}
              </span>
            </div>
            <div className="mt-2 flex gap-2">
              <button
                onClick={openDepositModal}
                className="flex-1 py-1.5 text-[11px] rounded-lg bg-emerald-600 hover:bg-emerald-700 font-semibold"
              >
                Dépôt
              </button>
              <button
                onClick={handleWithdrawClick}
                className="flex-1 py-1.5 text-[11px] rounded-lg bg-amber-500 hover:bg-amber-600 font-semibold"
              >
                Retrait
              </button>
            </div>
          </div>

          {/* navigation */}
          <nav className="pt-2 border-t border-slate-800">
            <p className="text-[11px] text-slate-500 mb-2 uppercase tracking-wide">
              Menu
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
          {/* SECTION VUE D'ENSEMBLE */}
          {activeSection === "overview" && (
            <>

              {/* TÂCHES */}
              <section className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold tracking-tight">
                    Tâches disponibles
                  </h2>
                  <button
                    className="text-[11px] px-3 py-1 rounded-full border border-slate-700 hover:bg-slate-800"
                    onClick={() => window.location.reload()}
                  >
                    Rafraîchir
                  </button>
                </div>

                {loadingTasks ? (
                  <p className="text-xs text-slate-400">
                    Chargement des tâches...
                  </p>
                ) : tasks.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    Aucune tâche disponible pour le moment.
                  </p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {tasks.map((task) => (
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
                              Level : {task.minVipLevel || "FREE"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mb-2">
                            {task.description}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Durée min :{" "}
                            <span className="font-medium">
                              {task.durationSeconds} s
                            </span>
                          </p>
                          <p className="text-[11px] text-emerald-300">
                            Gain :{" "}
                            <span className="font-semibold">
                              {task.rewardCents / 100} MAD
                            </span>
                          </p>
                          {task.videoUrl && (
                            <p className="text-[11px] text-slate-500 mt-1">
                              Vidéo YouTube liée à la tâche
                            </p>
                          )}
                        </div>
                        <button
                          className="mt-3 w-full rounded-lg py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] transition"
                          onClick={() => handleOpenTask(task)}
                        >
                          Commencer la tâche
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              {/* HISTORIQUE RÉCENT (mini) */}
              <section className="mb-10">
                <h2 className="text-sm font-semibold tracking-tight mb-3">
                  Historique récent
                </h2>
                <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
                  {historyLoading ? (
                    <p className="text-xs text-slate-400">
                      Chargement de l&apos;historique...
                    </p>
                  ) : historyEvents.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Aucun dépôt ni retrait pour le moment.
                    </p>
                  ) : (
                    <ul className="text-xs space-y-2 text-slate-300">
                      {historyEvents.map((evt, idx) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between border-b border-slate-700/60 pb-1 last:border-b-0 last:pb-0"
                        >
                          <span>
                            {evt.type === "DEPOSIT"
                              ? "💰 Dépôt"
                              : "💸 Retrait"}{" "}
                            {evt.type === "WITHDRAW" && evt.status
                              ? `(${evt.status})`
                              : ""}
                          </span>
                          <span
                            className={
                              evt.type === "DEPOSIT"
                                ? "text-emerald-300"
                                : "text-amber-300"
                            }
                          >
                            {evt.type === "DEPOSIT" ? "+" : "-"}
                            {evt.amountCents / 100} MAD
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </>
          )}

          {/* SECTION HISTORIQUE COMPLET */}
          {activeSection === "history" && (
            <section className="mb-10">
              <h2 className="text-sm font-semibold tracking-tight mb-3">
                Historique des dépôts et retraits
              </h2>
              {historyLoading ? (
                <p className="text-xs text-slate-400">
                  Chargement de l&apos;historique...
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
                    <h3 className="text-xs font-semibold mb-2">
                      Dépôts récents
                    </h3>
                    {history.deposits?.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        Aucun dépôt pour le moment.
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
                              <span className="text-emerald-300">
                                +{d.amountCents / 100} MAD
                              </span>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>

                  <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
                    <h3 className="text-xs font-semibold mb-2">
                      Retraits récents
                    </h3>
                    {history.withdrawals?.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        Aucun retrait pour le moment.
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
                                  Statut : {w.status}
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

          {/* SECTION PROFIL */}
          {activeSection === "profile" && (
            <section className="mb-10 bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
              <h2 className="text-sm font-semibold tracking-tight mb-3">
                Paramètres du profil
              </h2>
              <p className="text-[11px] text-slate-400 mb-4">
                (Formulaire côté front uniquement pour l&apos;instant. Tu
                pourras plus tard connecter ça à une route API pour mettre à
                jour le profil.)
              </p>

              {/* bloc avatar */}
              <div className="mb-4">
                <label className="block text-xs mb-1">Photo de profil</label>
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
                      JPG/PNG, taille max 2 Mo.
                    </p>
                    {avatarUploading && (
                      <p className="text-[11px] text-slate-300 mt-1">
                        Upload en cours...
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
                  <label className="block text-xs mb-1">Nom complet</label>
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
                  <label className="block text-xs mb-1">Email</label>
                  <input
                    type="email"
                    value={user.email || ""}
                    disabled
                    className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-sm text-slate-400"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    (Changement d&apos;email : à gérer côté support plus tard.)
                  </p>
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700"
                >
                  Enregistrer (dummy)
                </button>
              </form>
            </section>
          )}

          {/* SECTION INFOS BANCAIRES */}
          {activeSection === "bank" && (
            <section className="mb-10 bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
              <h2 className="text-sm font-semibold tracking-tight mb-3">
                Informations bancaires
              </h2>
              <p className="text-[11px] text-slate-400 mb-4">
                (Pour l&apos;instant ce formulaire est local. Tu pourras
                ensuite créer une table &quot;bank_accounts&quot; dans ta base
                et une API pour sauvegarder.)
              </p>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  alert(
                    "Ici tu peux plus tard envoyer ces infos à une route /api/bank-info."
                  );
                }}
              >
                <div>
                  <label className="block text-xs mb-1">Banque</label>
                  <input
                    type="text"
                    placeholder="Ex: CIH, BMCE..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs mb-1">RIB / IBAN</label>
                  <input
                    type="text"
                    placeholder="Ton RIB / IBAN"
                    className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs mb-1">Titulaire</label>
                  <input
                    type="text"
                    placeholder="Nom du titulaire du compte"
                    className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700"
                >
                  Enregistrer (dummy)
                </button>
              </form>
            </section>
          )}

          {/* SECTION LANGUE */}
          {activeSection === "language" && (
            <section className="mb-10 bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
              <h2 className="text-sm font-semibold tracking-tight mb-3">
                Langue de l&apos;interface
              </h2>
              <p className="text-[11px] text-slate-400 mb-4">
                (Ici on change juste une valeur stockée dans le navigateur.
                Plus tard tu pourras brancher un système i18n complet.)
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
                  🇫🇷 Français
                </button>
                <button
                  className={`px-3 py-2 rounded-lg text-xs border ${
                    language === "ar"
                      ? "bg-indigo-600 border-indigo-500"
                      : "border-slate-600 bg-slate-900"
                  }`}
                  onClick={() => changeLanguage("ar")}
                >
                  🇲🇦 العربية
                </button>
                <button
                  className={`px-3 py-2 rounded-lg text-xs border ${
                    language === "en"
                      ? "bg-indigo-600 border-indigo-500"
                      : "border-slate-600 bg-slate-900"
                  }`}
                  onClick={() => changeLanguage("en")}
                >
                  🇬🇧 English
                </button>
              </div>
              <p className="text-[11px] text-slate-300">
                Langue actuelle :{" "}
                <span className="font-semibold uppercase">{language}</span>
              </p>
            </section>
          )}

          {/* SECTION SERVICE CLIENT */}
          {activeSection === "support" && (
            <section className="mb-10 bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
              <h2 className="text-sm font-semibold tracking-tight mb-3">
                Centre de service / Support
              </h2>
              <p className="text-[11px] text-slate-400 mb-4">
                Tu peux utiliser ce formulaire pour que l&apos;utilisateur
                décrive un problème. Plus tard, tu pourras l&apos;envoyer à une
                API ou par email.
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
                  <label className="block text-xs mb-1">Sujet</label>
                  <input
                    type="text"
                    placeholder="Problème de retrait, dépôt, compte..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs mb-1">Message</label>
                  <textarea
                    rows={4}
                    placeholder="Décris ton problème ou ta question..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700"
                >
                  Envoyer au support (dummy)
                </button>
              </form>
            </section>
          )}
        </main>
      </div>

      {/* 🎥 MODAL VIDÉO */}
      {showPlayer && currentTask && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-20">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold">
                {currentTask.title} — regarder au moins{" "}
                {currentTask.durationSeconds} s
              </h3>
              <button
                className="text-xs text-slate-400 hover:text-slate-200"
                onClick={handleClosePlayer}
              >
                Fermer ✕
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
                Temps vu :{" "}
                <span className="font-semibold">
                  {Math.floor(watchedSeconds)} s
                </span>{" "}
                / {currentTask.durationSeconds} s
              </p>
              {!canContinue ? (
                <p className="text-amber-300">
                  Regarde au moins {currentTask.durationSeconds} secondes pour
                  activer le bouton.
                </p>
              ) : (
                <p className="text-emerald-300">
                  ✅ Tu peux maintenant continuer et valider la tâche.
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
              Continuer et valider la tâche
            </button>
          </div>
        </div>
      )}

      {/* 💰 MODAL DÉPÔT */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-30">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 w-full max-w-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold">Effectuer un dépôt</h3>
              <button
                className="text-xs text-slate-400 hover:text-slate-200"
                onClick={closeDepositModal}
              >
                Fermer ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-3">
              Montant minimum : <span className="font-semibold">80 MAD</span>
            </p>

            {depositError && (
              <div className="mb-3 text-xs rounded-lg bg-red-100 text-red-700 px-3 py-2">
                {depositError}
              </div>
            )}

            <div className="mb-3">
              <label className="block text-xs mb-1">Montant (MAD)</label>
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
              {depositLoading ? "Traitement..." : "Confirmer le dépôt"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
