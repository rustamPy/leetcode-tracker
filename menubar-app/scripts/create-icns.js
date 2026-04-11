'use strict';
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const assetsDir = path.join(__dirname, '..', 'assets');
const sourcePng = path.join(assetsDir, 'icon-source.png');
const icnsOut = path.join(assetsDir, 'icon.icns');

if (!fs.existsSync(sourcePng)) {
    console.error(`ERROR: ${sourcePng} not found — add a 1024×1024 PNG as assets/icon-source.png`);
    process.exit(1);
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lc-icns-'));

const iconsetDir = path.join(tmpDir, 'icon.iconset');
fs.mkdirSync(iconsetDir);

const SIZES = [16, 32, 64, 128, 256, 512, 1024];
for (const sz of SIZES) {
    execSync(`sips -z ${sz} ${sz} "${sourcePng}" --out "${path.join(iconsetDir, `icon_${sz}x${sz}.png`)}" --setProperty format png`, { stdio: 'pipe' });
    if (sz * 2 <= 1024) {
        execSync(`sips -z ${sz * 2} ${sz * 2} "${sourcePng}" --out "${path.join(iconsetDir, `icon_${sz}x${sz}@2x.png`)}" --setProperty format png`, { stdio: 'pipe' });
    }
}

execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsOut}"`, { stdio: 'pipe' });

execSync(`sips -z 22 22 "${sourcePng}" --out "${path.join(assetsDir, 'tray-icon.png')}" --setProperty format png`, { stdio: 'pipe' });
execSync(`sips -z 44 44 "${sourcePng}" --out "${path.join(assetsDir, 'tray-icon@2x.png')}" --setProperty format png`, { stdio: 'pipe' });

fs.rmSync(tmpDir, { recursive: true, force: true });

console.log(`✓ icon.icns  (${(fs.statSync(icnsOut).size / 1024).toFixed(0)} KB)`);
console.log(`✓ tray-icon.png  (22×22)`);
console.log(`✓ tray-icon@2x.png  (44×44)`);
