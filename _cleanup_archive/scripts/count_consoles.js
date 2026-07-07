const fs = require('fs');
const path = require('path');

function countConsoles(dir) {
  let counts = {};
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!['node_modules', '.next', 'out', 'build', '_cleanup_archive', '.git', 'public', 'graphify-out'].includes(file)) {
        Object.assign(counts, countConsoles(fullPath));
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const logMatches = (content.match(/console\.log\(/g) || []).length;
      const warnMatches = (content.match(/console\.warn\(/g) || []).length;
      const errorMatches = (content.match(/console\.error\(/g) || []).length;
      const total = logMatches + warnMatches + errorMatches;
      if (total > 0) {
        counts[fullPath] = { log: logMatches, warn: warnMatches, error: errorMatches, total };
      }
    }
  }
  return counts;
}

const counts = countConsoles(path.join(__dirname, '..', '..', 'src'));
console.log("### Console calls per file in src/\n");
console.log("| File | Total | `console.log` | `console.warn` | `console.error` |");
console.log("|---|---|---|---|---|");
for (const [file, count] of Object.entries(counts).sort((a, b) => b[1].total - a[1].total)) {
  const relPath = path.relative(path.join(__dirname, '..', '..'), file).replace(/\\/g, '/');
  console.log(`| ${relPath} | ${count.total} | ${count.log} | ${count.warn} | ${count.error} |`);
}
