const rgbToDec = require('../utils/rgbToDec');

//======================================================================================================================
/*
Calculated values for integers in the range [0-255] to snap to the closest Gray32 value.
Sample:
[
 0: 0, 1: 0, 2: 0, 3: 0, 4: 0,
 5: 8, 6: 8, 7: 8, 8: 8, 9: 8, 10: 8, 11: 8, 12: 8,
 13: 16, 14: 16, 15: 16, 16: 16, 17: 16, 18: 16, 19: 16, 20: 16,
 21: 24, 22: 24, 23: 24, 24: 24, 25: 24, 26: 24, 27: 24, 28: 24,
 ...
 237: 240, 238: 240, 239: 240, 240: 240, 241: 240, 242: 240, 243: 240, 244: 240,
 245: 248, 246: 248, 247: 248, 248: 248, 249: 248, 250: 248, 251: 248, 252: 248,
 253: 248, 254: 248, 255: 248
]
 */
const SNAP = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
    const floored = Math.floor(i / 8);
    const min = 8 * floored;
    const max = 8 * (floored + 1);
    SNAP[i] = (i - min > max - i) ? max : min;
}
SNAP[253] = 248;
SNAP[254] = 248;
SNAP[255] = 248;


//======================================================================================================================
/*
Calculated values for the conversion from Base32 to Gray32.
Sample:
{
    '0': Buffer.from([0, 0, 0]),
    '1': Buffer.from([8, 8, 8]),
    '2': Buffer.from([16, 16, 16]),
    ...
    't': Buffer.from([232, 232, 232]),
    'u': Buffer.from([240, 240, 240]),
    'v': Buffer.from([248, 248, 248]),
};
 */
const ENCODING = {};
for (let i = 0; i < 32; i++) {
    const snapped = SNAP[i * 8];
    ENCODING[i.toString(32)] = Buffer.from([snapped, snapped, snapped]);
}
// console.log(ENCODING);


//======================================================================================================================
/*
Calculated values for the conversion from Gray32 to Base32.
Alternative to `Math.floor(n/8).toString(32)`.
Sample:
{
    0: '0',
    8: '1',
    16: '2',
    ...
    232: 't',
    240: 'u',
    248: 'v',
};
 */
const DECODING = {};
for (let i = 0; i < 32; i++) {
    const snapped = SNAP[i * 8];
    DECODING[snapped] = i.toString(32);
}


//======================================================================================================================
const ALPHAS = {
    [rgbToDec(0, 255, 255)]: Buffer.from([0, 0, 255, 0]),       // 100% - transparency
    [rgbToDec(255, 150, 255)]: Buffer.from([0, 0, 0, 32]),      //  75% - shadow border,
    [rgbToDec(255, 100, 255)]: Buffer.from([0, 0, 0, 64]),      //      - find exact value
    [rgbToDec(255, 50, 255)]: Buffer.from([0, 0, 0, 128]),     //      - for transparency
    [rgbToDec(255, 0, 255)]: Buffer.from([0, 0, 0, 128]),     //  50% - shadow body
    [rgbToDec(180, 0, 255)]: Buffer.from([0, 0, 0, 128]),     //  50% - shadow body   below selection
    [rgbToDec(0, 255, 0)]: Buffer.from([0, 0, 0, 64]),      //  75% - shadow border below selection
};


//======================================================================================================================
module.exports = {
    W: 800,
    H: 600,
    SNAP,
    ENCODING,
    DECODING,
    ALPHAS,
    MARKER: 3,
    YELLOW: 0xffff00,
};