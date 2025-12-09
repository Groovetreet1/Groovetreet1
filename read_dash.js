const fs = require('fs');
const file = process.env.FILE || 'frontend/src/pages/DashboardPage.jsx';
const lines = fs.readFileSync(file,'utf8').split(/\r?\n/);

const search = process.env.SEARCH;
if (search) {
  lines.forEach((line, idx) => {
    if (line.includes(search)) {
      console.log(String(idx + 1).padStart(4, '0') + ': ' + line);
    }
  });
  process.exit(0);
}

const start = Number(process.env.START || 1110);
const end = Number(process.env.END || 1160);
for (let i = start; i <= end && i < lines.length; i++) {
  console.log(String(i + 1).padStart(4, '0') + ': ' + lines[i]);
}
