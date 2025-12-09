const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
require("dotenv").config();
const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// Simple in-memory SSE clients list: { userId, res }
const sseClients = [];

function sendSseToUser(userId, payload) {
  try {
    const data = JSON.stringify(payload);
    sseClients.forEach((c) => {
      if (c.userId === userId) {
        try {
          c.res.write(`data: ${data}\n\n`);
        } catch (e) {
          // ignore write errors; cleanup happens on close
        }
      }
    });
  } catch (e) {
    console.error('Error sending SSE to user', e);
  }
}

const corsOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);
app.use(express.json());

// Dossier pour les avatars
const uploadDir = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, "uploads");
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

// Multer for deposit proof uploads (separate filenames)
const depositStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".png";
    const userId = req.user?.id || "anon";
    cb(null, `deposit_${userId}_${Date.now()}${ext}`);
  },
});

const depositUpload = multer({
  storage: depositStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo max
});

// Tasks will be read from the database `tasks` table when requested.
// Invitation code and admin user are handled via DB migrations/setup instead of
// keeping an in-memory store here. Authentication middleware is defined later
// (DB-backed) to avoid duplicates.

// Fallback sample tasks (used only if DB has no active tasks or migrations not run)
const DEFAULT_TASKS = [
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
    videoUrl: "https://www.youtube.com/watch?v=sOCKUCvEHWM",
  },
];

// Helpers parrainage / codes d'invitation
const INVITE_CODE_LENGTH = 8;

function randomInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

async function generateUniqueInviteCode() {
  while (true) {
    const candidate = randomInviteCode();
    const [rows] = await pool.execute("SELECT id FROM users WHERE invite_code = ? LIMIT 1", [candidate]);
    if (!rows || rows.length === 0) return candidate;
  }
}

async function ensureInviteCode(userId, existingCode) {
  if (existingCode && existingCode.trim().length > 0) return existingCode;
  const code = await generateUniqueInviteCode();
  await pool.execute("UPDATE users SET invite_code = ? WHERE id = ?", [code, userId]);
  return code;
}

