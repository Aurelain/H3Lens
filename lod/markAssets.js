/*

*/
const rgbToDec = require('../utils/rgbToDec');
const PALETTE = require('./PALETTE');

const MARKER_SIZE = 4;

/**
 *
 * @param db
 */
const markAssets = (db) => {
    for (let i = 0; i < db.length; i++) {
        const {rgba, w, h} = db[i];
        // console.log(db[i].suffix, db[i].name);
        addMarkers(rgba, w, h, i);
        // require('../utils/show')(rgba, w, h, 5);
    }
};

/**
 *
 */
const addMarkers = (rgba,  w, h, imageIndex) => {
    const used = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = y * w * 4 + x * 4;
            if (used[i]) {
                x += MARKER_SIZE - 1;
                continue;
            }
            let isValid = true;
            if (y + MARKER_SIZE > h || x + MARKER_SIZE > w) {
                isValid = false;
            } else {
                for (let ys = y; ys < y + MARKER_SIZE; ys++) {
                    if (isValid) {
                        for (let xs = x; xs < x + MARKER_SIZE; xs++) {
                            const j = ys * w * 4 + xs * 4;
                            const n = rgbToDec(rgba[j], rgba[j + 1], rgba[j + 2]);
                            if (PALETTE[n] || used[j]) {
                                isValid = false;
                                break;
                            }
                        }
                    }
                }
            }
            // console.log(`${x}x${y} isValid: ${isValid}`);
            if (!isValid) {
                const n = rgbToDec(rgba[i], rgba[i + 1], rgba[i + 2]);
                if (n !== 0xffff00) { // protect yellow
                    rgba[i] = 0;
                    rgba[i + 1] = 255;
                    rgba[i + 2] = 255;
                }
            } else {
                addMarker(rgba, x, y, w, i, imageIndex, used);
                x += MARKER_SIZE - 1;
            }
        }
    }
};

/**
 *
 */
const addMarker = (rgba, x, y, w, i, imageIndex, used) => {
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
    let p = 0;
    for (let ys = y; ys < y + MARKER_SIZE; ys++) {
        for (let xs = x; xs < x + MARKER_SIZE; xs++) {
            const j = ys * w * 4 + xs * 4;
            const code = payload[p++];
            rgba[j] = code;
            rgba[j + 1] = code; // p === 1 ? 0 :
            rgba[j + 2] = code;
            used[j] = true;
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