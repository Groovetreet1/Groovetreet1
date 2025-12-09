const fs = require("fs");
const file = process.argv[2];
const term = process.argv[3];
const lines = fs.readFileSync(file, "utf8").split(/\n/);
lines.forEach((line, idx) => {
  if (line.includes(term)) {
    console.log(`${idx + 1}:${line}`);
  }
});
