const rgbToDec = require('../utils/rgbToDec');

const SNAP = new Uint8ClampedArray(256);
for (let i = 0; i < 256; i++) {
    const floored = Math.floor(i / 16);
    const min = 16 * floored;
    const max = 16 * (floored + 1);
    SNAP[i] = (i - min > max - i) ? max : min;
}

const ENCODING = {};
for (let i = 0; i < 16; i++) {
    ENCODING[i * 16] = Number(i * 16).toString(16).charAt(0);
}

const ALPHAS = {
    [rgbToDec(0, 255, 255)]:    Buffer.from([0, 0, 255, 0]),       // 100% - transparency
    [rgbToDec(255, 150, 255)]:  Buffer.from([0, 0, 0, 32]),      //  75% - shadow border,
    [rgbToDec(255, 100, 255)]:  Buffer.from([0, 0, 0, 64]),      //      - find exact value
    [rgbToDec(255, 50, 255)]:   Buffer.from([0, 0, 0, 128]),     //      - for transparency
    [rgbToDec(255, 0, 255)]:    Buffer.from([0, 0, 0, 128]),     //  50% - shadow body
    [rgbToDec(180, 0, 255)]:    Buffer.from([0, 0, 0, 128]),     //  50% - shadow body   below selection
    [rgbToDec(0, 255, 0)]:      Buffer.from([0, 0, 0, 64]),      //  75% - shadow border below selection
};

module.exports = {
    W: 800,
    H: 600,
    SNAP,
    ENCODING,
    ALPHAS,
    YELLOW: 0xffff00,
};