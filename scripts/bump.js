const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      processDir(full);
    } else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
      let content = fs.readFileSync(full, 'utf8');
      let changed = false;
      content = content.replace(/text-\[([0-9]+)px\]/g, (match, p1) => {
        changed = true;
        return `text-[${parseInt(p1) + 2}px]`;
      });
      if (changed) {
        fs.writeFileSync(full, content);
        console.log(`Bumped: ${full}`);
      }
    }
  }
}
processDir('./src');
console.log('Done bumping fonts!');
