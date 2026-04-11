'use strict';
// Copies data files from frontend/src/data/ into menubar-app/data/
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', '..', 'frontend', 'src', 'data');
const DEST = path.join(__dirname, '..', 'data');
const FILES = ['companyData.json', 'problemsData.json', 'userData.json'];

if (!fs.existsSync(DEST)) fs.mkdirSync(DEST, { recursive: true });

let ok = 0;
for (const f of FILES) {
    const src = path.join(SRC, f);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(DEST, f));
        console.log(`  ✓  ${f}  (${(fs.statSync(src).size / 1024).toFixed(0)} KB)`);
        ok++;
    } else {
        console.warn(`  ⚠  ${f} not found at ${src}`);
    }
}
console.log(`\nDone — ${ok}/${FILES.length} files synced to data/`);
