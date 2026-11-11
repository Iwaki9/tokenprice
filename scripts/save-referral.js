// Append collected referral links for later upload to providers.json.
const fs = require("fs");
const f = __dirname + "/referrals-collected.json";
const data = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {};
data[process.argv[2]] = process.argv[3];
fs.writeFileSync(f, JSON.stringify(data, null, 2) + "\n");
console.log(JSON.stringify(data));
