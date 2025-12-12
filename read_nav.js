const fs = require("fs");
const lines = fs.readFileSync("frontend/src/pages/DashboardPage.jsx", "utf8").split(/\r?\n/);
const idx = lines.findIndex((l) => l.includes("menuLanguage"));
for (let i = idx - 20; i < idx + 40; i++) {
  if (lines[i] !== undefined) {
    console.log(`${i + 1}:${lines[i]}`);
  }
}