async function ensureReferralTables() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS referrals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      inviter_user_id INT NOT NULL,
      invited_user_id INT NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (inviter_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (invited_user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS referral_bonuses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      deposit_id INT NOT NULL UNIQUE,
      inviter_user_id INT NOT NULL,
      invited_user_id INT NOT NULL,
      bonus_cents INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (deposit_id) REFERENCES deposits(id) ON DELETE CASCADE,
      FOREIGN KEY (inviter_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (invited_user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

// ⚡ Upgrade VIP : coûte 80 MAD
app.post("/api/user/upgrade-vip", authMiddleware, async (req, res) => {
  try {
    const VIP_COST_CENTS = 80 * 100;
    const userId = req.user.id;

    // On récupère l'utilisateur à jour
    const [rows] = await pool.execute(
      "SELECT vip_level, balance_cents FROM users WHERE id = ?",
      [userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    const row = rows[0];

    if (row.vip_level === "VIP") {
      return res.status(400).json({ message: "Tu es déjà VIP." });
    }

    if (row.balance_cents < VIP_COST_CENTS) {
      return res.status(400).json({
        message:
          "Solde insuffisant pour devenir VIP. Il faut au moins 80 MAD.",
      });
    }

    const newBalance = row.balance_cents - VIP_COST_CENTS;

    // 1) Mettre à jour user : solde -80 MAD + VIP
    await pool.execute(
      "UPDATE users SET balance_cents = ?, vip_level = 'VIP' WHERE id = ?",
      [newBalance, userId]
    );

    // 2) Enregistrer dans withdrawals comme VIP_UPGRADE (APPROVED direct)
    await pool.execute(
      "INSERT INTO withdrawals (user_id, amount_cents, status, type) VALUES (?, ?, 'APPROVED', 'VIP_UPGRADE')",
      [userId, VIP_COST_CENTS]
    );

    return res.json({
      message: "Félicitations, tu es maintenant VIP !",
      new_balance_cents: newBalance,
      vipLevel: "VIP",
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Erreur serveur lors du passage en VIP." });
  }
});


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

// REGISTER avec code d'invitation (parrainage)
app.post("/api/auth/register", async (req, res) => {
  try {
    const { fullName, email, password, invitationCode, inviteCode } = req.body;

    if (!fullName || !email || !password) {
      return res
        .status(400)
        .json({ message: "Nom, email et mot de passe sont obligatoires." });
    }

    // Code d'invitation (optionnel mais validé s'il est présent)
    const providedCode = (invitationCode || inviteCode || "").trim();
    let inviterUserId = null;
    if (providedCode) {
      await ensureReferralTables();
      const [inviterRows] = await pool.execute(
        "SELECT id FROM users WHERE LOWER(invite_code) = LOWER(?) LIMIT 1",
        [providedCode.toLowerCase()]
      );
      if (!inviterRows || inviterRows.length === 0) {
        return res.status(400).json({ message: "Code d'invitation invalide." });
      }
      inviterUserId = inviterRows[0].id;
    }

    // 1) Vérifier si l'email existe déjà
    const [existing] = await pool.execute(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email]
    );
    if (existing.length > 0) {
      return res
        .status(400)
        .json({ message: "Un compte existe déjà avec cet email." });
    }

    // 2) Hacher le mot de passe
    const passwordHash = await bcrypt.hash(password, 10);

    // 3) Savoir si c'est le premier user => admin
    const [countRows] = await pool.execute(
      "SELECT COUNT(*) AS cnt FROM users"
    );
    const isFirstUser = countRows[0].cnt === 0;
    const role = isFirstUser ? "admin" : "user";

    const newInviteCode = await generateUniqueInviteCode();

    // 4) Insérer dans MySQL
    const [result] = await pool.execute(
      "INSERT INTO users (full_name, email, password_hash, vip_level, role, balance_cents, invite_code, invited_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [fullName, email, passwordHash, "FREE", role, 0, newInviteCode, inviterUserId]
    );

    const userId = result.insertId;

    // 4bis) Lier le parrainage
    if (inviterUserId) {
      await pool.execute(
        "INSERT IGNORE INTO referrals (inviter_user_id, invited_user_id) VALUES (?, ?)",
        [inviterUserId, userId]
      );
    }

    // 5) Générer le token
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "6h" });

    // 6) Retourner les infos (sans password)
    const user = {
      id: userId,
      fullName,
      email,
      vipLevel: "FREE",
      role,
      balanceCents: 0,
      inviteCode: newInviteCode,
      invitedByUserId: inviterUserId,
    };

    return res.json({ user, token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// LOGIN
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email et mot de passe obligatoires." });
    }

    // 1) Chercher l'utilisateur en base
    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (rows.length === 0) {
      return res
        .status(400)
        .json({ message: "Email ou mot de passe incorrect." });
    }

    const userRow = rows[0];

    // 2) Vérifier le mot de passe
    const ok = await bcrypt.compare(password, userRow.password_hash);
    if (!ok) {
      return res
        .status(400)
        .json({ message: "Email ou mot de passe incorrect." });
    }

    const inviteCode = await ensureInviteCode(userRow.id, userRow.invite_code);

    // 3) Générer un token
    const token = jwt.sign({ userId: userRow.id }, JWT_SECRET, {
      expiresIn: "6h",
    });

    // 4) Construire l'objet user envoyé au front
    const user = {
      id: userRow.id,
      fullName: userRow.full_name,
      email: userRow.email,
      vipLevel: userRow.vip_level,
      role: userRow.role,
      balanceCents: userRow.balance_cents,
      inviteCode,
      invitedByUserId: userRow.invited_by_user_id || null,
    };

    return res.json({ user, token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// Token valide = on récupère l'utilisateur en base
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token manquant" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    // On récupère l'utilisateur en base
    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE id = ? LIMIT 1",
      [userId]
    );
    if (rows.length === 0) {
      return res
        .status(401)
        .json({ message: "Utilisateur introuvable." });
    }

    const row = rows[0];
    const inviteCode = await ensureInviteCode(row.id, row.invite_code);
    req.user = {
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      vipLevel: row.vip_level,
      role: row.role,
      balanceCents: row.balance_cents,
      inviteCode,
      invitedByUserId: row.invited_by_user_id || null,
      // si tu as bankInfo plus tard tu peux le rajouter ici
    };

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Session expirée, merci de vous reconnecter." });
    }
    console.error(err);
    return res.status(401).json({ message: "Token invalide" });
  }
}

// Retourne les infos utilisateur à jour (balance incluse)
app.get('/api/user/me', authMiddleware, async (req, res) => {
  try {
    // authMiddleware already fetched the fresh user row and placed it on req.user
    const safeUser = {
      id: req.user.id,
      fullName: req.user.fullName || req.user.full_name,
      email: req.user.email,
      vipLevel: req.user.vipLevel || req.user.vip_level,
      role: req.user.role,
      balanceCents: typeof req.user.balanceCents !== 'undefined' ? req.user.balanceCents : req.user.balance_cents,
      inviteCode: req.user.inviteCode,
      invitedByUserId: req.user.invitedByUserId || null,
    };
    return res.json({ user: safeUser });
  } catch (err) {
    console.error('Error in GET /api/user/me:', err);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Parrainage : stats et code d'invitation de l'utilisateur
app.get('/api/user/referrals', authMiddleware, async (req, res) => {
  try {
    await ensureReferralTables();
    const userId = req.user.id;

    const [codeRows] = await pool.execute("SELECT invite_code FROM users WHERE id = ? LIMIT 1", [userId]);
    const inviteCode = await ensureInviteCode(userId, codeRows && codeRows[0] ? codeRows[0].invite_code : null);

    const [countRows] = await pool.execute("SELECT COUNT(*) AS cnt FROM referrals WHERE inviter_user_id = ?", [userId]);
    const invitedCount = (countRows && countRows[0] && countRows[0].cnt) || 0;

    const [bonusRows] = await pool.execute("SELECT COALESCE(SUM(bonus_cents), 0) AS totalBonusCents FROM referral_bonuses WHERE inviter_user_id = ?", [userId]);
    const totalBonusCents = (bonusRows && bonusRows[0] && bonusRows[0].totalBonusCents) || 0;

    const [invitedRows] = await pool.execute(
      `SELECT
         r.invited_user_id AS userId,
         u.full_name AS fullName,
         u.email AS email,
         r.created_at AS createdAt
       FROM referrals r
       JOIN users u ON u.id = r.invited_user_id
       WHERE r.inviter_user_id = ?
       ORDER BY r.created_at DESC`,
      [userId]
    );

    return res.json({
      inviteCode,
      invitedCount,
      totalBonusCents,
      invited: invitedRows || [],
    });
  } catch (err) {
    console.error('Error in GET /api/user/referrals:', err);
    return res.status(500).json({ message: 'Erreur serveur (parrainage).' });
  }
});

// SSE subscribe endpoint: clients connect with ?token=JWT
app.get('/api/subscribe', async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) return res.status(401).end('token missing');

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(401).end('invalid token');
    }

    const userId = decoded.userId;
    // verify user exists
    const [rows] = await pool.execute('SELECT id FROM users WHERE id = ? LIMIT 1', [userId]);
    if (!rows || rows.length === 0) return res.status(401).end('user not found');

    // setup SSE headers
    // SSE headers + CORS explicite
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    // Autoriser toutes les origines (pas de cookies ici, token dans la query)
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || corsOrigins[0] || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.flushHeaders && res.flushHeaders();
    // ping initial pour valider la connexion côté client
    res.write(`data: {"type":"connected"}\n\n`);

    // send a comment to keep connection alive
    res.write(': connected\n\n');

    const client = { userId, res };
    sseClients.push(client);

    req.on('close', () => {
      // remove client
      const idx = sseClients.indexOf(client);
      if (idx !== -1) sseClients.splice(idx, 1);
    });
  } catch (err) {
    console.error('Error in /api/subscribe:', err);
    return res.status(500).end();
  }
});

// Liste des tâches (depuis la base)
app.get("/api/tasks", authMiddleware, async (req, res) => {
  try {
    // Compute the start of the current day in GMT+1 timezone.
    // We want tasks to "renew" at 00:00 GMT+1 every day —
    // therefore we exclude tasks that the user completed after that moment.
    const userId = req.user && req.user.id;

    // Determine if 3-day free trial is over (based on user created_at)
    let isTrialExpired = false;
    try {
      const [uRows] = await pool.execute(
        "SELECT created_at, vip_level FROM users WHERE id = ? LIMIT 1",
        [userId]
      );
      if (uRows && uRows[0]) {
        const createdAt = new Date(uRows[0].created_at);
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
        if (
          uRows[0].vip_level === "FREE" &&
          Date.now() - createdAt.getTime() >= threeDaysMs
        ) {
          isTrialExpired = true;
        }
      }
    } catch (e) {
      console.error("Could not check trial expiration:", e);
    }
    // Take current server time, shift by +1h, take that date's midnight in UTC,
    // then shift back by -1h to get the UTC timestamp corresponding to 00:00 in GMT+1.
    const now = new Date();
    const nowPlus1 = new Date(now.getTime() + 1 * 60 * 60 * 1000);
    const startUtcForGmtPlus1 = Date.UTC(
      nowPlus1.getUTCFullYear(),
      nowPlus1.getUTCMonth(),
      nowPlus1.getUTCDate(),
      0,
      0,
      0
    ) - 1 * 60 * 60 * 1000;

    const startDate = new Date(startUtcForGmtPlus1);

    // Select active tasks that the user has NOT completed since startDate.
    const [rows] = await pool.execute(
      `SELECT
         t.id,
         t.title,
         t.description,
         t.reward_cents AS rewardCents,
         t.duration_seconds AS durationSeconds,
         t.min_vip_level AS minVipLevel,
         t.video_url AS videoUrl
       FROM tasks t
       WHERE t.is_active = 1
         ${isTrialExpired ? "AND t.min_vip_level <> 'FREE'" : ""}
         AND NOT EXISTS (
           SELECT 1 FROM task_completions tc
           WHERE tc.task_id = t.id
             AND tc.user_id = ?
             AND tc.created_at >= ?
         )
       ORDER BY t.id`,
      [userId, startDate]
    );

    if (!rows || rows.length === 0) {
      // If trial expired, do not show fallback tasks
      if (isTrialExpired) {
        return res.json([]);
      }
      // If DB has no active tasks (or all were completed today), return fallback tasks
      console.warn('No available tasks for user or DB empty — returning default tasks fallback');
      return res.json(DEFAULT_TASKS);
    }

    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur lors de la récupération des tâches." });
  }
});

// 💰 DÉPÔT : montant > 80 MAD + historique
app.post("/api/wallet/deposit", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, full_name } = req.body;

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return res
        .status(400)
        .json({ message: "Montant de dépôt invalide." });
    }

    // ex : minimum 80 MAD
    const MIN_DEPOSIT_MAD = 80;
    if (amount < MIN_DEPOSIT_MAD) {
      return res.status(400).json({
        message: `Le dépôt minimum est de ${MIN_DEPOSIT_MAD} MAD.`,
      });
    }

    const amountCents = Math.round(amount * 100);

    // 1) Insérer dans la table deposits en PENDING — l'admin doit confirmer
    // Use provided full_name (payer name) if present, otherwise fallback to the user's full name
    const depositorName = (typeof full_name === 'string' && full_name.trim().length > 0) ? full_name.trim() : (req.user.fullName || null);

    const [result] = await pool.execute(
      "INSERT INTO deposits (user_id, amount_cents, status, full_name) VALUES (?, ?, 'PENDING', ?)",
      [userId, amountCents, depositorName]
    );
    const depositId = result.insertId;

    // 2) Renvoyer le dépôt en attente (pas de crédit automatique)
    const [depRows] = await pool.execute(
      "SELECT id, amount_cents AS amountCents, full_name AS depositorFullName, status, created_at AS createdAt FROM deposits WHERE id = ?",
      [depositId]
    );
    const deposit = depRows[0];

    return res.json({
      message: "Dépôt enregistré et en attente de validation par l'administrateur.",
      deposit,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur lors du dépôt." });
  }
});


// 💸 RETRAIT : montants fixes 100 / 150 / 500 / 1000 + historique
app.post("/api/wallet/withdraw", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    if (!amount || typeof amount !== "number") {
      return res
        .status(400)
        .json({ message: "Montant invalide." });
    }

    const allowedAmounts = [20, 50, 100, 1000];
    if (!allowedAmounts.includes(amount)) {
      return res
        .status(400)
        .json({ message: "Montant de retrait non autorisé." });
    }

    const amountCents = Math.round(amount * 100);

    // Limiter à un retrait par jour
    const [todayCountRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt
         FROM withdrawals
        WHERE user_id = ?
          AND type = 'WITHDRAW'
          AND DATE(created_at) = CURDATE()`,
      [userId]
    );
    const todayCount = (todayCountRows && todayCountRows[0] && todayCountRows[0].cnt) || 0;
    if (todayCount >= 1) {
      return res.status(400).json({
        message: "Désolé, vous avez déjà effectué un retrait aujourd'hui. Merci de réessayer demain.",
      });
    }

    // On récupère le solde actuel
    const [userRows] = await pool.execute(
      "SELECT balance_cents FROM users WHERE id = ?",
      [userId]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }
    const balanceCents = userRows[0].balance_cents;

    if (balanceCents < amountCents) {
      return res
        .status(400)
        .json({ message: "Solde insuffisant pour ce retrait." });
    }

    // 1) Débiter le solde immédiatement
    await pool.execute(
      "UPDATE users SET balance_cents = balance_cents - ? WHERE id = ?",
      [amountCents, userId]
    );

    // 2) Créer une demande de retrait PENDING
    const [result] = await pool.execute(
      "INSERT INTO withdrawals (user_id, amount_cents, status, type) VALUES (?, ?, 'PENDING', 'WITHDRAW')",
      [userId, amountCents]
    );
    const withdrawalId = result.insertId;

    // 3) Nouveau solde
    const newBalanceCents = balanceCents - amountCents;

    return res.json({
      message: "Demande de retrait créée.",
      new_balance_cents: newBalanceCents,
      withdrawal: {
        id: withdrawalId,
        amountCents,
        status: "PENDING",
        type: "WITHDRAW",
      },
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Erreur serveur lors du retrait." });
  }
});


// 📜 HISTORIQUE pour l'utilisateur
app.get("/api/wallet/history", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Derniers dépôts de l'utilisateur
    const [depRows] = await pool.execute(
      `SELECT
         id,
         amount_cents AS amountCents,
         full_name AS depositorFullName,
         status,
         created_at AS createdAt
       FROM deposits
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    // Derniers retraits de l'utilisateur
    const [withRows] = await pool.execute(
      `SELECT
         id,
         amount_cents AS amountCents,
         status,
         created_at AS createdAt
       FROM withdrawals
       WHERE user_id = ?
         AND type = 'WITHDRAW'      -- on ne prend que les vrais retraits
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    return res.json({
      deposits: depRows,
      withdrawals: withRows,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Erreur serveur lors de la récupération de l'historique." });
  }
});

// Get current user's bank info (if any)
app.get("/api/user/bank", authMiddleware, async (req, res) => {
  try {
    // Ensure the bank_accounts table exists (create on the fly if migrations weren't run)
    // Create bank_accounts without FK to avoid FK mismatch errors (errno 150)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS bank_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        bank_name VARCHAR(255),
        iban VARCHAR(255),
        holder_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const userId = req.user.id;
    const [rows] = await pool.execute(
      `SELECT id, bank_name AS bankName, iban, holder_name AS holderName, created_at AS createdAt
       FROM bank_accounts WHERE user_id = ? LIMIT 1`,
      [userId]
    );
    if (!rows || rows.length === 0) return res.json({});
    return res.json(rows[0]);
  } catch (err) {
    console.error('Error in GET /api/user/bank:', err && err.stack ? err.stack : err);
    return res.status(500).json({ message: 'Erreur serveur lors de la récupération des informations bancaires.', error: err && err.message ? err.message : String(err) });
  }
});

// Save bank info for current user — only allowed once (locked after save)
app.post("/api/user/bank", authMiddleware, async (req, res) => {
  try {
    // Ensure the bank_accounts table exists (create on the fly if migrations weren't run)
    // Create bank_accounts without FK to avoid FK mismatch errors (errno 150)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS bank_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        bank_name VARCHAR(255),
        iban VARCHAR(255),
        holder_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const userId = req.user.id;
    const { bank_name, iban, holder_name } = req.body;

    if (!bank_name || !iban || !holder_name) {
      return res.status(400).json({ message: 'bank_name, iban et holder_name sont obligatoires.' });
    }

    // Check if already exists
    const [existRows] = await pool.execute(
      'SELECT id FROM bank_accounts WHERE user_id = ? LIMIT 1',
      [userId]
    );
    if (existRows.length > 0) {
      return res.status(400).json({ message: 'Informations bancaires déjà enregistrées et verrouillées.' });
    }

    // Insert new bank info
    const [result] = await pool.execute(
      'INSERT INTO bank_accounts (user_id, bank_name, iban, holder_name) VALUES (?, ?, ?, ?)',
      [userId, bank_name, iban, holder_name]
    );

    const insertId = result.insertId;
    const [rows] = await pool.execute(
      'SELECT id, bank_name AS bankName, iban, holder_name AS holderName, created_at AS createdAt FROM bank_accounts WHERE id = ? LIMIT 1',
      [insertId]
    );

    return res.json({ message: 'Informations bancaires enregistrées.', bank: rows[0] });
  } catch (err) {
    console.error('Error in POST /api/user/bank:', err && err.stack ? err.stack : err);
    return res.status(500).json({ message: "Erreur serveur lors de l'enregistrement des informations bancaires.", error: err && err.message ? err.message : String(err) });
  }
});

// Valider une tâche vidéo et créditer l'utilisateur
app.post("/api/tasks/complete", authMiddleware, async (req, res) => {
  const { taskId } = req.body;
});
app.post(
  "/api/tasks/:taskId/complete",
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const taskId = parseInt(req.params.taskId, 10);

      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Tâche invalide." });
      }

      // 1) Récupérer la tâche (pour connaître le reward)
      const [taskRows] = await pool.execute(
        "SELECT id, reward_cents, title, video_url, min_vip_level FROM tasks WHERE id = ? AND is_active = 1",
        [taskId]
      );
      if (taskRows.length === 0) {
        return res.status(404).json({ message: "Tâche introuvable ou inactive." });
      }
      const task = taskRows[0];
      const rewardCents = task.reward_cents;

      // Bloquer uniquement les tâches non gratuites pour les comptes FREE.
      const vipLevel = (req.user.vipLevel || req.user.vip_level || "FREE").toUpperCase();
      const minVip = (task.min_vip_level || "FREE").toUpperCase();
      const isFreeTask = minVip.includes("FREE");
      if (!isFreeTask && vipLevel === "FREE") {
        return res.status(403).json({
          message: "Désolé, cette tâche est réservée aux VIP. Passe en VIP pour la valider.",
        });
      }

      // 2) Vérifier si l'utilisateur a déjà complété cette tâche
      const [already] = await pool.execute(
        "SELECT id FROM task_completions WHERE user_id = ? AND task_id = ? LIMIT 1",
        [userId, taskId]
      );
      if (already.length > 0) {
        return res.status(400).json({ message: "Tâche déjà complétée par cet utilisateur." });
      }

      // 3) Faire l'opération en transaction pour éviter les crédits doublés
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        // Récupérer le solde actuel à l'intérieur de la transaction
        const [userRows] = await conn.execute(
          "SELECT balance_cents FROM users WHERE id = ? FOR UPDATE",
          [userId]
        );
        if (userRows.length === 0) {
          await conn.rollback();
          return res.status(404).json({ message: "Utilisateur introuvable." });
        }
        const balanceBefore = userRows[0].balance_cents;
        const balanceAfter = balanceBefore + rewardCents;

        // Mettre à jour le solde
        await conn.execute(
          "UPDATE users SET balance_cents = ? WHERE id = ?",
          [balanceAfter, userId]
        );

        // Enregistrer la complétion de tâche
        await conn.execute(
          `INSERT INTO task_completions
            (user_id, task_id, reward_cents, balance_before_cents, balance_after_cents)
           VALUES (?, ?, ?, ?, ?)`,
          [userId, taskId, rewardCents, balanceBefore, balanceAfter]
        );

        await conn.commit();

        // Réponse au frontend
        return res.json({
          message: "Tâche complétée, récompense ajoutée.",
          reward_cents: rewardCents,
          new_balance_cents: balanceAfter,
        });
      } catch (e) {
        await conn.rollback().catch(() => {});
        // Si doublon (contrainte unique) — renvoyer message clair
        if (e && (e.code === 'ER_DUP_ENTRY' || e.errno === 1062)) {
          return res.status(400).json({ message: "Tâche déjà complétée par cet utilisateur." });
        }
        console.error('Error in /api/tasks/:taskId/complete transaction:', e);
        return res.status(500).json({ message: "Erreur serveur lors de la complétion de la tâche." });
      } finally {
        conn.release();
      }
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ message: "Erreur serveur lors de la complétion de la tâche." });
    }
  }
);
// Note: `/api/tasks/:taskId/complete` is implemented above (DB-backed).
app.get("/api/tasks/history", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.execute(
      `SELECT
        tc.id,
        tc.reward_cents     AS rewardCents,
        tc.balance_before_cents AS balanceBeforeCents,
        tc.balance_after_cents  AS balanceAfterCents,
        tc.created_at       AS createdAt,
        t.title,
        t.video_url         AS videoUrl
       FROM task_completions tc
       JOIN tasks t ON tc.task_id = t.id
       WHERE tc.user_id = ?
       ORDER BY tc.created_at DESC`,
      [userId]
    );

    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Erreur serveur lors de la récupération de l'historique des tâches." });
  }
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

app.get(
  "/api/admin/withdrawals",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const [rows] = await pool.execute(
        `SELECT
          w.id,
          w.user_id AS userId,
          w.amount_cents AS amountCents,
          w.status,
          w.type,
          w.created_at AS createdAt,
          u.email AS userEmail,
          u.full_name AS fullName,
          u.vip_level AS vipLevel,
          u.balance_cents AS balanceCents,
          b.bank_name AS bankName,
          b.iban AS iban,
          b.holder_name AS holderName
         FROM withdrawals w
         JOIN users u ON w.user_id = u.id
         LEFT JOIN bank_accounts b ON b.user_id = u.id
         ORDER BY w.created_at DESC`
      );

      return res.json(rows);
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ message: "Erreur serveur côté admin retraits." });
    }
  }
);

// 👑 ADMIN : créer une nouvelle tâche vidéo (manuellement)
app.post(
  "/api/admin/tasks",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { title, video_url, reward_cents, description, duration_seconds, min_vip_level } = req.body;

      if (!title || !video_url || typeof reward_cents === 'undefined') {
        return res.status(400).json({ message: 'title, video_url et reward_cents sont obligatoires.' });
      }

      const rewardCents = parseInt(reward_cents, 10);
      const durationSeconds = duration_seconds ? parseInt(duration_seconds, 10) : 15;
      const minVip = min_vip_level || 0;

      const [result] = await pool.execute(
        `INSERT INTO tasks (title, description, reward_cents, duration_seconds, min_vip_level, video_url, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [title, description || null, rewardCents, durationSeconds, minVip, video_url]
      );

      const insertId = result.insertId;
      const [rows] = await pool.execute(
        `SELECT id, title, description, reward_cents AS rewardCents, duration_seconds AS durationSeconds, min_vip_level AS minVipLevel, video_url AS videoUrl, is_active AS isActive
         FROM tasks WHERE id = ? LIMIT 1`,
        [insertId]
      );

      return res.json({ message: 'Tâche créée', task: rows[0] });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erreur serveur lors de la création de la tâche.' });
    }
  }
);
// 👑 ADMIN : approuver un retrait
app.post(
  "/api/admin/withdrawals/:id/approve",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "ID invalide." });
      }

      // On récupère le retrait en BDD
      const [rows] = await pool.execute(
        "SELECT id, user_id, amount_cents, status, type FROM withdrawals WHERE id = ?",
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ message: "Retrait introuvable." });
      }

      const withdrawal = rows[0];

      if (withdrawal.status !== "PENDING") {
        return res
          .status(400)
          .json({ message: "Ce retrait n'est plus en attente." });
      }

      if (withdrawal.type !== "WITHDRAW") {
        return res
          .status(400)
          .json({ message: "Ce type d'opération ne peut pas être approuvé ici." });
      }

      // Le solde a déjà été débité à la demande de retrait,
      // ici on marque le retrait comme APPROVED mais on le conserve
      // dans l'historique pour que l'utilisateur puisse le consulter.
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        // Mettre à jour le statut en APPROVED
        await conn.execute(
          "UPDATE withdrawals SET status = 'APPROVED' WHERE id = ?",
          [id]
        );

        await conn.commit();
      } catch (e) {
        await conn.rollback().catch(() => {});
        throw e;
      } finally {
        conn.release();
      }

      // Récupérer le retrait approuvé avec info utilisateur + bank si existant
      try {
        const [outRows] = await pool.execute(
          `SELECT
            w.id,
            w.user_id AS userId,
            w.amount_cents AS amountCents,
            w.status,
            w.type,
            w.created_at AS createdAt,
            u.email AS userEmail,
            u.full_name AS fullName,
            b.bank_name AS bankName,
            b.iban AS iban,
            b.holder_name AS holderName
           FROM withdrawals w
           JOIN users u ON w.user_id = u.id
           LEFT JOIN bank_accounts b ON b.user_id = u.id
           WHERE w.id = ? LIMIT 1`,
          [id]
        );
        // notify user via SSE (if connected)
        try {
          const out = outRows[0];
          const [balRows] = await pool.execute("SELECT balance_cents FROM users WHERE id = ? LIMIT 1", [out.userId]);
          const newBalance = balRows && balRows[0] ? balRows[0].balance_cents : null;
          sendSseToUser(out.userId, { type: 'withdrawal_approved', withdrawal: out, new_balance_cents: newBalance });
        } catch (e) {
          console.error('Error sending SSE after withdrawal approve:', e);
        }
        return res.json({ message: "Retrait approuvé.", withdrawal: outRows[0] });
      } catch (e) {
        console.error('Error fetching approved withdrawal:', e);
        return res.json({ message: "Retrait approuvé." });
      }
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ message: "Erreur serveur lors de l'approbation." });
    }
  }
);

