'use strict';
// Generates 22×22 (and 44×44 @2x) tray icon PNGs — classic flame with inner cutout.
// No external dependencies, only Node built-ins.
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

/* ── Minimal PNG encoder ─────────────────────────────────────────────────── */
function encodePNG(size, rgba) {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        table[i] = c;
    }
    function crc32(buf) {
        let crc = 0xFFFFFFFF;
        for (const b of buf) crc = table[(crc ^ b) & 0xFF] ^ (crc >>> 8);
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }
    function u32(n) { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; }
    function chunk(type, data) {
        const t = Buffer.from(type, 'ascii');
        return Buffer.concat([u32(data.length), t, data, u32(crc32(Buffer.concat([t, data])))]);
    }

    const ihdr = Buffer.concat([u32(size), u32(size), Buffer.from([8, 6, 0, 0, 0])]);
    const scanlines = Buffer.alloc(size * (1 + size * 4));
    for (let y = 0; y < size; y++) {
        scanlines[y * (1 + size * 4)] = 0; // filter=None
        rgba.copy(scanlines, y * (1 + size * 4) + 1, y * size * 4, (y + 1) * size * 4);
    }

    return Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        chunk('IHDR', ihdr),
        chunk('IDAT', zlib.deflateSync(scanlines)),
        chunk('IEND', Buffer.alloc(0)),
    ]);
}

/* ── Point-in-polygon (ray-casting) ──────────────────────────────────────── */
function inPoly(verts, px, py) {
    let inside = false;
    for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
        const xi = verts[i][0], yi = verts[i][1];
        const xj = verts[j][0], yj = verts[j][1];
        if (((yi > py) !== (yj > py)) &&
            (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }
    return inside;
}

/* ── Cubic Bezier sampler ─────────────────────────────────────────────────── */
function bezier(p0, p1, p2, p3, n = 60) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
        const t = i / n, u = 1 - t;
        pts.push([
            u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
            u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
        ]);
    }
    return pts;
}

/* ── Draw flame at given pixel size ─────────────────────────────────────── */
function drawIcon(sz) {
    const px = Buffer.alloc(sz * sz * 4, 0);  // all transparent
    const s = sz / 22;
    const cx = sz / 2;

    // ── Outer flame silhouette ──────────────────────────────────────────
    // Starts at the sharp top tip, sweeps left, forms left lobe, rounds the
    // base, forms right lobe, returns to tip.
    const outer = [
        // Tip → left shoulder
        ...bezier([cx, 0.8 * s], [cx - 2.5 * s, 3 * s], [cx - 5 * s, 6 * s], [cx - 4.5 * s, 10 * s]),
        // Left lobe outer arc (widest left point ~13s down)
        ...bezier([cx - 4.5 * s, 10 * s], [cx - 7.5 * s, 12.5 * s], [cx - 6.5 * s, 17 * s], [cx - 3.2 * s, 19.5 * s]),
        // Base curve left → right
        ...bezier([cx - 3.2 * s, 19.5 * s], [cx - 1 * s, 22 * s], [cx + 1 * s, 22 * s], [cx + 3.2 * s, 19.5 * s]),
        // Right lobe outer arc
        ...bezier([cx + 3.2 * s, 19.5 * s], [cx + 6.5 * s, 17 * s], [cx + 7.5 * s, 12.5 * s], [cx + 4.5 * s, 10 * s]),
        // Right shoulder → tip
        ...bezier([cx + 4.5 * s, 10 * s], [cx + 5 * s, 6 * s], [cx + 2.5 * s, 3 * s], [cx, 0.8 * s]),
    ];

    // ── Inner hollow (teardrop cutout near the bottom) ──────────────────
    // Gives the flame the classic "burning" look.
    const inner = [
        // Inner tip pointing up
        ...bezier([cx, 7.5 * s], [cx - 1.8 * s, 10 * s], [cx - 2.8 * s, 14 * s], [cx - 1.5 * s, 17.5 * s]),
        // Inner base curve
        ...bezier([cx - 1.5 * s, 17.5 * s], [cx - 0.5 * s, 19.5 * s], [cx + 0.5 * s, 19.5 * s], [cx + 1.5 * s, 17.5 * s]),
        // Right side back to inner tip
        ...bezier([cx + 1.5 * s, 17.5 * s], [cx + 2.8 * s, 14 * s], [cx + 1.8 * s, 10 * s], [cx, 7.5 * s]),
    ];

    // ── 2×2 super-sampled scan-line fill ────────────────────────────────
    for (let y = 0; y < sz; y++) {
        for (let x = 0; x < sz; x++) {
            let covered = 0;
            for (const ox of [0.25, 0.75]) {
                for (const oy of [0.25, 0.75]) {
                    const fx = x + ox, fy = y + oy;
                    if (inPoly(outer, fx, fy) && !inPoly(inner, fx, fy)) covered++;
                }
            }
            if (covered > 0) {
                const i = (y * sz + x) * 4;
                // RGB stays 0 (black) — macOS template image colouring handles the rest
                px[i + 3] = Math.round(covered / 4 * 255);
            }
        }
    }

    return encodePNG(sz, px);
}

/* ── Write files ─────────────────────────────────────────────────────────── */
const dest = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

fs.writeFileSync(path.join(dest, 'tray-icon.png'), drawIcon(22));
fs.writeFileSync(path.join(dest, 'tray-icon@2x.png'), drawIcon(44));
console.log('✓ Flame tray icons written to assets/');
