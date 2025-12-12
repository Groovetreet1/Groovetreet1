const fs = require("fs");
const lines = fs.readFileSync("frontend/src/pages/DashboardPage.jsx", "utf8").split(/\r?\n/);
const idx = lines.findIndex((l) => l.includes("Ta session a expir"));
for (let i = idx - 5; i < idx + 15; i++) {
  if (lines[i] !== undefined) {
    console.log(`${i + 1}:${lines[i]}`);
  }
}