// 👑 ADMIN : rejeter un retrait
app.post(
  "/api/admin/withdrawals/:id/reject",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "ID invalide." });
      }

      // On récupère le retrait
      const [rows] = await pool.execute(
        "SELECT id, user_id, amount_cents, status, type FROM withdrawals WHERE id = ?",
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ message: "Retrait introuvable." });
      }

      const withdrawal = rows[0];

      if (withdrawal.status !== "PENDING") {
        return res
          .status(400)
          .json({ message: "Ce retrait n'est plus en attente." });
      }

      if (withdrawal.type !== "WITHDRAW") {
        return res
          .status(400)
          .json({ message: "Ce type d'opération ne peut pas être rejeté ici." });
      }

      // 💰 Recréditer le solde de l'utilisateur
      // Do the recredit and mark the withdrawal as REJECTED inside a transaction
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        await conn.execute(
          "UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?",
          [withdrawal.amount_cents, withdrawal.user_id]
        );

        // Mark the withdrawal as REJECTED so it stays in the history
        await conn.execute("UPDATE withdrawals SET status = 'REJECTED' WHERE id = ?", [id]);

        await conn.commit();
      } catch (e) {
        await conn.rollback().catch(() => {});
        throw e;
      } finally {
        conn.release();
      }

      // Récupérer le retrait rejeté avec info utilisateur + bank si existant
      try {
        const [outRows] = await pool.execute(
          `SELECT
            w.id,
            w.user_id AS userId,
            w.amount_cents AS amountCents,
            w.status,
            w.type,
            w.created_at AS createdAt,
            u.email AS userEmail,
            u.full_name AS fullName,
            b.bank_name AS bankName,
            b.iban AS iban,
            b.holder_name AS holderName
           FROM withdrawals w
           JOIN users u ON w.user_id = u.id
           LEFT JOIN bank_accounts b ON b.user_id = u.id
           WHERE w.id = ? LIMIT 1`,
          [id]
        );
        try {
          const out = outRows[0];
          const [balRows] = await pool.execute("SELECT balance_cents FROM users WHERE id = ? LIMIT 1", [out.userId]);
          const newBalance = balRows && balRows[0] ? balRows[0].balance_cents : null;
          sendSseToUser(out.userId, { type: 'withdrawal_rejected', withdrawal: out, new_balance_cents: newBalance });
        } catch (e) {
          console.error('Error sending SSE after withdrawal reject:', e);
        }
        return res.json({ message: "Retrait rejeté et montant recrédité.", withdrawal: outRows[0] });
      } catch (e) {
        console.error('Error fetching rejected withdrawal:', e);
        return res.json({ message: "Retrait rejeté et montant recrédité." });
      }
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ message: "Erreur serveur lors du rejet." });
    }
  }
);

