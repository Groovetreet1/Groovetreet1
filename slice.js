const fs = require("fs");
const file = "frontend/src/pages/DashboardPage.jsx";
const start = parseInt(process.argv[2], 10);
const end = parseInt(process.argv[3], 10);
const lines = fs.readFileSync(file, "utf8").split(/\n/);
for (let i = start - 1; i < end && i < lines.length; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
