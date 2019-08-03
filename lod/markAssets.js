const rgbToDec = require('../utils/rgbToDec');
const {YELLOW} = require('../utils/COMMON');

const MARKER_SIZE = 4;
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
 *
 */
const addMarker = (x, y, rgba, used, w, imageIndex) => {
    const grayscaleIndex = convertNumberToGrayscale(imageIndex);
    const grayscaleX = convertNumberToGrayscale(x);
    const grayscaleY = convertNumberToGrayscale(y);
    const payload = [
        255,                // 0  = 0x0 = marker signature
        255,                // 1  = 0x1 = marker signature
        255,                // 2  = 0x2 = marker signature
        0,                  // 3  = 0x3 = marker signature
        grayscaleIndex[0],  // 4  = 1x0 = image index
        grayscaleIndex[1],  // 5  = 1x1 = image index
        grayscaleIndex[2],  // 6  = 1x2 = image index
        grayscaleIndex[3],  // 7  = 1x3 = image index
        grayscaleX[0],      // 8  = 2x0 = x
        grayscaleX[1],      // 9  = 2x1 = x
        grayscaleX[2],      // 10 = 2x2 = x
        grayscaleX[3],      // 11 = 2x3 = x
        grayscaleY[0],      // 12 = 3x0 = y
        grayscaleY[1],      // 13 = 3x1 = y
        grayscaleY[2],      // 14 = 3x2 = y
        grayscaleY[3],      // 15 = 3x3 = y
    ];
    for (let ys = y; ys < y + MARKER_SIZE; ys++) {
        for (let xs = x; xs < x + MARKER_SIZE; xs++) {
            const j = ys * w * 4 + xs * 4;
            const code = payload.shift();
            rgba.fill(code, j, j + 3);
            used[ys * w + xs] = 1; // also mark it as used
        }
    }
};

/**
 * We store each number as a sequence of 4 hex gray codes (spread as far away as possible from each other).
 * E.g. 7583 => 0x1D9F => 0x10, 0xD0, 0x90, 0xF0
 */
const convertNumberToGrayscale = (n) => {
    const buf = Buffer.alloc(4);
    buf.writeInt16BE(n, 0);
    const firstByte = buf[0];
    const lastByte = buf[1];
    buf[0] = (firstByte >> 4) << 4;
    buf[1] = (firstByte & 0xf) << 4;
    buf[2] = (lastByte >> 4) << 4;
    buf[3] = (lastByte & 0xf) << 4;
    return buf;
};

module.exports = markAssets;