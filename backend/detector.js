const fs = require("fs");

function detectLanguage(repoPath) {
  try {
    const files = fs.readdirSync(repoPath);

    if (files.includes("package.json")) return "node";
    if (files.includes("requirements.txt")) return "python";
    if (files.includes("go.mod")) return "go";
    if (files.includes("Gemfile")) return "ruby";

    return "unknown";
  } catch (err) {
    return "unknown";
  }
}

module.exports = { detectLanguage };