// 👑 ADMIN : lister les dépôts
app.get(
  "/api/admin/deposits",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const [rows] = await pool.execute(
        `SELECT
          d.id,
          d.user_id AS userId,
          d.amount_cents AS amountCents,
          d.full_name AS depositorFullName,
          d.payer_rib AS payerRib,
          d.screenshot_path AS screenshotPath,
          dm.motif AS methodMotif,
          d.status,
          d.created_at AS createdAt,
          u.email AS userEmail,
          u.full_name AS fullName,
          b.bank_name AS bankName,
          b.iban AS iban,
          b.holder_name AS holderName
         FROM deposits d
         JOIN users u ON d.user_id = u.id
         LEFT JOIN bank_accounts b ON b.user_id = u.id
         LEFT JOIN deposit_methods dm ON dm.id = d.method_id
         ORDER BY d.created_at DESC`
      );

      return res.json(rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Erreur serveur côté admin dépôts." });
    }
  }
);

// 👑 ADMIN : approuver un dépôt (CONFIRMED) et créditer l'utilisateur
app.post(
  "/api/admin/deposits/:id/approve",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "ID invalide." });
      }

      await ensureReferralTables();

      const [rows] = await pool.execute(
        `SELECT d.id, d.user_id, d.amount_cents, d.status, u.invited_by_user_id
         FROM deposits d
         JOIN users u ON u.id = d.user_id
         WHERE d.id = ?`,
        [id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ message: "Dépôt introuvable." });
      }
      const deposit = rows[0];
      if (deposit.status !== 'PENDING') {
        return res.status(400).json({ message: "Ce dépôt n'est plus en attente." });
      }

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        // Mettre à jour le statut
        await conn.execute("UPDATE deposits SET status = 'CONFIRMED' WHERE id = ?", [id]);

        // Créditer le solde de l'utilisateur
        await conn.execute(
          "UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?",
          [deposit.amount_cents, deposit.user_id]
        );

        // Bonus parrain (10%) si applicable
        if (deposit.invited_by_user_id) {
          const referralBonusCents = Math.floor(deposit.amount_cents * 0.10);
          if (referralBonusCents > 0) {
            await conn.execute(
              "UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?",
              [referralBonusCents, deposit.invited_by_user_id]
            );
            await conn.execute(
              "INSERT INTO referral_bonuses (deposit_id, inviter_user_id, invited_user_id, bonus_cents) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE bonus_cents = VALUES(bonus_cents)",
              [id, deposit.invited_by_user_id, deposit.user_id, referralBonusCents]
            );
          }
        }

        await conn.commit();
      } catch (e) {
        await conn.rollback().catch(() => {});
        throw e;
      } finally {
        conn.release();
      }

      // Retourner le dépôt mis à jour avec informations utilisateur + bank
      try {
        const [outRows] = await pool.execute(
          `SELECT
            d.id,
            d.user_id AS userId,
            d.amount_cents AS amountCents,
            d.full_name AS depositorFullName,
            d.payer_rib AS payerRib,
            d.screenshot_path AS screenshotPath,
            dm.motif AS methodMotif,
            d.status,
            d.created_at AS createdAt,
            u.email AS userEmail,
            u.full_name AS fullName,
            b.bank_name AS bankName,
            b.iban AS iban,
            b.holder_name AS holderName
           FROM deposits d
           JOIN users u ON d.user_id = u.id
           LEFT JOIN bank_accounts b ON b.user_id = u.id
           LEFT JOIN deposit_methods dm ON dm.id = d.method_id
           WHERE d.id = ? LIMIT 1`,
          [id]
        );
        try {
          const out = outRows[0];
          const [balRows] = await pool.execute("SELECT balance_cents FROM users WHERE id = ? LIMIT 1", [out.userId]);
          const newBalance = balRows && balRows[0] ? balRows[0].balance_cents : null;
          sendSseToUser(out.userId, { type: 'deposit_approved', deposit: out, new_balance_cents: newBalance });
        } catch (e) {
          console.error('Error sending SSE after deposit approve:', e);
        }
        return res.json({ message: "Dépôt approuvé et solde crédité.", deposit: outRows[0] });
      } catch (e) {
        console.error('Error fetching approved deposit:', e);
        return res.json({ message: "Dépôt approuvé et solde crédité." });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Erreur serveur lors de l'approbation du dépôt." });
    }
  }
);

