const rgbToDec = require('../utils/rgbToDec');
const {YELLOW, ENCODING} = require('../utils/COMMON');

const MARKER_SIZE = 3;
const CYAN_PIXEL = Buffer.from([0,255,255,255]);
const BLACK_PIXEL = Buffer.from([0,0,0,255]);

/**
 *
 */
const markAssets = (db) => {
    for (let i = 0; i < db.length; i++) {
        const {rgba, w, h} = db[i];
        addMarkers(rgba, w, h, i);
    }
};

/**
 *
 */
const addMarkers = (rgba, w, h, imageIndex) => {
    const used = new Uint8Array(w * h); // a mask that describes the marked zone with 0 and 1
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const u = y * w + x;
            if (used[u]) {
                x += MARKER_SIZE - 1;
                continue;
            }
            if (canPlaceMarker(x, y, rgba, used, w, h)) {
                addMarker(x, y, rgba, used, w, imageIndex);
                x += MARKER_SIZE - 1;
            } else {
                const i = y * w * 4 + x * 4;
                const alpha = rgba[i + 3];
                if (alpha === 255) { // solid color
                    const nr = rgbToDec(rgba[i], rgba[i + 1], rgba[i + 2]);
                    if (nr !== YELLOW) {
                        rgba.set(BLACK_PIXEL, i);
                    }
                } else {
                    rgba.set(CYAN_PIXEL, i);
                }
            }
        }
    }
};

/**
 *
 */
const canPlaceMarker = (x, y, rgba, used, w, h) => {
    if (x > w - MARKER_SIZE) return; // insufficient width
    if (y > h - MARKER_SIZE) return; // insufficient height
    for (let ys = y; ys < y + MARKER_SIZE; ys++) {
        for (let xs = x; xs < x + MARKER_SIZE; xs++) {
            if (used[ys * w + xs]) return; // already used
            const j = ys * w * 4 + xs * 4;
            const alpha = rgba[j + 3];
            if (alpha !== 255) return; // only solid pixels should be marked
            const nr = rgbToDec(rgba[j], rgba[j + 1], rgba[j + 2]);
            if (nr === YELLOW) return; // yellow must not be marked because the game uses it for flag colors
        }
    }
    return true;
};

/**
 * We store each number as a sequence of gray shades (spread as far away as possible from each other).
 * We're using 32 possible shades, therefore we're working in base32.
 * E.g. 7583 => 7cv => 56, 96, 248
 */
const addMarker = (x, y, rgba, used, w, imageIndex) => {
    const grayscaleN = imageIndex.toString(32).padStart(3, '0'); // needs 3 slots, because 32*32*32=32768 > 29000
    const grayscaleX = x.toString(32).padStart(2, '0'); // needs 2 slots, because 32*32=1024 > 800
    const grayscaleY = y.toString(32).padStart(2, '0'); // needs 2 slots, because 32*32=1024 > 600
    const payload = [
        [255, 255, 255],                // 1 = 0x0 = signature
        [255, 255, 255],                // 2 = 0x1 = signature
        ENCODING[grayscaleN[0]],        // 3 = 0x2 = image index in db
        ENCODING[grayscaleN[1]],        // 4 = 1x0 = image index in db
        ENCODING[grayscaleN[2]],        // 5 = 1x1 = image index in db
        ENCODING[grayscaleX[0]],        // 6 = 1x2 = left
        ENCODING[grayscaleX[1]],        // 7 = 2x1 = left
        ENCODING[grayscaleY[0]],        // 8 = 2x2 = top
        ENCODING[grayscaleY[1]],        // 9 = 2x3 = top
    ];
    let p = 0;
    for (let ys = y; ys < y + MARKER_SIZE; ys++) {
        for (let xs = x; xs < x + MARKER_SIZE; xs++) {
            const j = ys * w * 4 + xs * 4;
            rgba.set(payload[p++], j);
            used[ys * w + xs] = 1; // also mark it as used
        }
    }
};

module.exports = markAssets;