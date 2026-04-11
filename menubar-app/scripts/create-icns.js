'use strict';
// Generates assets/icon.icns from the flame PNG using macOS built-in tools.
// Requires: sips, iconutil (both pre-installed on macOS).
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const assetsDir = path.join(__dirname, '..', 'assets');
const sourcePng = path.join(assetsDir, 'tray-icon@2x.png');   // 44×44 flame PNG
const icnsOut = path.join(assetsDir, 'icon.icns');

if (!fs.existsSync(sourcePng)) {
    console.error(`ERROR: ${sourcePng} not found — run "npm run setup" first.`);
    process.exit(1);
}

// ── Build a 1024×1024 base PNG by upscaling the 44px source via sips ──────
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lc-icns-'));
const base1024 = path.join(tmpDir, 'icon_1024.png');

execSync(`sips -z 1024 1024 "${sourcePng}" --out "${base1024}" --setProperty format png`, { stdio: 'pipe' });

// ── Required iconset sizes ─────────────────────────────────────────────────
const SIZES = [16, 32, 64, 128, 256, 512, 1024];

const iconsetDir = path.join(tmpDir, 'icon.iconset');
fs.mkdirSync(iconsetDir);

for (const sz of SIZES) {
    const name1x = `icon_${sz}x${sz}.png`;
    const name2x = `icon_${sz}x${sz}@2x.png`;   // = sz*2 actual pixels

    execSync(`sips -z ${sz} ${sz} "${base1024}" --out "${path.join(iconsetDir, name1x)}" --setProperty format png`, { stdio: 'pipe' });
    if (sz * 2 <= 1024) {
        execSync(`sips -z ${sz * 2} ${sz * 2} "${base1024}" --out "${path.join(iconsetDir, name2x)}" --setProperty format png`, { stdio: 'pipe' });
    }
}

// ── Convert iconset → .icns ────────────────────────────────────────────────
execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsOut}"`, { stdio: 'pipe' });

// ── Cleanup ────────────────────────────────────────────────────────────────
fs.rmSync(tmpDir, { recursive: true, force: true });

console.log(`✓ icon.icns written to assets/  (${(fs.statSync(icnsOut).size / 1024).toFixed(0)} KB)`);
