const fs = require("fs");
const lines = fs.readFileSync("server.js", "utf8").split(/\r?\n/);
const markers = ["return res.json({ user, token });", "req.user = {", "const safeUser =", "const user = {"];
lines.forEach((line, idx) => {
  if (markers.some((m) => line.includes(m))) {
    console.log("\n---- marker near line", idx + 1);
    for (let i = Math.max(0, idx - 5); i < Math.min(lines.length, idx + 25); i++) {
      console.log(`${String(i + 1).padStart(4, "0")}: ${lines[i]}`);
    }
  }
});
