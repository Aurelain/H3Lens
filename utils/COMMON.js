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

module.exports = {
    W: 800,
    H: 600,
    SNAP,
    ENCODING,
};