// 👑 ADMIN : rejeter un dépôt (REJECTED)
app.post(
  "/api/admin/deposits/:id/reject",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "ID invalide." });
      }

      const [rows] = await pool.execute(
        "SELECT id, user_id, amount_cents, status FROM deposits WHERE id = ?",
        [id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ message: "Dépôt introuvable." });
      }
      const deposit = rows[0];
      if (deposit.status !== 'PENDING') {
        return res.status(400).json({ message: "Ce dépôt n'est plus en attente." });
      }

      await pool.execute("UPDATE deposits SET status = 'REJECTED' WHERE id = ?", [id]);

      // Retourner le dépôt rejeté avec details
      try {
        const [outRows] = await pool.execute(
          `SELECT
            d.id,
            d.user_id AS userId,
            d.amount_cents AS amountCents,
            d.full_name AS depositorFullName,
            d.payer_rib AS payerRib,
            d.screenshot_path AS screenshotPath,
            dm.motif AS methodMotif,
            d.status,
            d.created_at AS createdAt,
            u.email AS userEmail,
            u.full_name AS fullName,
            b.bank_name AS bankName,
            b.iban AS iban,
            b.holder_name AS holderName
           FROM deposits d
           JOIN users u ON d.user_id = u.id
           LEFT JOIN bank_accounts b ON b.user_id = u.id
           LEFT JOIN deposit_methods dm ON dm.id = d.method_id
           WHERE d.id = ? LIMIT 1`,
          [id]
        );
        try {
          const out = outRows[0];
          sendSseToUser(out.userId, { type: 'deposit_rejected', deposit: out });
        } catch (e) {
          console.error('Error sending SSE after deposit reject:', e);
        }
        return res.json({ message: "Dépôt rejeté.", deposit: outRows[0] });
      } catch (e) {
        console.error('Error fetching rejected deposit:', e);
        return res.json({ message: "Dépôt rejeté." });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Erreur serveur lors du rejet du dépôt." });
    }
  }
);

