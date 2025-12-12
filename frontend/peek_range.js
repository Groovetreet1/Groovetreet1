const fs = require("fs");
const [startArg, endArg] = process.argv.slice(2);
const start = Number(startArg || 1);
const end = Number(endArg || start + 100);
const lines = fs.readFileSync("src/pages/DashboardPage.jsx", "utf8").split(/\r?\n/);
for (let i = Math.max(0, start - 1); i < Math.min(lines.length, end); i++) {
  console.log(`${String(i + 1).padStart(4, "0")}:${lines[i]}`);
}
