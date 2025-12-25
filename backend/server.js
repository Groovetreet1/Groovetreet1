const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const nodemailer = require("nodemailer");
require("dotenv").config();
const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const APP_BASE_URL = process.env.APP_BASE_URL || "http://promoapp-001-site1.stempurl.com";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE =
  process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

const smtpTransporter =
  SMTP_HOST && SMTP_USER && SMTP_PASS
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      })
    : null;

function buildResetEmail(resetUrl) {
  return {
    subject: "Réinitialisation de votre mot de passe - WindeDelivery",
    text:
      "Bonjour,\n\n" +
      "Vous avez demandé la réinitialisation de votre mot de passe WindeDelivery.\n" +
      "Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :\n" +
      resetUrl +
      "\n\n" +
      "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.\n\n" +
      "Merci,\n" +
      "L'équipe WindeDelivery",
    html:
      "<div style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #111;\">" +
      "<p>Bonjour,</p>" +
      "<p>Vous avez demandé la réinitialisation de votre mot de passe WindeDelivery.</p>" +
      "<p><a href=\"" +
      resetUrl +
      "\" style=\"background:#0f766e;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block;\">Réinitialiser mon mot de passe</a></p>" +
      "<p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>" +
      "<p style=\"word-break:break-all;\">" +
      resetUrl +
      "</p>" +
      "<p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>" +
      "<p>Merci,<br/>L'équipe WindeDelivery</p>" +
      "</div>",
  };
}

// Limit deposit/withdraw hours (server local time)
const WINDOW_START_MINUTES = 10 * 60;       // 10h00
const WINDOW_END_MINUTES = 18 * 60 + 30;  // 18h30
function isWithinCashWindow() {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= WINDOW_START_MINUTES && minutes <= WINDOW_END_MINUTES;
}
function windowClosedMessage(kind = "opération") {
  return `${kind} autorisée entre 10h00 et 18h30 (heure serveur).`;
}

function randomPromoCode(length = 10) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

// Helper function to generate realistic names
function generateRealisticName() {
  const firstNames = [
    "Ahmed", "Mohamed", "Youssef", "Ali", "Omar", "Hassan", "Karim", "Mehdi", "Ayoub", "Imad",
    "Fatima", "Khadija", "Amina", "Samira", "Nadia", "Zineb", "Asmaa", "Hind", "Souad", "Rachida",
    "Adam", "Ismail", "Yassin", "Bilal", "Hamza", "Marwan", "Oussama", "Reda", "Saad", "Tariq",
    "Amal", "Hajar", "Manal", "Salma", "Kenza", "Loubna", "Mariam", "Naima", "Siham", "Yasmin"
  ];
  
  const lastNames = [
    "Alami", "Benali", "Chraibi", "El Fassi", "Hassani", "Idrissi", "Jabri", "Kabbaj", "Lahlou", "Mekkaoui",
    "Najib", "Ouazzani", "Rhazi", "Saidi", "Tazi", "Zeroual", "Abdelatif", "Bouazza", "Chafik", "Dahbi",
    "Essaadi", "Fathi", "Ghali", "Hachimi", "Ismaili", "Jilali", "Kamali", "Lamrani", "Mansouri", "Nouri"
  ];
  
  // Randomly decide name format
  const format = Math.floor(Math.random() * 4);
  
  switch(format) {
    case 0: // First name only
      return firstNames[Math.floor(Math.random() * firstNames.length)];
    case 1: // Last name only
      return lastNames[Math.floor(Math.random() * lastNames.length)];
    case 2: // First name + Last name
      return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
    case 3: // Username style (lowercase with numbers)
      const chars = "abcdefghijklmnopqrstuvwxyz";
      const nums = "0123456789";
      let username = "";
      const length = 6 + Math.floor(Math.random() * 5); // 6-10 characters
      
      // Start with letters
      for(let i = 0; i < length - 3; i++) {
        username += chars[Math.floor(Math.random() * chars.length)];
      }
      
      // Add some numbers
      for(let i = 0; i < 3; i++) {
        username += nums[Math.floor(Math.random() * nums.length)];
      }
      
      return username;
    default:
      return firstNames[Math.floor(Math.random() * firstNames.length)];
  }
}

// Helper function to check if a name is logical
function isNameLogical(name) {
  if (!name || typeof name !== 'string') return false;
  
  // Trim and check if empty
  const trimmed = name.trim();
  if (trimmed.length === 0) return false;
  
  // Check if it's just numbers
  if (/^\d+$/.test(trimmed)) return false;
  
  // Check if it's too short or too long
  if (trimmed.length < 2 || trimmed.length > 50) return false;
  
  // Check if it contains at least some letters
  if (!/[a-zA-Z]/.test(trimmed)) return false;
  
  // If it passes all checks, it's logical
  return true;
}

// Générer une référence unique de 24 chiffres pour les retraits
function generateWithdrawalReference() {
  // Format: YYYYMMDDHHMMSS + 10 chiffres aléatoires
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  
  const timestamp = year + month + day + hours + minutes + seconds; // 14 chiffres
  
  // Ajouter 10 chiffres aléatoires pour atteindre 24 chiffres
  let randomPart = '';
  for (let i = 0; i < 10; i++) {
    randomPart += Math.floor(Math.random() * 10).toString();
  }
  
  return timestamp + randomPart; // 24 chiffres au total
}

function promoRoleGuard(req, res, next) {
  if (
    !req.user ||
    (req.user.role !== "admin" && req.user.role !== "superadmin") ||
    !req.user.promoRoleEnabled
  ) {
    return res
      .status(403)
      .json({ message: "Accès refusé : rôle promo désactivé pour ce compte admin." });
  }
  next();
}

async function ensurePromoRoleKey() {
  await pool.execute(
    `
    CREATE TABLE IF NOT EXISTS promo_role_keys (
      id INT PRIMARY KEY,
      secret_hash VARCHAR(255) NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `
  );
  const defaultPassword = process.env.PROMO_ROLE_PASSWORD || "PromoRole123!";
  const [rows] = await pool.execute("SELECT secret_hash FROM promo_role_keys WHERE id = 1");
  if (!rows || rows.length === 0) {
    const bcrypt = require("bcryptjs");
    const hash = await bcrypt.hash(defaultPassword, 10);
    await pool.execute(
      "INSERT INTO promo_role_keys (id, secret_hash) VALUES (1, ?) ON DUPLICATE KEY UPDATE secret_hash = VALUES(secret_hash)",
      [hash]
    );
    console.log("Inserted default promo role password hash.");
  }
}

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