// 👑 ADMIN : exporter en CSV (withdrawals / deposits / all)
app.get(
  "/api/admin/export",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const kind = (req.query.kind || "all").toLowerCase();

      let rows = [];
      if (kind === "withdrawals" || kind === "all") {
        const [wrows] = await pool.execute(
          `SELECT
            'WITHDRAW' AS op_type,
            w.id,
            w.user_id AS userId,
            u.email AS userEmail,
            u.full_name AS fullName,
            w.amount_cents AS amountCents,
            w.status,
            w.type,
            w.created_at AS createdAt,
            b.bank_name AS bankName,
            b.iban AS iban,
            b.holder_name AS holderName
           FROM withdrawals w
           JOIN users u ON w.user_id = u.id
           LEFT JOIN bank_accounts b ON b.user_id = u.id`
        );
        rows = rows.concat(wrows.map(r => ({ kind: 'withdrawal', ...r })));
      }

      if (kind === "deposits" || kind === "all") {
        const [drows] = await pool.execute(
          `SELECT
            'DEPOSIT' AS op_type,
            d.id,
            d.user_id AS userId,
            u.email AS userEmail,
            u.full_name AS fullName,
            d.full_name AS depositorName,
            d.payer_rib AS depositorRib,
            d.screenshot_path AS screenshotPath,
            dm.motif AS methodMotif,
            d.amount_cents AS amountCents,
            d.status,
            'DEPOSIT' AS type,
            d.created_at AS createdAt,
            b.bank_name AS bankName,
            b.iban AS iban,
            b.holder_name AS holderName
           FROM deposits d
           JOIN users u ON d.user_id = u.id
           LEFT JOIN bank_accounts b ON b.user_id = u.id
           LEFT JOIN deposit_methods dm ON dm.id = d.method_id`);
        rows = rows.concat(drows.map(r => ({ kind: 'deposit', ...r })));
      }

      // Build CSV
      const headers = [
        'opType','id','userId','userEmail','fullName','depositorName','depositorRib','screenshotPath','methodMotif','amountMad','amountCents','status','type','createdAt','bankName','iban','holderName'
      ];

      const csvRows = rows.map((r) => [
        r.op_type || '',
        r.id,
        r.userId,
        r.userEmail || '',
        r.fullName || '',
        r.depositorName || '',
        r.depositorRib || '',
        r.screenshotPath || '',
        r.methodMotif || '',
        r.amountCents != null ? (r.amountCents / 100).toFixed(2) : '',
        r.amountCents != null ? r.amountCents : '',
        r.status || '',
        r.type || '',
        r.createdAt ? new Date(r.createdAt).toISOString() : '',
        r.bankName || '',
        r.iban || '',
        r.holderName || '',
      ]);

      const escape = (s) => `"${String(s).replace(/"/g, '""')}"`;
      const csvContent = [headers, ...csvRows]
        .map(r => r.map(escape).join(','))
        .join('\n');

      const filename = `export-${kind}-${new Date().toISOString().slice(0,10)}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      return res.status(500).json({ message: 'Erreur lors de l' + "export CSV" });
    }
  }
);

// 👑 ADMIN : résumé utilisateurs (nouveaux / VIP)
app.get(
  "/api/admin/users-summary",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      // Nouveaux utilisateurs des 7 derniers jours
      const [dailyRows] = await pool.execute(
        `SELECT 
           DATE(created_at) AS d, 
           COUNT(*) AS cnt,
           SUM(CASE WHEN vip_level = 'VIP' THEN 1 ELSE 0 END) AS vipCount,
           SUM(CASE WHEN vip_level <> 'VIP' OR vip_level IS NULL THEN 1 ELSE 0 END) AS freeCount
         FROM users
         WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
         GROUP BY DATE(created_at)
         ORDER BY d`
      );

      const [vipRow] = await pool.execute(
        `SELECT
            COUNT(*) AS totalUsers,
            SUM(CASE WHEN vip_level = 'VIP' THEN 1 ELSE 0 END) AS vipCount
         FROM users`
      );

      return res.json({
        daily: dailyRows || [],
        totalUsers: vipRow && vipRow[0] ? vipRow[0].totalUsers || 0 : 0,
        vipCount: vipRow && vipRow[0] ? vipRow[0].vipCount || 0 : 0,
      });
    } catch (err) {
      console.error("Error in /api/admin/users-summary:", err);
      return res.status(500).json({ message: "Erreur serveur (résumé utilisateurs)." });
    }
  }
);

// --- Méthode de dépôt (compte destinataire + preuve) ---
// Récupère les méthodes de dépôt actives (destinataire, banque, RIB…)
app.get("/api/deposit-methods", authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, bank_name AS bankName, recipient_name AS recipientName, account_number AS accountNumber, rib, motif, instructions
       FROM deposit_methods
       WHERE is_active = 1
       ORDER BY id ASC`
    );
    return res.json(rows || []);
  } catch (err) {
    console.error("Error fetching deposit methods:", err);
    return res.status(500).json({ message: "Erreur serveur (méthodes de dépôt)." });
  }
});

