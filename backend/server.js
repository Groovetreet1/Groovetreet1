const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const app = express();
const PORT = 4000;
const JWT_SECRET = "dev-secret-change-moi";

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

// Dossier pour les avatars
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// servir les fichiers uploads en statique
app.use("/uploads", express.static(uploadDir));

// Multer pour uploader des images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".png";
    cb(null, `avatar_user_${req.user.id}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Seules les images sont autorisées."), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 Mo
});

// "Base de données" en mémoire
let users = [];
let nextUserId = 1;

// Codes d'invitation valides
let inviteCodes = ["ab96e08m"];

// Tâches avec vidéos YouTube
let tasks = [
  {
    id: 1,
    title: "Regarder vidéo promo 1",
    description: "Regarde la vidéo pendant au moins 15 secondes.",
    rewardCents: 200,
    durationSeconds: 15,
    minVipLevel: "FREE",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  },
  {
    id: 2,
    title: "Regarder vidéo promo 2",
    description: "Regarde la vidéo pendant au moins 15 secondes.",
    rewardCents: 500,
    durationSeconds: 15,
    minVipLevel: "FREE",
    videoUrl: "https://www.youtube.com/watch?v=ysz5S6PUM-U",
  },
];

// Historique dépôts / retraits
let deposits = [];
let nextDepositId = 1;

let withdrawals = [];
let nextWithdrawalId = 1;

// Créer un admin par défaut
const adminPasswordHash = bcrypt.hashSync("admin123", 10);
const adminUser = {
  id: nextUserId++,
  fullName: "Admin",
  email: "admin@promo.local",
  passwordHash: adminPasswordHash,
  vipLevel: "FREE",
  balanceCents: 0,
  inviteCodeUsed: null,
  role: "admin",
  avatarUrl: null,
};
users.push(adminUser);

// Middleware d'authentification
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token manquant" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = users.find((u) => u.id === decoded.userId);
    if (!user) {
      return res.status(401).json({ message: "Utilisateur introuvable" });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalide" });
  }
}

// Middleware admin
function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "Accès réservé à l'administrateur." });
  }
  next();
}

// Route simple
app.get("/", (req, res) => {
  res.send("API PromoApp en marche");
});

// REGISTER avec code d'invitation
app.post("/api/auth/register", async (req, res) => {
  try {
    const { fullName, email, password, inviteCode } = req.body;

    if (!fullName || !email || !password || !inviteCode) {
      return res.status(400).json({
        message:
          "Tous les champs sont obligatoires (y compris le code d'invitation).",
      });
    }

    const normalizedCode = String(inviteCode).trim().toLowerCase();
    const validCodesLower = inviteCodes.map((c) => c.toLowerCase());

    if (!validCodesLower.includes(normalizedCode)) {
      return res.status(400).json({ message: "Code d'invitation invalide." });
    }

    const existing = users.find((u) => u.email === email);
    if (existing) {
      return res.status(409).json({ message: "Email déjà utilisé" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = {
      id: nextUserId++,
      fullName,
      email,
      passwordHash,
      vipLevel: "FREE",
      balanceCents: 0,
      inviteCodeUsed: normalizedCode,
      role: "user",
      avatarUrl: null,
    };

    users.push(user);

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    const { passwordHash: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// LOGIN
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = users.find((u) => u.email === email);
    if (!user) {
      return res.status(401).json({ message: "Identifiants invalides" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Identifiants invalides" });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    const { passwordHash: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Liste des tâches
app.get("/api/tasks", authMiddleware, (req, res) => {
  res.json(tasks);
});

// Compléter une tâche
app.post("/api/tasks/:taskId/complete", authMiddleware, (req, res) => {
  const taskId = parseInt(req.params.taskId, 10);
  const task = tasks.find((t) => t.id === taskId);

  if (!task) {
    return res.status(404).json({ message: "Tâche introuvable" });
  }

  req.user.balanceCents += task.rewardCents;

  res.json({
    message: "Tâche complétée",
    reward_cents: task.rewardCents,
    new_balance_cents: req.user.balanceCents,
  });
});

// 💰 DÉPÔT : montant > 80 MAD + historique
app.post("/api/wallet/deposit", authMiddleware, (req, res) => {
  const { amount } = req.body; // en MAD

  const numAmount = Number(amount);
  if (Number.isNaN(numAmount)) {
    return res.status(400).json({ message: "Montant invalide." });
  }

  if (numAmount < 80) {
    return res.status(400).json({
      message: "Le montant minimum de dépôt est de 80 MAD.",
    });
  }

  const amountCents = Math.round(numAmount * 100);

  req.user.balanceCents += amountCents;

  const deposit = {
    id: nextDepositId++,
    userId: req.user.id,
    amountCents,
    createdAt: new Date().toISOString(),
  };
  deposits.push(deposit);

  return res.json({
    message: `Dépôt de ${numAmount} MAD effectué.`,
    new_balance_cents: req.user.balanceCents,
  });
});

// 💸 RETRAIT : montants fixes 100 / 150 / 500 / 1000 + historique
app.post("/api/wallet/withdraw", authMiddleware, (req, res) => {
  const { amount } = req.body;
  const numAmount = Number(amount);
  const allowed = [100, 150, 500, 1000];

  if (!allowed.includes(numAmount)) {
    return res.status(400).json({
      message: "Montant de retrait invalide.",
    });
  }

  const amountCents = Math.round(numAmount * 100);

  if (req.user.balanceCents < amountCents) {
    return res.status(400).json({
      message: "Solde insuffisant pour ce retrait.",
    });
  }

  // on débite directement
  req.user.balanceCents -= amountCents;

  const withdrawal = {
    id: nextWithdrawalId++,
    userId: req.user.id,
    amountCents,
    status: "PENDING",
    createdAt: new Date().toISOString(),
    processedAt: null,
  };
  withdrawals.push(withdrawal);

  return res.json({
    message: `Demande de retrait de ${numAmount} MAD créée (statut: PENDING).`,
    withdrawalId: withdrawal.id,
    new_balance_cents: req.user.balanceCents,
  });
});

// 📜 HISTORIQUE pour l'utilisateur
app.get("/api/wallet/history", authMiddleware, (req, res) => {
  const userDeposits = deposits.filter((d) => d.userId === req.user.id);
  const userWithdrawals = withdrawals.filter((w) => w.userId === req.user.id);

  res.json({
    deposits: userDeposits,
    withdrawals: userWithdrawals,
  });
});

// 📸 UPLOAD AVATAR
app.post(
  "/api/profile/avatar",
  authMiddleware,
  upload.single("avatar"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Fichier manquant." });
    }

    // URL relative : /uploads/...
    const relativeUrl = `/uploads/${req.file.filename}`;
    req.user.avatarUrl = relativeUrl;

    const { passwordHash: _, ...safeUser } = req.user;

    res.json({
      message: "Avatar mis à jour.",
      user: safeUser,
    });
  }
);

// 👑 ADMIN : liste des retraits (par statut)
app.get(
  "/api/admin/withdrawals",
  authMiddleware,
  adminMiddleware,
  (req, res) => {
    const status = req.query.status || "PENDING";
    const list = withdrawals.filter((w) => w.status === status);
    res.json(list);
  }
);

// 👑 ADMIN : approuver un retrait
app.post(
  "/api/admin/withdrawals/:id/approve",
  authMiddleware,
  adminMiddleware,
  (req, res) => {
    const id = parseInt(req.params.id, 10);
    const withdrawal = withdrawals.find((w) => w.id === id);
    if (!withdrawal) {
      return res.status(404).json({ message: "Retrait introuvable" });
    }
    if (withdrawal.status !== "PENDING") {
      return res
        .status(400)
        .json({ message: "Ce retrait n'est plus en attente." });
    }

    withdrawal.status = "APPROVED";
    withdrawal.processedAt = new Date().toISOString();

    res.json({
      message: "Retrait approuvé.",
      withdrawal,
    });
  }
);

// 👑 ADMIN : rejeter un retrait
app.post(
  "/api/admin/withdrawals/:id/reject",
  authMiddleware,
  adminMiddleware,
  (req, res) => {
    const id = parseInt(req.params.id, 10);
    const withdrawal = withdrawals.find((w) => w.id === id);
    if (!withdrawal) {
      return res.status(404).json({ message: "Retrait introuvable" });
    }
    if (withdrawal.status !== "PENDING") {
      return res
        .status(400)
        .json({ message: "Ce retrait n'est plus en attente." });
    }

    // re-créditer le solde de l'utilisateur
    const user = users.find((u) => u.id === withdrawal.userId);
    if (user) {
      user.balanceCents += withdrawal.amountCents;
    }

    withdrawal.status = "REJECTED";
    withdrawal.processedAt = new Date().toISOString();

    res.json({
      message: "Retrait rejeté et montant re-crédité.",
      withdrawal,
    });
  }
);

// Lancer le serveur
app.listen(PORT, () => {
  console.log(`API en écoute sur http://localhost:${PORT}`);
  console.log("Admin:", "admin@promo.local / admin123");
});