// CORS : permettre toutes origines (simplifie les tests locaux)
const corsOptions = {
  origin: (origin, callback) => callback(null, true),
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

// Health check for keep-alive pings
app.get("/api/ping", (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// Dossier pour les avatars
const uploadDir = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// servir les fichiers uploads en statique
app.use("/uploads", express.static(uploadDir));

// Fonction pour nettoyer les anciens fichiers de dépôt (plus de 6 jours)
async function cleanOldDepositFiles() {
  try {
    const sixDaysAgo = Date.now() - (6 * 24 * 60 * 60 * 1000);
    const files = fs.readdirSync(uploadDir);
    
    let deletedCount = 0;
    for (const file of files) {
      // Ne supprimer que les fichiers de dépôt (qui commencent par "deposit_")
      if (file.startsWith("deposit_")) {
        const filePath = path.join(uploadDir, file);
        try {
          const stats = fs.statSync(filePath);
          // Vérifier si le fichier a plus de 6 jours
          if (stats.mtimeMs < sixDaysAgo) {
            fs.unlinkSync(filePath);
            deletedCount++;
            console.log(`Fichier de dépôt supprimé: ${file}`);
          }
        } catch (err) {
          console.error(`Erreur lors de la vérification/suppression de ${file}:`, err);
        }
      }
    }
    
    if (deletedCount > 0) {
      console.log(`Nettoyage terminé: ${deletedCount} fichier(s) de dépôt supprimé(s).`);
    }
  } catch (err) {
    console.error("Erreur lors du nettoyage des anciens fichiers de dépôt:", err);
  }
}

// Exécuter le nettoyage immédiatement au démarrage
cleanOldDepositFiles();

// Exécuter le nettoyage automatiquement toutes les 24 heures
setInterval(cleanOldDepositFiles, 24 * 60 * 60 * 1000);

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
    const { planId, priceCents, durationMonths, dailyRateCents, promoCode } = req.body;
    const userId = req.user.id;

    // Validation des paramètres
    if (!planId || !priceCents || !durationMonths) {
      return res.status(400).json({ message: "Paramètres de plan invalides." });
    }

    // On récupère l'utilisateur à jour
    const [rows] = await pool.execute(
      "SELECT vip_level, vip_expires_at, balance_cents, daily_rate_cents FROM users WHERE id = ?",
      [userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    const row = rows[0];
    const isAlreadyVip = row.vip_level === "VIP";
    const currentDailyRate = row.daily_rate_cents || 0;

    // Log pour debug
    console.log(`[UPGRADE VIP] User ${userId} - Current daily rate: ${currentDailyRate}, New daily rate: ${dailyRateCents}, Plan ID: ${planId}`);

    // Si l'utilisateur est déjà VIP avec un daily_rate défini, vérifier qu'il upgrade vers un plan supérieur
    // Note: On autorise l'upgrade si currentDailyRate est 0 (ancien compte VIP sans daily_rate)
    if (isAlreadyVip && currentDailyRate > 0) {
      if (dailyRateCents <= currentDailyRate) {
        console.log(`[UPGRADE VIP] Blocked - trying to downgrade or same plan`);
        return res.status(400).json({ 
          message: `Vous devez choisir un plan supérieur à votre plan actuel pour faire un upgrade. (Actuel: ${currentDailyRate/100} MAD/jour)` 
        });
      }
    }
    
    // Si isAlreadyVip mais currentDailyRate est 0, on autorise l'upgrade (ancien compte)
    if (isAlreadyVip && currentDailyRate === 0) {
      console.log(`[UPGRADE VIP] Allowing upgrade for old VIP account without daily_rate set`);
    }

    let finalPrice = priceCents;
    let discountApplied = false;
    let promoDiscount = 0;

    // Vérifier le code promo si fourni
    if (promoCode && promoCode.trim() !== "") {
      const [promoRows] = await pool.execute(
        "SELECT * FROM promo_codes WHERE code = ? AND is_used = 0 AND expires_at > NOW()",
        [promoCode.trim()]
      );

      if (promoRows.length > 0) {
        const promo = promoRows[0];
        // Appliquer une réduction (ex: 10% ou montant fixe selon votre logique)
        // Ici, on va supposer que le code promo offre 10% de réduction
        promoDiscount = Math.floor(priceCents * 0.1);
        finalPrice = priceCents - promoDiscount;
        discountApplied = true;

        // Marquer le code promo comme utilisé
        await pool.execute(
          "UPDATE promo_codes SET is_used = 1, used_by_user_id = ?, used_at = NOW() WHERE id = ?",
          [userId, promo.id]
        );
      }
    }

    if (row.balance_cents < finalPrice) {
      return res.status(400).json({
        message: `Solde insuffisant pour ${isAlreadyVip ? 'upgrader' : 'devenir VIP'}. Il faut au moins ${finalPrice / 100} MAD.`,
      });
    }

    const newBalance = row.balance_cents - finalPrice;

    // Calculer la date d'expiration
    let vipExpiresAt;
    if (isAlreadyVip && row.vip_expires_at) {
      // Si déjà VIP, étendre à partir de la date d'expiration actuelle (ou maintenant si déjà expiré)
      const currentExpiry = new Date(row.vip_expires_at);
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
      vipExpiresAt = new Date(baseDate.getTime() + durationMonths * 30 * 24 * 60 * 60 * 1000);
    } else {
      // Premier passage en VIP
      vipExpiresAt = new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000);
    }
    
    await pool.execute(
      `UPDATE users 
       SET balance_cents = ?, 
           vip_level = 'VIP', 
           vip_expires_at = ?,
           daily_rate_cents = ?
       WHERE id = ?`,
      [newBalance, vipExpiresAt, dailyRateCents, userId]
    );

    // Enregistrer dans withdrawals comme VIP_UPGRADE (APPROVED direct)
    await pool.execute(
      "INSERT INTO withdrawals (user_id, amount_cents, status, type) VALUES (?, ?, 'APPROVED', 'VIP_UPGRADE')",
      [userId, finalPrice]
    );

    const planNames = {
      1: "STARTER (2 mois)",
      2: "POPULAIRE (3 mois)",
      3: "PREMIUM (3 mois)",
      4: "ELITE (6 mois)"
    };

    let message;
    if (isAlreadyVip) {
      message = `Félicitations ! Vous avez upgradé vers le plan ${planNames[planId] || ""} ! (+${durationMonths} mois)`;
    } else {
      message = `Félicitations, tu es maintenant VIP ${planNames[planId] || ""} ! (valable ${durationMonths} mois)`;
    }
    
    if (discountApplied) {
      message += ` Code promo appliqué: -${promoDiscount / 100} MAD`;
    }

    return res.json({
      message,
      new_balance_cents: newBalance,
      vipLevel: "VIP",
      vip_expires_at: vipExpiresAt.toISOString(),
      planId,
      durationMonths,
      dailyRateCents,
      discountApplied,
      promoDiscount,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Erreur serveur lors du passage en VIP." });
  }
});


// Helper: Calculer les gains quotidiens d'un utilisateur
async function getTodayEarnings(userId) {
  console.log(`\n💰 ========== getTodayEarnings appelé pour userId: ${userId} ==========`);
  
  // Calculer la date d'aujourd'hui en heure marocaine (UTC+0 ou UTC+1 selon DST)
  // Le Maroc utilise le fuseau horaire Africa/Casablanca
  const now = new Date();
  const moroccoDate = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Casablanca' }));
  const todayStart = new Date(moroccoDate.getFullYear(), moroccoDate.getMonth(), moroccoDate.getDate(), 0, 0, 0);
  const tomorrowStart = new Date(moroccoDate.getFullYear(), moroccoDate.getMonth(), moroccoDate.getDate() + 1, 0, 0, 0);
  
  // Formater pour MySQL (YYYY-MM-DD HH:MM:SS)
  const formatForMySQL = (date) => {
    return date.toISOString().slice(0, 19).replace('T', ' ');
  };
  
  const todayStartStr = formatForMySQL(todayStart);
  const tomorrowStartStr = formatForMySQL(tomorrowStart);
  
  console.log(`💰 Date Maroc: ${moroccoDate.toISOString()}`);
  console.log(`💰 Période: ${todayStartStr} -> ${tomorrowStartStr}`);
  
  // Calculer les gains de toutes les tâches complétées depuis task_completions
  const [rows] = await pool.execute(
    `SELECT COALESCE(SUM(reward_cents), 0) as total, COUNT(*) as count
     FROM task_completions
     WHERE user_id = ? AND created_at >= ? AND created_at < ?`,
    [userId, todayStartStr, tomorrowStartStr]
  );
  
  console.log(`💰 Résultat task_completions: total = ${rows[0]?.total || 0} cents, nombre de lignes = ${rows[0]?.count || 0}`);
  
  // Calculer les gains des tâches sociales
  const [socialRows] = await pool.execute(
    `SELECT 
       COALESCE(SUM(CASE 
         WHEN platform = 'facebook' THEN (SELECT reward_cents FROM facebook_tasks WHERE id = task_id)
         WHEN platform = 'tiktok' THEN (SELECT reward_cents FROM tiktok_tasks WHERE id = task_id)
         WHEN platform = 'instagram' THEN (SELECT reward_cents FROM instagram_tasks WHERE id = task_id)
         ELSE 0
       END), 0) as total
     FROM completed_social_tasks
     WHERE user_id = ? AND completed_at >= ? AND completed_at < ?`,
    [userId, todayStartStr, tomorrowStartStr]
  );
  
  console.log(`💰 Résultat completed_social_tasks: total = ${socialRows[0]?.total || 0} cents`);
  
  // Calculer les gains des tâches Rate Store
  const [rateStoreRows] = await pool.execute(
    `SELECT COALESCE(SUM(reward_cents), 0) as total, COUNT(*) as count
     FROM rate_store_completions
     WHERE user_id = ? AND created_at >= ? AND created_at < ?`,
    [userId, todayStartStr, tomorrowStartStr]
  );
  
  console.log(`💰 Résultat rate_store_completions: total = ${rateStoreRows[0]?.total || 0} cents, nombre = ${rateStoreRows[0]?.count || 0}`);
  
  // Convertir explicitement en nombres pour éviter la concaténation de strings
  const taskTotal = parseInt(rows[0]?.total || 0, 10);
  const socialTotal = parseInt(socialRows[0]?.total || 0, 10);
  const rateStoreTotal = parseInt(rateStoreRows[0]?.total || 0, 10);
  
  console.log(`💰 DEBUG: taskTotal = ${taskTotal}, socialTotal = ${socialTotal}, rateStoreTotal = ${rateStoreTotal}`);
  
  const totalEarnings = taskTotal + socialTotal + rateStoreTotal;
  console.log(`💰 TOTAL FINAL: ${totalEarnings} cents (${totalEarnings / 100} MAD)`);
  console.log(`💰 ========== FIN getTodayEarnings ==========\n`);
  return totalEarnings;
}

// Helper: Filtrer les tâches selon le daily_rate de l'utilisateur
async function filterTasksByDailyRate(userId, tasks) {
  // Récupérer les informations de l'utilisateur
  const [userRows] = await pool.execute(
    "SELECT vip_level, daily_rate_cents FROM users WHERE id = ? LIMIT 1",
    [userId]
  );
  
  if (!userRows || userRows.length === 0) {
    return tasks;
  }
  
  const user = userRows[0];
  
  // Si l'utilisateur n'a pas de daily_rate défini (ancien compte), retourner toutes les tâches
  if (!user.daily_rate_cents || user.daily_rate_cents === 0) {
    return tasks;
  }
  
  // Calculer les gains d'aujourd'hui
  const todayEarnings = await getTodayEarnings(userId);
  const remainingCents = user.daily_rate_cents - todayEarnings;
  
  // Si l'utilisateur a atteint sa limite quotidienne, retourner un tableau vide
  if (remainingCents <= 0) {
    return [];
  }
  
  // Filtrer les tâches dont la récompense ne dépasse pas le montant restant
  const availableTasks = tasks.filter(task => task.rewardCents <= remainingCents);
  
  return availableTasks;
}

// Middleware admin
function adminMiddleware(req, res, next) {
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "superadmin")) {
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

    // Validate email and password, but handle fullName with logic check
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email et mot de passe sont obligatoires." });
    }
    
    // If fullName is not provided or is not logical, generate a realistic name
    let finalFullName = fullName;
    if (!fullName || !isNameLogical(fullName)) {
      finalFullName = generateRealisticName();
      console.log(`Generated realistic name for user: ${finalFullName}`);
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
      [finalFullName, email, passwordHash, "FREE", role, 0, newInviteCode, inviterUserId]
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
    const token = jwt.sign({ userId }, JWT_SECRET);

    // 6) Retourner les infos (sans password)
    const user = {
      id: userId,
      fullName: finalFullName,
      email,
      vipLevel: "FREE",
      role,
      promoRoleEnabled: 0,
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
    // Expire VIP if past expiration date
    if (userRow.vip_level === "VIP" && userRow.vip_expires_at) {
      const exp = new Date(userRow.vip_expires_at);
      if (!isNaN(exp.getTime()) && exp.getTime() <= Date.now()) {
        try {
          await pool.execute(
            "UPDATE users SET vip_level = 'FREE', vip_expires_at = NULL WHERE id = ?",
            [userRow.id]
          );
          userRow.vip_level = "FREE";
          userRow.vip_expires_at = null;
        } catch (e) {
          console.error("Could not expire VIP during login for user", userRow.id, e);
        }
      }
    }

    // 2) Vérifier le mot de passe
    const ok = await bcrypt.compare(password, userRow.password_hash);
    if (!ok) {
      return res
        .status(400)
        .json({ message: "Email ou mot de passe incorrect." });
    }

    const inviteCode = await ensureInviteCode(userRow.id, userRow.invite_code);

    // 3) Générer un token
    const token = jwt.sign({ userId: userRow.id }, JWT_SECRET);

    // 4) Construire l'objet user envoyé au front
    const user = {
      id: userRow.id,
      fullName: userRow.full_name,
      email: userRow.email,
      vipLevel: userRow.vip_level,
      vipExpiresAt: userRow.vip_expires_at,
      role: userRow.role,
      promoRoleEnabled: userRow.promo_role_enabled || 0,
      balanceCents: userRow.balance_cents,
      inviteCode,
      invitedByUserId: userRow.invited_by_user_id || null,
      adminBankName: userRow.admin_bank_name || null,
    };

    return res.json({ user, token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// Mot de passe oublié - Envoyer un lien de réinitialisation par email
app.post("/api/auth/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email requis." });
  }

  try {
    // Vérifier si l'utilisateur existe
    const [rows] = await pool.execute(
      "SELECT id, email FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    // Ne pas révéler si l'email existe ou non pour des raisons de sécurité
    if (rows.length === 0) {
      return res.json({ 
        message: "Si cet email existe, un lien de réinitialisation a été envoyé." 
      });
    }

    const user = rows[0];
    
    // Générer un token de réinitialisation valide 1 heure
    const resetToken = jwt.sign(
      { userId: user.id, type: "reset" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const resetUrl = `${APP_BASE_URL}/reset-password?token=${resetToken}`;

    if (smtpTransporter) {
      const mail = buildResetEmail(resetUrl);
      try {
        await smtpTransporter.sendMail({
          from: SMTP_FROM,
          to: email,
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
        });
      } catch (mailErr) {
        console.error("SMTP error while sending reset email:", mailErr);
      }
    } else {
      console.warn("SMTP not configured. Skipping reset email send.");
    }

    console.log(`[RESET PASSWORD] Lien pour ${email}: ${resetUrl}`);

    return res.json({ 
      message: "Un lien de réinitialisation a été envoyé à votre adresse email.",
      // EN DEV SEULEMENT - Enlever en production
      devToken: resetToken
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// Réinitialiser le mot de passe avec le token
app.post("/api/auth/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: "Token et nouveau mot de passe requis." });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: "Le mot de passe doit contenir au moins 6 caractères." });
  }

  try {
    // Vérifier et décoder le token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.type !== "reset") {
      return res.status(400).json({ message: "Token invalide." });
    }

    const userId = decoded.userId;

    // Vérifier que l'utilisateur existe toujours
    const [userRows] = await pool.execute(
      "SELECT id FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe
    await pool.execute(
      "UPDATE users SET password_hash = ? WHERE id = ?",
      [hashedPassword, userId]
    );

    console.log(`[RESET PASSWORD] Mot de passe réinitialisé pour l'utilisateur ID: ${userId}`);

    return res.json({ 
      message: "Mot de passe réinitialisé avec succès ! Vous pouvez maintenant vous connecter." 
    });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Le lien de réinitialisation a expiré. Veuillez en demander un nouveau." });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "Token invalide." });
    }
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
    // Expire VIP if past expiration date
    if (row.vip_level === "VIP" && row.vip_expires_at) {
      const exp = new Date(row.vip_expires_at);
      if (!isNaN(exp.getTime()) && exp.getTime() <= Date.now()) {
        try {
          await pool.execute(
            "UPDATE users SET vip_level = 'FREE', vip_expires_at = NULL WHERE id = ?",
            [row.id]
          );
          row.vip_level = "FREE";
          row.vip_expires_at = null;
        } catch (e) {
          console.error("Could not expire VIP for user", row.id, e);
        }
      }
    }
    const inviteCode = await ensureInviteCode(row.id, row.invite_code);
    req.user = {
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      vipLevel: row.vip_level,
      vipExpiresAt: row.vip_expires_at,
      role: row.role,
      promoRoleEnabled: row.promo_role_enabled || 0,
      balanceCents: row.balance_cents,
      daily_rate_cents: row.daily_rate_cents || 0,
      inviteCode,
      invitedByUserId: row.invited_by_user_id || null,
      admin_bank_name: row.admin_bank_name || null,
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
    // Check if FREE user trial (3 days) has expired
    let trialExpired = false;
    let trialDaysRemaining = null;
    try {
      const [trialRows] = await pool.execute(
        "SELECT created_at, vip_level FROM users WHERE id = ? LIMIT 1",
        [req.user.id]
      );
      if (trialRows && trialRows[0]) {
        const createdAt = new Date(trialRows[0].created_at);
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
        const elapsed = Date.now() - createdAt.getTime();
        if (trialRows[0].vip_level === "FREE") {
          if (elapsed >= threeDaysMs) {
            trialExpired = true;
            trialDaysRemaining = 0;
          } else {
            trialDaysRemaining = Math.ceil((threeDaysMs - elapsed) / (24 * 60 * 60 * 1000));
          }
        }
      }
    } catch (e) {
      console.error("Could not check trial expiration:", e);
    }

    // authMiddleware already fetched the fresh user row and placed it on req.user
    const safeUser = {
      id: req.user.id,
      fullName: req.user.fullName || req.user.full_name,
      email: req.user.email,
      vipLevel: req.user.vipLevel || req.user.vip_level,
      vipExpiresAt: req.user.vipExpiresAt || null,
      role: req.user.role,
      promoRoleEnabled: req.user.promoRoleEnabled || 0,
      balanceCents: typeof req.user.balanceCents !== 'undefined' ? req.user.balanceCents : req.user.balance_cents,
      dailyRateCents: req.user.daily_rate_cents || 0,
      inviteCode: req.user.inviteCode,
      invitedByUserId: req.user.invitedByUserId || null,
      trialExpired,
      trialDaysRemaining,
    };
    return res.json({ user: safeUser });
  } catch (err) {
    console.error('Error in GET /api/user/me:', err);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Endpoint pour récupérer les informations sur les gains quotidiens
app.get('/api/user/daily-earnings', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    let dailyLimitCents = 0;
    
    try {
      // Récupérer le daily_rate de l'utilisateur
      const [userRows] = await pool.execute(
        "SELECT daily_rate_cents, vip_level, created_at FROM users WHERE id = ? LIMIT 1",
        [userId]
      );
      
      if (userRows && userRows.length > 0) {
        const user = userRows[0];
        
        // Pour les utilisateurs FREE en période d'essai, limite de 7 MAD/jour
        if (user.vip_level === 'FREE') {
          const createdAt = new Date(user.created_at);
          const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
          const elapsed = Date.now() - createdAt.getTime();
          
          if (elapsed < threeDaysMs) {
            // En période d'essai: limite de 7 MAD (700 cents)
            dailyLimitCents = 700;
          } else {
            // Période d'essai expirée: pas de limite (ils ne peuvent plus accéder)
            dailyLimitCents = 0;
          }
        } else {
          // Utilisateurs VIP: utiliser leur daily_rate_cents
          dailyLimitCents = user.daily_rate_cents || 0;
        }
      }
    } catch (dbError) {
      // Si la colonne daily_rate_cents n'existe pas encore, retourner 0
      console.warn('Column daily_rate_cents may not exist yet:', dbError.message);
      dailyLimitCents = 0;
    }
    
    // Calculer les gains d'aujourd'hui
    let todayEarningsCents = 0;
    try {
      todayEarningsCents = await getTodayEarnings(userId);
    } catch (earningsError) {
      console.error('Error calculating today earnings:', earningsError);
      todayEarningsCents = 0;
    }
    
    return res.json({
      todayEarningsCents,
      dailyLimitCents,
      remainingCents: Math.max(0, dailyLimitCents - todayEarningsCents),
      hasLimit: dailyLimitCents > 0,
      limitReached: dailyLimitCents > 0 && todayEarningsCents >= dailyLimitCents,
    });
  } catch (err) {
    console.error('Error in GET /api/user/daily-earnings:', err);
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
    // Retourner TOUTES les tâches, même si l'utilisateur est FREE avec essai expiré
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
      // If DB has no active tasks (or all were completed today), return fallback tasks
      console.warn('No available tasks for user or DB empty — returning default tasks fallback');
      const fallbackTasks = DEFAULT_TASKS.map(t => ({
        ...t,
        isEligible: !isTrialExpired || t.minVipLevel !== 'FREE'
      }));
      return res.json(fallbackTasks);
    }

    // Ajouter un champ isEligible à chaque tâche
    // Si l'essai est expiré, l'utilisateur FREE ne peut compléter que les tâches VIP (avec upgrade)
    const tasksWithEligibility = rows.map(task => ({
      ...task,
      isEligible: !isTrialExpired || task.minVipLevel !== 'FREE'
    }));

    // Filtrer les tâches selon le daily_rate de l'utilisateur
    const filteredTasks = await filterTasksByDailyRate(userId, tasksWithEligibility);
    return res.json(filteredTasks);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur lors de la récupération des tâches." });
  }
});

// Endpoint: GET /api/tasks/facebook - Récupérer les tâches Facebook
app.get("/api/tasks/facebook", authMiddleware, async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    
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

    const [rows] = await pool.execute(
      `SELECT
         t.id,
         t.title,
         t.description,
         t.reward_cents AS rewardCents,
         t.duration_seconds AS durationSeconds,
         t.min_vip_level AS minVipLevel,
         t.video_url AS videoUrl
       FROM facebook_tasks t
       WHERE t.is_active = 1
         ${isTrialExpired ? "AND t.min_vip_level <> 'FREE'" : ""}
         AND NOT EXISTS (
         SELECT 1 FROM completed_social_tasks cst
         WHERE cst.task_id = t.id
           AND cst.user_id = ?
           AND cst.platform = 'facebook'
           AND cst.completed_at >= ?
       )
       ORDER BY t.id`,
      [userId, startDate]
    );

    // Filtrer les tâches selon le daily_rate de l'utilisateur
    const filteredTasks = await filterTasksByDailyRate(userId, rows);
    return res.json(filteredTasks);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// Endpoint: GET /api/tasks/tiktok - Récupérer les tâches TikTok
app.get("/api/tasks/tiktok", authMiddleware, async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    
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

    const [rows] = await pool.execute(
      `SELECT
         t.id,
         t.title,
         t.description,
         t.reward_cents AS rewardCents,
         t.duration_seconds AS durationSeconds,
         t.min_vip_level AS minVipLevel,
         t.video_url AS videoUrl
       FROM tiktok_tasks t
       WHERE t.is_active = 1
         ${isTrialExpired ? "AND t.min_vip_level <> 'FREE'" : ""}
         AND NOT EXISTS (
         SELECT 1 FROM completed_social_tasks cst
         WHERE cst.task_id = t.id
           AND cst.user_id = ?
           AND cst.platform = 'tiktok'
           AND cst.completed_at >= ?
       )
       ORDER BY t.id`,
      [userId, startDate]
    );

    // Filtrer les tâches selon le daily_rate de l'utilisateur
    const filteredTasks = await filterTasksByDailyRate(userId, rows);
    return res.json(filteredTasks);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// Endpoint: GET /api/tasks/instagram - Récupérer les tâches Instagram
app.get("/api/tasks/instagram", authMiddleware, async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    
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

    const [rows] = await pool.execute(
      `SELECT
         t.id,
         t.title,
         t.description,
         t.reward_cents AS rewardCents,
         t.duration_seconds AS durationSeconds,
         t.min_vip_level AS minVipLevel,
         t.video_url AS videoUrl
       FROM instagram_tasks t
       WHERE t.is_active = 1
         ${isTrialExpired ? "AND t.min_vip_level <> 'FREE'" : ""}
         AND NOT EXISTS (
         SELECT 1 FROM completed_social_tasks cst
         WHERE cst.task_id = t.id
           AND cst.user_id = ?
           AND cst.platform = 'instagram'
           AND cst.completed_at >= ?
       )
       ORDER BY t.id`,
      [userId, startDate]
    );

    // Filtrer les tâches selon le daily_rate de l'utilisateur
    const filteredTasks = await filterTasksByDailyRate(userId, rows);
    return res.json(filteredTasks);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// Endpoint: GET /api/tasks/youtube - Récupérer les tâches YouTube
app.get("/api/tasks/youtube", authMiddleware, async (req, res) => {
  try {
    const userId = req.user && req.user.id;
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

    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// 💰 DÉPÔT : montant > 80 MAD + historique
app.post("/api/wallet/deposit", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, full_name } = req.body;

    if (!isWithinCashWindow()) {
      return res.status(403).json({ 
        message: windowClosedMessage("Dépôt"),
        timeLimitReached: true,
        operation: "deposit"
      });
    }

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

    if (!isWithinCashWindow()) {
      return res.status(403).json({ 
        message: windowClosedMessage("Retrait"),
        timeLimitReached: true,
        operation: "withdrawal"
      });
    }

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

    // 2) Créer une demande de retrait PENDING avec référence unique
    const reference = generateWithdrawalReference();
    const [result] = await pool.execute(
      "INSERT INTO withdrawals (user_id, amount_cents, status, type, reference) VALUES (?, ?, 'PENDING', 'WITHDRAW', ?)",
      [userId, amountCents, reference]
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
        reference,
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
         reference,
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
    const requestId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    console.log(`\n🎯 [${requestId}] ========== DÉBUT POST /api/tasks/:taskId/complete ==========`);
    console.log(`🎯 [${requestId}] userId: ${req.user?.id}, taskId: ${req.params.taskId}`);
    
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

      // Vérifier la limite quotidienne avant de permettre la complétion
      const [userInfo] = await pool.execute(
        "SELECT daily_rate_cents, vip_level, created_at FROM users WHERE id = ? LIMIT 1",
        [userId]
      );
      
      let dailyLimit = 0;
      if (userInfo.length > 0) {
        const userRow = userInfo[0];
        
        // Pour les utilisateurs FREE en période d'essai, limite de 7 MAD (700 cents)
        if (userRow.vip_level === 'FREE') {
          const createdAt = new Date(userRow.created_at);
          const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
          const elapsed = Date.now() - createdAt.getTime();
          
          if (elapsed < threeDaysMs) {
            dailyLimit = 700; // 7 MAD pour FREE en essai
          }
        } else {
          dailyLimit = userRow.daily_rate_cents || 0;
        }
      }
      
      if (dailyLimit > 0) {
        const todayEarnings = await getTodayEarnings(userId);
        
        // Si l'utilisateur a déjà atteint ou dépassé sa limite
        if (todayEarnings >= dailyLimit) {
          return res.status(403).json({ 
            message: "Vous avez atteint votre limite de gains quotidiens. Revenez demain!",
            dailyLimitReached: true
          });
        }
        
        // Si cette tâche ferait dépasser la limite
        if (todayEarnings + rewardCents > dailyLimit) {
          return res.status(403).json({ 
            message: `Cette tâche vous ferait dépasser votre limite quotidienne. Il vous reste ${((dailyLimit - todayEarnings) / 100).toFixed(2)} MAD à gagner aujourd'hui.`,
            dailyLimitReached: true
          });
        }
      }

      // Vérifier si l'utilisateur FREE a dépassé la période d'essai de 3 jours
      const [userRows2] = await pool.execute(
        "SELECT created_at, vip_level FROM users WHERE id = ? LIMIT 1",
        [userId]
      );
      let isTrialExpired = false;
      if (userRows2 && userRows2[0]) {
        const createdAt = new Date(userRows2[0].created_at);
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
        if (
          userRows2[0].vip_level === "FREE" &&
          Date.now() - createdAt.getTime() >= threeDaysMs
        ) {
          isTrialExpired = true;
        }
      }

      // Bloquer les tâches FREE si l'utilisateur est FREE avec essai expiré
      const vipLevel = (req.user.vipLevel || req.user.vip_level || "FREE").toUpperCase();
      const minVip = (task.min_vip_level || "FREE").toUpperCase();
      const isFreeTask = minVip.includes("FREE");
      
      // Bloquer les tâches VIP pour les FREE
      if (!isFreeTask && vipLevel === "FREE") {
        return res.status(403).json({
          message: "Désolé, cette tâche est réservée aux VIP. Passe en VIP pour la valider.",
        });
      }

      // Bloquer les tâches FREE si l'essai est expiré
      if (isFreeTask && isTrialExpired && vipLevel === "FREE") {
        return res.status(403).json({
          message: "Votre période d'essai de 3 jours est terminée. Vous devez passer en VIP pour continuer à gagner de l'argent.",
          trialExpired: true
        });
      }

      // 2) Vérifier si l'utilisateur a déjà complété cette tâche AUJOURD'HUI
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
      
      const [already] = await pool.execute(
        "SELECT id FROM task_completions WHERE user_id = ? AND task_id = ? AND created_at >= ? LIMIT 1",
        [userId, taskId, startDate]
      );
      if (already.length > 0) {
        return res.status(400).json({ message: "Tâche déjà complétée aujourd'hui." });
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
        console.log(`🎯 [${requestId}] 💾 INSERT INTO task_completions - userId: ${userId}, taskId: ${taskId}, reward: ${rewardCents}`);
        await conn.execute(
          `INSERT INTO task_completions
            (user_id, task_id, reward_cents, balance_before_cents, balance_after_cents)
           VALUES (?, ?, ?, ?, ?)`,
          [userId, taskId, rewardCents, balanceBefore, balanceAfter]
        );
        console.log(`🎯 [${requestId}] ✅ INSERT réussi`);

        await conn.commit();
        console.log(`🎯 [${requestId}] ✅ COMMIT réussi`);

        // Notify via SSE so client can refresh dashboard/tasks
        sendSseToUser(userId, {
          type: 'task_completed',
          taskId,
          rewardCents,
          newBalanceCents: balanceAfter,
        });

        // Réponse au frontend
        console.log(`🎯 [${requestId}] 📤 Réponse envoyée - reward: ${rewardCents}, balance: ${balanceAfter}`);
        console.log(`🎯 [${requestId}] ========== FIN POST /api/tasks/:taskId/complete ==========\n`);
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

// ========== RATE STORES ==========

// Ensure rate_store_completions table exists
async function ensureRateStoreTable() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS rate_store_completions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      store_name VARCHAR(50) NOT NULL,
      product_id VARCHAR(50) NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      rating INT NOT NULL,
      comment TEXT,
      reward_cents INT NOT NULL,
      balance_before_cents INT NOT NULL,
      balance_after_cents INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_date DATE DEFAULT (CURDATE()),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_product_daily (user_id, product_id, created_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✓ Table rate_store_completions vérifiée/créée');
}
ensureRateStoreTable().catch(console.error);

// Complete a rate store task
app.post("/api/rate-store/complete", authMiddleware, async (req, res) => {
  const requestId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  console.log(`\n⭐ [${requestId}] ========== DÉBUT POST /api/rate-store/complete ==========`);
  
  try {
    const userId = req.user.id;
    const { storeName, productId, productName, rating, comment, rewardCents } = req.body;
    
    console.log(`⭐ [${requestId}] userId: ${userId}, store: ${storeName}, product: ${productId}, rating: ${rating}, reward: ${rewardCents}`);
    
    // Check if FREE user trial (3 days) has expired
    const [trialRows] = await pool.execute(
      "SELECT created_at, vip_level FROM users WHERE id = ? LIMIT 1",
      [userId]
    );
    if (trialRows && trialRows[0]) {
      const createdAt = new Date(trialRows[0].created_at);
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
      if (
        trialRows[0].vip_level === "FREE" &&
        Date.now() - createdAt.getTime() >= threeDaysMs
      ) {
        return res.status(403).json({ 
          message: "Votre période d'essai de 3 jours est terminée. Veuillez passer au VIP pour continuer.",
          trialExpired: true
        });
      }
      
      // Vérifier la limite quotidienne pour les utilisateurs FREE en essai (7 MAD/jour)
      if (trialRows[0].vip_level === "FREE") {
        const elapsed = Date.now() - createdAt.getTime();
        if (elapsed < threeDaysMs) {
          const dailyLimit = 700; // 7 MAD pour FREE en essai
          const todayEarnings = await getTodayEarnings(userId);
          const rewardCentsInt = parseInt(rewardCents, 10) || 0;
          
          if (todayEarnings >= dailyLimit) {
            return res.status(403).json({ 
              message: "Vous avez atteint votre limite de gains quotidiens (7 MAD). Revenez demain!",
              dailyLimitReached: true
            });
          }
          
          if (todayEarnings + rewardCentsInt > dailyLimit) {
            return res.status(403).json({ 
              message: `Cette tâche vous ferait dépasser votre limite quotidienne. Il vous reste ${((dailyLimit - todayEarnings) / 100).toFixed(2)} MAD à gagner aujourd'hui.`,
              dailyLimitReached: true
            });
          }
        }
      }
    }
    
    // Validate inputs
    if (!storeName || !productId || !productName || !rating || !rewardCents) {
      return res.status(400).json({ message: "Données manquantes." });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "La note doit être entre 1 et 5." });
    }
    
    // Validate reward: FREE users 50-100 cents (0.5-1 MAD), VIP users 50-300 cents (0.5-3 MAD)
    const rewardCentsInt = parseInt(rewardCents, 10);
    const isVip = trialRows && trialRows[0] && trialRows[0].vip_level === 'VIP';
    const maxReward = isVip ? 300 : 100;
    if (rewardCentsInt < 50 || rewardCentsInt > maxReward) {
      return res.status(400).json({ message: "Récompense invalide." });
    }
    
    // Check if already completed today
    const nowPlus1 = new Date(Date.now() + 1 * 60 * 60 * 1000);
    const startUtcForGmtPlus1 = Date.UTC(
      nowPlus1.getUTCFullYear(),
      nowPlus1.getUTCMonth(),
      nowPlus1.getUTCDate(),
      0, 0, 0
    ) - 1 * 60 * 60 * 1000;
    const startDate = new Date(startUtcForGmtPlus1);
    
    const [already] = await pool.execute(
      "SELECT id FROM rate_store_completions WHERE user_id = ? AND product_id = ? AND created_at >= ? LIMIT 1",
      [userId, productId, startDate]
    );
    if (already.length > 0) {
      return res.status(400).json({ message: "Produit déjà noté aujourd'hui." });
    }
    
    // Transaction to update balance and record completion
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      
      // Get current balance
      const [userRows] = await conn.execute(
        "SELECT balance_cents FROM users WHERE id = ? FOR UPDATE",
        [userId]
      );
      if (userRows.length === 0) {
        await conn.rollback();
        return res.status(404).json({ message: "Utilisateur introuvable." });
      }
      
      const balanceBefore = userRows[0].balance_cents;
      const balanceAfter = balanceBefore + rewardCentsInt;
      
      // Update balance
      await conn.execute(
        "UPDATE users SET balance_cents = ? WHERE id = ?",
        [balanceAfter, userId]
      );
      
      // Record completion
      await conn.execute(
        `INSERT INTO rate_store_completions
          (user_id, store_name, product_id, product_name, rating, comment, reward_cents, balance_before_cents, balance_after_cents)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, storeName, productId, productName, rating, comment || '', rewardCentsInt, balanceBefore, balanceAfter]
      );
      
      await conn.commit();
      console.log(`⭐ [${requestId}] ✅ Tâche complétée - reward: ${rewardCentsInt}, new balance: ${balanceAfter}`);
      
      return res.json({
        message: "Tâche de notation complétée.",
        reward_cents: rewardCentsInt,
        new_balance_cents: balanceAfter,
      });
      
    } catch (e) {
      await conn.rollback().catch(() => {});
      if (e && (e.code === 'ER_DUP_ENTRY' || e.errno === 1062)) {
        return res.status(400).json({ message: "Produit déjà noté aujourd'hui." });
      }
      console.error(`⭐ [${requestId}] ❌ Erreur:`, e);
      return res.status(500).json({ message: "Erreur serveur." });
    } finally {
      conn.release();
    }
    
  } catch (err) {
    console.error(`⭐ [${requestId}] ❌ Erreur:`, err);
    return res.status(500).json({ message: "Erreur serveur lors de la complétion de la tâche." });
  }
});

// Get rate store history
app.get("/api/rate-store/history", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [rows] = await pool.execute(
      `SELECT
        id,
        store_name AS storeName,
        product_name AS productName,
        rating,
        comment,
        reward_cents AS rewardCents,
        created_at AS createdAt
       FROM rate_store_completions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );
    
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// Get today's completed stores (for daily reset)
app.get("/api/rate-store/today-completed", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Calculate today's start (GMT+1 timezone)
    const now = new Date();
    const nowPlus1 = new Date(now.getTime() + 1 * 60 * 60 * 1000);
    const startUtcForGmtPlus1 = Date.UTC(
      nowPlus1.getUTCFullYear(),
      nowPlus1.getUTCMonth(),
      nowPlus1.getUTCDate(),
      0, 0, 0
    ) - 1 * 60 * 60 * 1000;
    const startDate = new Date(startUtcForGmtPlus1);
    
    // Get distinct stores completed today
    const [rows] = await pool.execute(
      `SELECT DISTINCT store_name AS storeName
       FROM rate_store_completions
       WHERE user_id = ? AND created_at >= ?`,
      [userId, startDate]
    );
    
    // Count products completed per store today
    const [countRows] = await pool.execute(
      `SELECT store_name AS storeName, COUNT(*) as count
       FROM rate_store_completions
       WHERE user_id = ? AND created_at >= ?
       GROUP BY store_name`,
      [userId, startDate]
    );
    
    // A store is "completed" for FREE users if they've done 2 products from it
    const completedStores = countRows
      .filter(row => row.count >= 2)
      .map(row => row.storeName);
    
    return res.json({ completedStores });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur." });
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

// 🔐 CHANGE PASSWORD (user profile)
app.post("/api/profile/change-password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    const userId = req.user.id;

    // Validation
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ message: "Ancien mot de passe, nouveau mot de passe et confirmation sont requis." });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: "Le nouveau mot de passe et la confirmation ne correspondent pas." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Le nouveau mot de passe doit contenir au moins 6 caractères." });
    }

    // Récupérer l'utilisateur pour vérifier l'ancien mot de passe
    const [userRows] = await pool.execute(
      "SELECT password_hash FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    const user = userRows[0];
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: "L'ancien mot de passe est incorrect." });
    }

    // Hacher le nouveau mot de passe
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe
    await pool.execute(
      "UPDATE users SET password_hash = ? WHERE id = ?",
      [newPasswordHash, userId]
    );

    return res.json({ message: "Mot de passe mis à jour avec succès." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur lors de la modification du mot de passe." });
  }
});

app.get(
  "/api/admin/withdrawals",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const allowAll = req.user.role === 'superadmin' && req.query.all === '1';
      let rows;
      if (allowAll) {
        [rows] = await pool.execute(
          `SELECT
            w.id,
            w.user_id AS userId,
            w.amount_cents AS amountCents,
            w.status,
            w.type,
            w.reference,
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
      } else {
        // Filtrer par banque de l'admin si admin_bank_name est défini
        if (req.user.admin_bank_name) {
          [rows] = await pool.execute(
            `SELECT
              w.id,
              w.user_id AS userId,
              w.amount_cents AS amountCents,
              w.status,
              w.type,
              w.reference,
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
             WHERE (w.status = 'PENDING' OR w.processed_by_admin_id = ?)
               AND (b.bank_name = ? OR b.bank_name IS NULL)
             ORDER BY w.created_at DESC`,
            [req.user.id, req.user.admin_bank_name]
          );
        } else {
          // Si pas de banque assignée, voir tous les retraits comme avant
          [rows] = await pool.execute(
            `SELECT
              w.id,
              w.user_id AS userId,
              w.amount_cents AS amountCents,
              w.status,
              w.type,
              w.reference,
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
             WHERE w.status = 'PENDING' OR w.processed_by_admin_id = ?
             ORDER BY w.created_at DESC`,
            [req.user.id]
          );
        }
      }

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
          "UPDATE withdrawals SET status = 'APPROVED', processed_by_admin_id = ? WHERE id = ?",
          [req.user.id, id]
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
        await conn.execute("UPDATE withdrawals SET status = 'REJECTED', processed_by_admin_id = ? WHERE id = ?", [req.user.id, id]);

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
      const allowAll = req.user.role === 'superadmin' && req.query.all === '1';
      let rows;
      if (allowAll) {
        [rows] = await pool.execute(
          `SELECT
            d.id,
            d.user_id AS userId,
            d.amount_cents AS amountCents,
            d.full_name AS depositorFullName,
            d.payer_rib AS payerRib,
            d.screenshot_path AS screenshotPath,
            d.method_id AS methodId,
            d.processed_by_admin_id AS processedByAdminId,
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
      } else {
        // Filtrer par banque de l'admin si admin_bank_name est défini
        if (req.user.admin_bank_name) {
          [rows] = await pool.execute(
            `SELECT
              d.id,
              d.user_id AS userId,
              d.amount_cents AS amountCents,
              d.full_name AS depositorFullName,
              d.payer_rib AS payerRib,
              d.screenshot_path AS screenshotPath,
              d.method_id AS methodId,
              d.processed_by_admin_id AS processedByAdminId,
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
             WHERE (d.processed_by_admin_id = ?
               OR d.method_id IN (
                 SELECT account_id FROM admin_managed_accounts WHERE admin_id = ? AND account_type = 'deposit_method'
               ))
               AND (b.bank_name = ? OR b.bank_name IS NULL)
             ORDER BY d.created_at DESC`,
            [req.user.id, req.user.id, req.user.admin_bank_name]
          );
        } else {
          // Si pas de banque assignée, voir tous les dépôts comme avant
          [rows] = await pool.execute(
            `SELECT
              d.id,
              d.user_id AS userId,
              d.amount_cents AS amountCents,
              d.full_name AS depositorFullName,
              d.payer_rib AS payerRib,
              d.screenshot_path AS screenshotPath,
              d.method_id AS methodId,
              d.processed_by_admin_id AS processedByAdminId,
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
             WHERE d.processed_by_admin_id = ?
               OR d.method_id IN (
                 SELECT account_id FROM admin_managed_accounts WHERE admin_id = ? AND account_type = 'deposit_method'
               )
             ORDER BY d.created_at DESC`,
            [req.user.id, req.user.id]
          );
        }
      }

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
        await conn.execute("UPDATE deposits SET status = 'CONFIRMED', processed_by_admin_id = ? WHERE id = ?", [req.user.id, id]);

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

      await pool.execute("UPDATE deposits SET status = 'REJECTED', processed_by_admin_id = ? WHERE id = ?", [req.user.id, id]);

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
      const allowAll = req.user.role === 'superadmin' && req.query.all === '1';
      const own = !allowAll; // force own unless superadmin explicitly requests all=1

      let rows = [];
      if (kind === "withdrawals" || kind === "all") {
        let wrows;
        if (own) {
          [wrows] = await pool.execute(
            `SELECT
              'WITHDRAW' AS op_type,
              w.id,
              w.user_id AS userId,
              u.email AS userEmail,
              u.full_name AS fullName,
              w.amount_cents AS amountCents,
              w.status,
              w.type,
              w.reference,
              w.created_at AS createdAt,
              b.bank_name AS bankName,
              b.iban AS iban,
              b.holder_name AS holderName
             FROM withdrawals w
             JOIN users u ON w.user_id = u.id
             LEFT JOIN bank_accounts b ON b.user_id = u.id
             WHERE w.status = 'PENDING' OR w.processed_by_admin_id = ?`,
            [req.user.id]
          );
        } else {
          [wrows] = await pool.execute(
            `SELECT
              'WITHDRAW' AS op_type,
              w.id,
              w.user_id AS userId,
              u.email AS userEmail,
              u.full_name AS fullName,
              w.amount_cents AS amountCents,
              w.status,
              w.type,
              w.reference,
              w.created_at AS createdAt,
              b.bank_name AS bankName,
              b.iban AS iban,
              b.holder_name AS holderName
             FROM withdrawals w
             JOIN users u ON w.user_id = u.id
             LEFT JOIN bank_accounts b ON b.user_id = u.id`
          );
        }
        rows = rows.concat(wrows.map(r => ({ kind: 'withdrawal', ...r })));
      }

      if (kind === "deposits" || kind === "all") {
        let drows;
        if (own) {
          [drows] = await pool.execute(
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
             LEFT JOIN deposit_methods dm ON dm.id = d.method_id
             WHERE d.status = 'PENDING' OR d.processed_by_admin_id = ?`,
            [req.user.id]
          );
        } else {
          [drows] = await pool.execute(
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
        }
        rows = rows.concat(drows.map(r => ({ kind: 'deposit', ...r })));
      }

      // Build CSV
      const headers = [
        'opType','id','userId','userEmail','fullName','depositorName','depositorRib','screenshotPath','methodMotif','amountMad','amountCents','status','type','reference','createdAt','bankName','iban','holderName'
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
        r.reference || '',
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

// 👑 ADMIN : synthèse financière (solde utilisateurs + dépôts confirmés - retraits du jour avec -10%)
app.get(
  "/api/admin/finance-summary",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const [balanceRows] = await pool.execute(
        "SELECT COALESCE(SUM(balance_cents), 0) AS totalBalanceCents FROM users"
      );
      const totalBalanceCents =
        (balanceRows && balanceRows[0] && Number(balanceRows[0].totalBalanceCents)) || 0;

      const [depositRows] = await pool.execute(
        `SELECT
           DATE(created_at) AS depositDate,
           COALESCE(SUM(amount_cents), 0) AS totalCents
         FROM deposits
         WHERE status IN ('CONFIRMED', 'APPROVED')
         GROUP BY DATE(created_at)
         ORDER BY depositDate ASC`
      );
      
      let runningTotal = 0;
      const depositsByDay = (depositRows || []).map(row => {
          runningTotal += Number(row.totalCents);
          return {
              ...row,
              runningTotalCents: runningTotal,
          };
      }).reverse();

      const totalDepositsCents = runningTotal;

      const [todayDepositRows] = await pool.execute(
        "SELECT COALESCE(SUM(amount_cents), 0) AS totalDepositsTodayCents FROM deposits WHERE status IN ('CONFIRMED','APPROVED') AND DATE(created_at) = CURDATE()"
      );
      const totalDepositsTodayCents =
        (todayDepositRows && todayDepositRows[0] && Number(todayDepositRows[0].totalDepositsTodayCents)) || 0;

      const [withdrawRows] = await pool.execute(
        `SELECT COALESCE(SUM(amount_cents), 0) AS totalWithdrawalsApprovedTodayCents
           FROM withdrawals
          WHERE type = 'WITHDRAW'
            AND status = 'APPROVED'
            AND DATE(created_at) = CURDATE()`
      );
      const totalWithdrawalsApprovedTodayCents =
        (withdrawRows &&
          withdrawRows[0] &&
          Number(withdrawRows[0].totalWithdrawalsApprovedTodayCents)) ||
        0;

      const withdrawalAfterFeeCents = Math.floor(totalWithdrawalsApprovedTodayCents * 0.9); // -10%
      const netPositionCents =
        totalBalanceCents + totalDepositsCents - withdrawalAfterFeeCents;

      return res.json({
        totalBalanceCents,
        totalDepositsCents,
        depositsByDay,
        totalDepositsTodayCents,
        totalWithdrawalsApprovedTodayCents,
        withdrawalAfterFeeCents,
        feeRate: 0.1,
        netPositionCents,
      });
    } catch (err) {
      console.error("Error in /api/admin/finance-summary:", err);
      return res
        .status(500)
        .json({ message: "Erreur serveur (synthèse financière)." });
    }
  }
);

// 👑 ADMIN : export CSV des opérations du jour (dépôts confirmés/approvés + retraits approuvés)
app.get(
  "/api/admin/finance-export",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      // force own unless superadmin explicitly requests all=1
      const allowAll = req.user.role === 'superadmin' && req.query.all === '1';
      const own = !allowAll;
      const [depRows] = await pool.execute(
        `SELECT
            'DEPOSIT' AS op_type,
            d.id,
            d.user_id AS userId,
            u.email AS userEmail,
            d.amount_cents AS amountCents,
            d.status,
            d.created_at AS createdAt
         FROM deposits d
         JOIN users u ON u.id = d.user_id
        WHERE d.status IN ('CONFIRMED','APPROVED')
          AND DATE(d.created_at) = CURDATE()`
      );
      // If own filter requested, re-run deposits selecting only those pending/processed by this admin
      let finalDepRows = depRows;
      if (own) {
        try {
          const [ownDepRows] = await pool.execute(
            `SELECT
             'DEPOSIT' AS op_type,
             d.id,
             d.user_id AS userId,
             u.email AS userEmail,
             d.amount_cents AS amountCents,
             d.status,
             d.created_at AS createdAt
           FROM deposits d
           JOIN users u ON u.id = d.user_id
           WHERE (d.status = 'PENDING' OR d.processed_by_admin_id = ?)
             AND DATE(d.created_at) = CURDATE()`,
            [req.user.id]
          );
          finalDepRows = ownDepRows || [];
        } catch (e) {
          finalDepRows = [];
        }
      }

      let finalWitRows = [];
      if (own) {
        try {
          const [ownWitRows] = await pool.execute(
            `SELECT
             'WITHDRAW' AS op_type,
             w.id,
             w.user_id AS userId,
             u.email AS userEmail,
             w.amount_cents AS amountCents,
             w.status,
             w.created_at AS createdAt
           FROM withdrawals w
           JOIN users u ON u.id = w.user_id
           WHERE (w.status = 'PENDING' OR w.processed_by_admin_id = ?)
             AND DATE(w.created_at) = CURDATE()`,
            [req.user.id]
          );
          finalWitRows = ownWitRows || [];
        } catch (e) {
          finalWitRows = [];
        }
      } else {
        const [witRows] = await pool.execute(
          `SELECT
              'WITHDRAW' AS op_type,
              w.id,
              w.user_id AS userId,
              u.email AS userEmail,
              w.amount_cents AS amountCents,
              w.status,
              w.created_at AS createdAt
           FROM withdrawals w
           JOIN users u ON u.id = w.user_id
          WHERE w.type = 'WITHDRAW'
            AND w.status = 'APPROVED'
            AND DATE(w.created_at) = CURDATE()`
        );
        finalWitRows = witRows;
      }
      const rows = [...finalDepRows, ...finalWitRows];
      const headers = ["opType", "id", "userId", "userEmail", "amountCents", "amountMad", "status", "createdAt"];
      const escape = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
      const csv = [headers]
        .concat(
          rows.map((r) => [
            r.op_type,
            r.id,
            r.userId,
            r.userEmail || "",
            r.amountCents ?? "",
            r.amountCents != null ? (r.amountCents / 100).toFixed(2) : "",
            r.status || "",
            r.createdAt ? new Date(r.createdAt).toISOString() : "",
          ])
        )
        .map((r) => r.map(escape).join(","))
        .join("\n");

      const filename = `finance-${new Date().toISOString().slice(0, 10)}.csv`;
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (err) {
      console.error("Error in /api/admin/finance-export:", err);
      return res.status(500).json({ message: "Erreur serveur (export finance)." });
    }
  }
);

// Redeem promo code (user) : one time per code, valid 24h after creation
app.post("/api/promo/redeem", authMiddleware, async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code || typeof code !== "string" || code.trim().length < 3) {
      return res.status(400).json({ message: "Code promo invalide." });
    }
    const normalized = code.trim().toUpperCase();

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.execute(
        "SELECT id, amount_cents, used_by_user_id, created_at FROM promo_codes WHERE UPPER(code) = ? FOR UPDATE",
        [normalized]
      );
      if (!rows || rows.length === 0) {
        await conn.rollback();
        return res.status(404).json({ message: "Code promo introuvable." });
      }
      const promo = rows[0];
      const createdAt = new Date(promo.created_at || promo.createdAt || Date.now());
      const oneDayMs = 24 * 60 * 60 * 1000;
      if (Date.now() - createdAt.getTime() > oneDayMs) {
        await conn.rollback();
        return res.status(400).json({ message: "Code expiré (valide 24h après création)." });
      }

      // Vérifier si l'utilisateur a déjà utilisé ce code
      const [usedRows] = await conn.execute(
        "SELECT id FROM promo_code_uses WHERE promo_code_id = ? AND user_id = ? LIMIT 1",
        [promo.id, req.user.id]
      );
      if (usedRows && usedRows.length > 0) {
        await conn.rollback();
        return res.status(400).json({ message: "Tu as déjà utilisé ce code." });
      }

      // Montant aléatoire 1.00 - 2.00 MAD (100-200 cents)
      const awardedCents = 100 + Math.floor(Math.random() * 101);

      // Enregistrer l'utilisation pour ce user
      await conn.execute(
        "INSERT INTO promo_code_uses (promo_code_id, user_id, amount_cents) VALUES (?, ?, ?)",
        [promo.id, req.user.id, awardedCents]
      );
      await conn.execute(
        "UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?",
        [awardedCents, req.user.id]
      );
      await conn.commit();
      return res.json({
        message: "Code appliqué. Montant crédité.",
        added_cents: awardedCents,
      });
    } catch (e) {
      await conn.rollback().catch(() => {});
      throw e;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error("Error redeeming promo code:", err);
    return res.status(500).json({ message: "Erreur serveur (code promo)." });
  }
});

// Helper GET to vérifier disponibilité de l'endpoint (debug)
app.get("/api/promo/redeem", (req, res) => {
  return res
    .status(405)
    .json({ message: "Utilise POST /api/promo/redeem avec { code: \"...\" }" });
});

// 👑 ADMIN : promo codes (génération / listing) — requiert admin + promo_role_enabled = 1
app.get(
  "/api/admin/promo-codes",
  authMiddleware,
  adminMiddleware,
  promoRoleGuard,
  async (req, res) => {
    try {
      const [rows] = await pool.execute(
        `SELECT id, code, amount_cents AS amountCents, created_at AS createdAt, used_by_user_id AS usedByUserId, used_at AS usedAt
         FROM promo_codes
         ORDER BY id DESC
         LIMIT 100`
      );
      return res.json(rows || []);
    } catch (err) {
      console.error("Error fetching promo codes:", err);
      return res.status(500).json({ message: "Erreur serveur (codes promo)." });
    }
  }
);

app.post(
  "/api/admin/promo-codes",
  authMiddleware,
  adminMiddleware,
  promoRoleGuard,
  async (req, res) => {
    try {
      const count = Math.min(Math.max(parseInt(req.body?.count || 1, 10) || 1, 1), 20);
      const generated = [];
      for (let i = 0; i < count; i++) {
        const code = randomPromoCode(10);
        const amountCents = 100 + Math.floor(Math.random() * 100); // 100..199 (1.00 - 1.99 MAD)
        try {
          await pool.execute(
            "INSERT INTO promo_codes (code, amount_cents, created_by_user_id) VALUES (?, ?, ?)",
            [code, amountCents, req.user.id]
          );
          generated.push({ code, amountCents });
        } catch (e) {
          // collision improbable : on ignore et continue
          i--;
          continue;
        }
      }
      return res.json({ message: "Codes générés.", codes: generated });
    } catch (err) {
      console.error("Error creating promo code:", err);
      return res.status(500).json({ message: "Erreur serveur (création code promo)." });
    }
  }
);

// 👑 ADMIN : activer/désactiver le rôle promo pour un compte admin
app.post(
  "/api/admin/users/:id/promo-role",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      await ensurePromoRoleKey();
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "ID invalide." });
      }
      const password = req.body?.password || "";
      if (!password || password.length < 3) {
        return res.status(400).json({ message: "Mot de passe requis." });
      }
      const [rows] = await pool.execute("SELECT secret_hash FROM promo_role_keys WHERE id = 1 LIMIT 1");
      if (!rows || rows.length === 0) {
        return res.status(500).json({ message: "Secret promo non configuré." });
      }
      const bcrypt = require("bcryptjs");
      const ok = await bcrypt.compare(password, rows[0].secret_hash);
      if (!ok) {
        return res.status(403).json({ message: "Mot de passe incorrect." });
      }
      const enabled = req.body?.enabled ? 1 : 0;
      await pool.execute(
        "UPDATE users SET promo_role_enabled = ? WHERE id = ? AND role = 'admin'",
        [enabled, id]
      );
      return res.json({ message: "Rôle promo mis à jour.", promoRoleEnabled: enabled });
    } catch (err) {
      console.error("Error toggling promo role:", err);
      return res.status(500).json({ message: "Erreur serveur (rôle promo)." });
    }
  }
);

// 👑 ADMIN : gestion sécurisée des rôles d'un utilisateur (promotion / démotion)
// Accessible uniquement aux superadmins (exige explicitement role === 'superadmin')
app.post(
  "/api/admin/users/:id/role",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      // Only superadmin may change roles
      if (!req.user || req.user.role !== 'superadmin') {
        return res.status(403).json({ message: 'Accès réservé au superadmin.' });
      }

      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: 'ID invalide.' });
      }

      const newRole = (req.body && String(req.body.role || '').trim()).toLowerCase();
      const allowed = ['user', 'admin', 'superadmin'];
      if (!allowed.includes(newRole)) {
        return res.status(400).json({ message: 'Rôle invalide. Valeurs autorisées: user, admin, superadmin.' });
      }

      // Protect the last remaining superadmin from being demoted
      if (newRole !== 'superadmin') {
        const [existingSuper] = await pool.execute("SELECT COUNT(*) AS cnt FROM users WHERE role = 'superadmin'");
        const superCount = (existingSuper && existingSuper[0] && existingSuper[0].cnt) || 0;
        // if target is currently superadmin and would leave zero superadmins, block
        const [targetRow] = await pool.execute('SELECT role FROM users WHERE id = ? LIMIT 1', [id]);
        const targetRole = targetRow && targetRow[0] ? targetRow[0].role : null;
        if (targetRole === 'superadmin' && superCount <= 1) {
          return res.status(400).json({ message: 'Impossible de rétrograder le dernier superadmin.' });
        }
      }

      // Audit table for role changes
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS role_change_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          target_user_id INT NOT NULL,
          changed_by_user_id INT NOT NULL,
          old_role VARCHAR(50),
          new_role VARCHAR(50),
          reason VARCHAR(255) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Fetch current role
      const [rows] = await pool.execute('SELECT id, role FROM users WHERE id = ? LIMIT 1', [id]);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ message: 'Utilisateur introuvable.' });
      }
      const oldRole = rows[0].role;

      // Update role
      await pool.execute('UPDATE users SET role = ? WHERE id = ?', [newRole, id]);

      // Insert audit log
      const reason = req.body && req.body.reason ? String(req.body.reason).slice(0, 255) : null;
      await pool.execute('INSERT INTO role_change_logs (target_user_id, changed_by_user_id, old_role, new_role, reason) VALUES (?, ?, ?, ?, ?)', [id, req.user.id, oldRole, newRole, reason]);

      // Return updated user row (sanitized)
      const [updatedRows] = await pool.execute('SELECT id, full_name AS fullName, email, role, vip_level AS vipLevel, promo_role_enabled AS promoRoleEnabled FROM users WHERE id = ? LIMIT 1', [id]);
      return res.json({ message: 'Rôle mis à jour.', user: updatedRows[0] || null });
    } catch (err) {
      console.error('Error updating user role:', err);
      return res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du rôle.' });
    }
  }
);

// 👑 SUPERADMIN : liste de tous les utilisateurs (pour gérer les rôles/liens)
app.get(
  "/api/admin/all-users",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'superadmin') {
        return res.status(403).json({ message: 'Accès réservé au superadmin.' });
      }
      const [rows] = await pool.execute(
        'SELECT id, full_name AS fullName, email, role, vip_level AS vipLevel, promo_role_enabled AS promoRoleEnabled, created_at AS createdAt FROM users ORDER BY id DESC LIMIT 500'
      );
      return res.json(rows || []);
    } catch (err) {
      console.error('Error in GET /api/admin/all-users:', err);
      return res.status(500).json({ message: 'Erreur serveur.' });
    }
  }
);

  // 👑 SUPERADMIN : gérer les liaisons admin <-> compte destinataire (deposit_method)
  // Table admin_managed_accounts: admin_id, account_type, account_id
  app.get(
    "/api/admin/managed-accounts",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
      try {
        if (!req.user || req.user.role !== 'superadmin') {
          return res.status(403).json({ message: 'Accès réservé au superadmin.' });
        }

        await pool.execute(`
          CREATE TABLE IF NOT EXISTS admin_managed_accounts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            admin_id INT NOT NULL,
            account_type VARCHAR(100) NOT NULL,
            account_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_admin_account (admin_id, account_type, account_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        const [rows] = await pool.execute(
          `SELECT a.id, a.admin_id AS adminId, a.account_type AS accountType, a.account_id AS accountId, u.email AS adminEmail, a.created_at AS createdAt
           FROM admin_managed_accounts a
           LEFT JOIN users u ON u.id = a.admin_id
           ORDER BY a.created_at DESC`
        );
        return res.json(rows || []);
      } catch (err) {
        console.error('Error in GET /api/admin/managed-accounts:', err);
        return res.status(500).json({ message: 'Erreur serveur.' });
      }
    }
  );

  app.post(
    "/api/admin/managed-accounts",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
      try {
        if (!req.user || req.user.role !== 'superadmin') {
          return res.status(403).json({ message: 'Accès réservé au superadmin.' });
        }

        const adminId = parseInt(req.body && req.body.adminId, 10);
        const accountType = String(req.body && req.body.accountType || '').trim();
        const accountId = parseInt(req.body && req.body.accountId, 10);
        if (!adminId || !accountType || Number.isNaN(accountId)) {
          return res.status(400).json({ message: 'adminId, accountType et accountId sont requis.' });
        }

        await pool.execute(`
          CREATE TABLE IF NOT EXISTS admin_managed_accounts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            admin_id INT NOT NULL,
            account_type VARCHAR(100) NOT NULL,
            account_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_admin_account (admin_id, account_type, account_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Only allow deposit_method mapping for now
        if (accountType !== 'deposit_method') {
          return res.status(400).json({ message: 'accountType non supporté (utilisez "deposit_method").' });
        }

        // ensure admin exists
        const [urows] = await pool.execute('SELECT id FROM users WHERE id = ? LIMIT 1', [adminId]);
        if (!urows || urows.length === 0) return res.status(404).json({ message: 'Admin introuvable.' });

        // ensure deposit method exists
        const [mrows] = await pool.execute('SELECT id FROM deposit_methods WHERE id = ? LIMIT 1', [accountId]);
        if (!mrows || mrows.length === 0) return res.status(404).json({ message: 'Méthode de dépôt introuvable.' });

        await pool.execute('INSERT INTO admin_managed_accounts (admin_id, account_type, account_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE created_at = VALUES(created_at)', [adminId, accountType, accountId]);
        return res.json({ message: 'Liaison créée.' });
      } catch (err) {
        console.error('Error in POST /api/admin/managed-accounts:', err);
        return res.status(500).json({ message: 'Erreur serveur.' });
      }
    }
  );

  app.delete(
    "/api/admin/managed-accounts/:id",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
      try {
        if (!req.user || req.user.role !== 'superadmin') {
          return res.status(403).json({ message: 'Accès réservé au superadmin.' });
        }
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) return res.status(400).json({ message: 'ID invalide.' });
        await pool.execute('DELETE FROM admin_managed_accounts WHERE id = ? LIMIT 1', [id]);
        return res.json({ message: 'Liaison supprimée.' });
      } catch (err) {
        console.error('Error in DELETE /api/admin/managed-accounts/:id:', err);
        return res.status(500).json({ message: 'Erreur serveur.' });
      }
    }
  );

// Shorter alias for superadmin-only role changes (no adminMiddleware)
app.post(
  "/api/superadmin/users/:id/role",
  authMiddleware,
  async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'superadmin') {
        return res.status(403).json({ message: 'Accès réservé au superadmin.' });
      }
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: 'ID invalide.' });
      const newRole = (req.body && String(req.body.role || '').trim()).toLowerCase();
      const allowed = ['user', 'admin', 'superadmin'];
      if (!allowed.includes(newRole)) return res.status(400).json({ message: 'Rôle invalide.' });

      // Protect last superadmin
      if (newRole !== 'superadmin') {
        const [existingSuper] = await pool.execute("SELECT COUNT(*) AS cnt FROM users WHERE role = 'superadmin'");
        const superCount = (existingSuper && existingSuper[0] && existingSuper[0].cnt) || 0;
        const [targetRow] = await pool.execute('SELECT role FROM users WHERE id = ? LIMIT 1', [id]);
        const targetRole = targetRow && targetRow[0] ? targetRow[0].role : null;
        if (targetRole === 'superadmin' && superCount <= 1) {
          return res.status(400).json({ message: 'Impossible de rétrograder le dernier superadmin.' });
        }
      }

      // update and audit
      await pool.execute('UPDATE users SET role = ? WHERE id = ?', [newRole, id]);
      const reason = req.body && req.body.reason ? String(req.body.reason).slice(0,255) : null;
      await pool.execute('INSERT INTO role_change_logs (target_user_id, changed_by_user_id, old_role, new_role, reason) VALUES (?, ?, ?, ?, ?)', [id, req.user.id, null, newRole, reason]);
      const [updatedRows] = await pool.execute('SELECT id, full_name AS fullName, email, role FROM users WHERE id = ? LIMIT 1', [id]);
      return res.json({ message: 'Rôle mis à jour (superadmin alias).', user: updatedRows[0] || null });
    } catch (err) {
      console.error('Error in /api/superadmin/users/:id/role', err);
      return res.status(500).json({ message: 'Erreur serveur.' });
    }
  }
);

// --- Méthode de dépôt (compte destinataire + preuve) ---
// Récupère les méthodes de dépôt actives (destinataire, banque, RIB…)
app.get("/api/deposit-methods", authMiddleware, async (req, res) => {
  try {
    // Si superadmin demande tous les comptes (incluant inactifs)
    const showAll = req.user.role === 'superadmin' && req.query.all === '1';
    
    const query = showAll
      ? `SELECT id, bank_name AS bankName, recipient_name AS recipientName, account_number AS accountNumber, rib, motif, instructions, is_active AS isActive
         FROM deposit_methods
         ORDER BY id ASC`
      : `SELECT id, bank_name AS bankName, recipient_name AS recipientName, account_number AS accountNumber, rib, motif, instructions
         FROM deposit_methods
         WHERE is_active = 1
         ORDER BY id ASC`;
    
    const [rows] = await pool.execute(query);
    return res.json(rows || []);
  } catch (err) {
    console.error("Error fetching deposit methods:", err);
    return res.status(500).json({ message: "Erreur serveur (méthodes de dépôt)." });
  }
});

// Toggle activation d'un compte destinataire (superadmin only)
app.patch(
  "/api/admin/deposit-methods/:id/toggle",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      if (req.user.role !== 'superadmin') {
        return res.status(403).json({ message: 'Accès réservé au superadmin.' });
      }

      const methodId = parseInt(req.params.id, 10);
      if (Number.isNaN(methodId)) {
        return res.status(400).json({ message: 'ID invalide.' });
      }

      // Récupérer le statut actuel
      const [rows] = await pool.execute(
        'SELECT is_active FROM deposit_methods WHERE id = ?',
        [methodId]
      );

      if (!rows || rows.length === 0) {
        return res.status(404).json({ message: 'Compte destinataire non trouvé.' });
      }

      const newStatus = rows[0].is_active === 1 ? 0 : 1;

      await pool.execute(
        'UPDATE deposit_methods SET is_active = ? WHERE id = ?',
        [newStatus, methodId]
      );

      return res.json({ 
        message: newStatus === 1 ? 'Compte activé.' : 'Compte désactivé.',
        isActive: newStatus
      });
    } catch (err) {
      console.error('Error toggling deposit method:', err);
      return res.status(500).json({ message: 'Erreur serveur.' });
    }
  }
);

// Nouvelle route de dépôt avec upload de capture
app.post(
  "/api/wallet/deposit-v2",
  authMiddleware,
  depositUpload.single("screenshot"),
  async (req, res) => {
    try {
      if (!isWithinCashWindow()) {
        return res.status(403).json({ 
          message: windowClosedMessage("Dépôt"),
          timeLimitReached: true,
          operation: "deposit"
        });
      }

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

      // Trouver l'admin responsable de ce compte destinataire (method_id)
      let assignedAdminId = null;
      if (finalMethodId) {
        const [adminRows] = await pool.execute(
          `SELECT admin_id FROM admin_managed_accounts 
           WHERE account_type = 'deposit_method' AND account_id = ? 
           LIMIT 1`,
          [finalMethodId]
        );
        if (adminRows && adminRows.length > 0) {
          assignedAdminId = adminRows[0].admin_id;
        }
      }

      await pool.execute(
        `INSERT INTO deposits (user_id, amount_cents, status, full_name, payer_rib, screenshot_path, method_id, processed_by_admin_id)
         VALUES (?, ?, 'PENDING', ?, ?, ?, ?, ?)`,
        [
          req.user.id,
          Math.round(amountNumber * 100),
          depositorName || null,
          depositorRib || null,
          proofPath,
          finalMethodId,
          assignedAdminId,
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


// =====================
// YOUTUBE LIKES ROUTES
// =====================

// Vérifier si l'utilisateur a déjà liké une vidéo
app.get("/api/youtube/check-like", authMiddleware, async (req, res) => {
  try {
    const { videoUrl } = req.query;
    const userId = req.user.id;

    if (!videoUrl) {
      return res.status(400).json({ message: "URL vidéo manquante." });
    }

    // Créer la table si elle n'existe pas
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS youtube_likes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        video_url VARCHAR(512) NOT NULL,
        liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_video (user_id, video_url),
        INDEX idx_user_likes (user_id),
        INDEX idx_video_url (video_url)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Vérifier si l'utilisateur a déjà liké cette vidéo
    const [rows] = await pool.execute(
      `SELECT id, liked_at FROM youtube_likes WHERE user_id = ? AND video_url = ? LIMIT 1`,
      [userId, videoUrl]
    );

    if (rows && rows.length > 0) {
      return res.json({ hasLiked: true, likedAt: rows[0].liked_at });
    }

    return res.json({ hasLiked: false });
  } catch (err) {
    console.error("Error in /api/youtube/check-like:", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// Enregistrer qu'un utilisateur a liké une vidéo
app.post("/api/youtube/record-like", authMiddleware, async (req, res) => {
  try {
    const { videoUrl } = req.body;
    const userId = req.user.id;

    if (!videoUrl) {
      return res.status(400).json({ message: "URL vidéo manquante." });
    }

    // Créer la table si elle n'existe pas
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS youtube_likes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        video_url VARCHAR(512) NOT NULL,
        liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_video (user_id, video_url),
        INDEX idx_user_likes (user_id),
        INDEX idx_video_url (video_url)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Vérifier si déjà enregistré
    const [existing] = await pool.execute(
      `SELECT id FROM youtube_likes WHERE user_id = ? AND video_url = ? LIMIT 1`,
      [userId, videoUrl]
    );

    if (existing && existing.length > 0) {
      return res.json({ 
        message: "Like déjà enregistré.", 
        alreadyLiked: true 
      });
    }

    // Enregistrer le like
    await pool.execute(
      `INSERT INTO youtube_likes (user_id, video_url) VALUES (?, ?)`,
      [userId, videoUrl]
    );

    return res.json({ 
      message: "Like enregistré avec succès!", 
      success: true 
    });
  } catch (err) {
    console.error("Error in /api/youtube/record-like:", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

// ==================== WEEKLY SPIN WHEEL ====================

// Ensure spin_wheel_history table exists
async function ensureSpinWheelTable() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS spin_wheel_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      spin_week_start DATE NOT NULL,
      result VARCHAR(50) NOT NULL,
      reward_cents INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_week (user_id, spin_week_start)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✓ Table spin_wheel_history vérifiée/créée');
}
ensureSpinWheelTable().catch(console.error);

// Get the Monday of current week (for GMT+1)
function getMondayOfWeek() {
  const now = new Date(Date.now() + 1 * 60 * 60 * 1000); // GMT+1
  const day = now.getUTCDay();
  const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  const monday = new Date(now.setUTCDate(diff));
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

// Check if today is Monday (GMT+1)
function isMondayGMT1() {
  const now = new Date(Date.now() + 1 * 60 * 60 * 1000); // GMT+1
  return now.getUTCDay() === 1; // 1 = Monday
}

// Check if user can spin this week
app.get('/api/spin-wheel/can-spin', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const mondayOfWeek = getMondayOfWeek();
    const mondayStr = mondayOfWeek.toISOString().split('T')[0];
    const isMonday = isMondayGMT1();
    
    let alreadySpun = false;
    
    try {
      // Check if already spun this week
      const [rows] = await pool.execute(
        'SELECT id, result, reward_cents FROM spin_wheel_history WHERE user_id = ? AND spin_week_start = ? LIMIT 1',
        [userId, mondayStr]
      );
      alreadySpun = rows.length > 0;
    } catch (dbErr) {
      // Table might not exist yet, treat as not spun
      console.log('Spin wheel table might not exist:', dbErr.message);
      alreadySpun = false;
    }
    
    // Always show popup for all users, but indicate if can actually spin
    return res.json({ 
      showPopup: !alreadySpun, // Show popup if haven't spun this week
      canSpin: isMonday && !alreadySpun, // Can only spin on Monday and if not already spun
      isMonday,
      alreadySpun,
      message: alreadySpun 
        ? 'Vous avez déjà tourné la roue cette semaine!'
        : (!isMonday ? 'Revenez lundi pour tourner la roue!' : null)
    });
  } catch (err) {
    console.error('Error in /api/spin-wheel/can-spin:', err);
    // On error, still show popup
    return res.json({ showPopup: true, canSpin: false, message: 'Revenez lundi!' });
  }
});

// Process spin result
app.post('/api/spin-wheel/spin', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const mondayOfWeek = getMondayOfWeek();
    const mondayStr = mondayOfWeek.toISOString().split('T')[0];
    
    // Check if it's Monday
    if (!isMondayGMT1()) {
      return res.status(403).json({ message: 'La roue est disponible uniquement le lundi!' });
    }
    
    // Check if already spun this week
    const [existing] = await pool.execute(
      'SELECT id FROM spin_wheel_history WHERE user_id = ? AND spin_week_start = ? LIMIT 1',
      [userId, mondayStr]
    );
    
    if (existing.length > 0) {
      return res.status(403).json({ message: 'Vous avez déjà tourné la roue cette semaine!' });
    }
    
    // Determine result - ONLY "Oops" (60%) or "7 MAD" (40%)
    // The wheel shows 500 MAD and 100 MAD but they NEVER win
    const random = Math.random();
    let result;
    let rewardCents = 0;
    
    if (random < 0.6) {
      // 60% chance: Oops
      result = 'oops';
      rewardCents = 0;
    } else {
      // 40% chance: 7 MAD
      result = '7mad';
      rewardCents = 700;
    }
    
    // Start transaction
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      
      // Record spin
      await conn.execute(
        'INSERT INTO spin_wheel_history (user_id, spin_week_start, result, reward_cents) VALUES (?, ?, ?, ?)',
        [userId, mondayStr, result, rewardCents]
      );
      
      let newBalance = null;
      
      // If won 7 MAD, add to balance
      if (rewardCents > 0) {
        const [userRows] = await conn.execute(
          'SELECT balance_cents FROM users WHERE id = ? FOR UPDATE',
          [userId]
        );
        if (userRows.length > 0) {
          newBalance = userRows[0].balance_cents + rewardCents;
          await conn.execute(
            'UPDATE users SET balance_cents = ? WHERE id = ?',
            [newBalance, userId]
          );
        }
      }
      
      await conn.commit();
      
      // Return which slice to land on (for visual)
      // Wheel slices: 0=Oops, 1=7MAD, 2=Oops, 3=100MAD, 4=Oops, 5=500MAD, 6=7MAD
      let sliceIndex;
      if (result === 'oops') {
        // Pick random Oops slice (0, 2, or 4)
        const oopsSlices = [0, 2, 4];
        sliceIndex = oopsSlices[Math.floor(Math.random() * oopsSlices.length)];
      } else {
        // Pick random 7 MAD slice (1 or 6)
        const madSlices = [1, 6];
        sliceIndex = madSlices[Math.floor(Math.random() * madSlices.length)];
      }
      
      return res.json({
        success: true,
        result,
        rewardCents,
        sliceIndex,
        newBalance
      });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Error in /api/spin-wheel/spin:', err);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Lancer le serveur
app.listen(PORT, () => {
  console.log(`API en écoute sur http://localhost:${PORT}`);
  console.log("Admin:", "admin@promo.ma / Admin123!");
});