// Nouvelle route de dépôt avec upload de capture
app.post(
  "/api/wallet/deposit-v2",
  authMiddleware,
  depositUpload.single("screenshot"),
  async (req, res) => {
    try {
      const { amount, depositorName, depositorRib, methodId } = req.body || {};
      const amountNumber = Number(amount);
      if (Number.isNaN(amountNumber) || amountNumber <= 0) {
        return res.status(400).json({ message: "Montant de dépôt invalide." });
      }
      if (amountNumber < 80) {
        return res.status(400).json({ message: "Le montant minimum de dépôt est de 80 MAD." });
      }

      const methodIdNum = methodId ? Number(methodId) : null;
      let methodRow = null;
      if (methodIdNum) {
        const [mrows] = await pool.execute(
          `SELECT id FROM deposit_methods WHERE id = ? AND is_active = 1 LIMIT 1`,
          [methodIdNum]
        );
        if (!mrows || mrows.length === 0) {
          return res.status(400).json({ message: "Méthode de dépôt inconnue ou inactive." });
        }
        methodRow = mrows[0];
      } else {
        // fallback: pick first active method
        const [mrows] = await pool.execute(
          `SELECT id FROM deposit_methods WHERE is_active = 1 ORDER BY id ASC LIMIT 1`
        );
        methodRow = mrows && mrows[0] ? mrows[0] : null;
      }

      const finalMethodId = methodRow ? methodRow.id : null;
      const proofPath = req.file ? `/uploads/${req.file.filename}` : null;

      await pool.execute(
        `INSERT INTO deposits (user_id, amount_cents, status, full_name, payer_rib, screenshot_path, method_id)
         VALUES (?, ?, 'PENDING', ?, ?, ?, ?)`,
        [
          req.user.id,
          Math.round(amountNumber * 100),
          depositorName || null,
          depositorRib || null,
          proofPath,
          finalMethodId,
        ]
      );

      return res.json({
        message: "Dépôt enregistré. Il sera vérifié par un administrateur.",
        proofUrl: proofPath,
      });
    } catch (err) {
      console.error("Error in /api/wallet/deposit-v2:", err);
      return res.status(500).json({ message: "Erreur serveur lors de l'enregistrement du dépôt." });
    }
  }
);


// Lancer le serveur
app.listen(PORT, () => {
  console.log(`API en écoute sur http://localhost:${PORT}`);
  console.log("Admin:", "admin@promo.ma / Admin123!");
});
