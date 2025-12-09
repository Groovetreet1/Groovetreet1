const fs = require("fs");
const terms = process.argv.slice(2);
const data = fs.readFileSync("frontend/src/pages/DashboardPage.jsx", "utf8").split(/\n/);
terms.forEach((term) => {
  console.log("\n-- " + term + " --");
  data.forEach((line, idx) => {
    if (line.includes(term)) {
      console.log(`${idx + 1}: ${line}`);
    }
  });
});
