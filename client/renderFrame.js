const {SNAP, ENCODING, W, H} = require('../utils/COMMON');
const SIGNATURE_WHITE_THRESHOLD = 249;
const SIGNATURE_BLACK_THRESHOLD = 8;


/**
 *
 */
const renderFrame = (rgba, db) => {
    console.time('renderFrame');
    const used = new Uint8Array(W * H * 4);
    const unrecognized = new Uint8ClampedArray(W * H * 4);
    const elections = {};

    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const marker = readMarker(rgba, db, used, x, y);
            if (marker) {
                consumeArea(used, x, y, 4, 4);
                const fingerprint = marker.x + '_' + marker.y;
                const election = elections[fingerprint];
                if (!election) {
                    elections[fingerprint] = {[marker.index]: {marker, votes:1}};
                } else {
                    const candidate = election[marker.index];
                    if (!candidate) {
                        election[marker.index] = {marker, votes:1};
                    } else {
                        candidate.votes++;
                    }
                }
            } else {

            }
        }
    }
    console.timeEnd('renderFrame');
    console.log(elections);
    // for (const key in candidates) {
    //     const pojo = candidates[key];
    //     const {votes, dbItem, originX, originY} = pojo;
    //     if (votes > 200) {
    //         const {rgba, w, h} = dbItem;
    //         context2.putImageData(new ImageData(rgba, w, h), originX, originY);
    //     }
    // }
};

/**
 *
 */
const readMarker = (rgba, db, used, x, y) => {
    if (x > W - 4) return;
    if (y > H - 4) return;

    let p = y * W * 4 + x * 4;
    for (let i = 0; i < 3; i++) {
        if (used[p]) return;
        if (rgba[p++] < SIGNATURE_WHITE_THRESHOLD) return;
        if (rgba[p++] < SIGNATURE_WHITE_THRESHOLD) return;
        if (rgba[p++] < SIGNATURE_WHITE_THRESHOLD) return;
        p++; // skip alpha
    }

    if (used[p]) return;
    if (rgba[p++] > SIGNATURE_BLACK_THRESHOLD) return;
    if (rgba[p++] > SIGNATURE_BLACK_THRESHOLD) return;
    if (rgba[p] > SIGNATURE_BLACK_THRESHOLD) return;

    const limits = [db.length, W, H];
    const numbers = [];
    for (let i = 0; i < 3; i++) {
        p = (y + 1 + i) * W * 4 + x * 4;

        if (used[p]) return;
        const n1 = SNAP[rgba[p++]];
        p += 3; // skip the remaining g+b+a

        if (used[p]) return;
        const n2 = SNAP[rgba[p++]];
        p += 3; // skip the remaining g+b+a

        if (used[p]) return;
        const n3 = SNAP[rgba[p++]];
        p += 3; // skip the remaining g+b+a

        if (used[p]) return;
        const n4 = SNAP[rgba[p]];

        const nr = Number('0x' + ENCODING[n1] + ENCODING[n2] + ENCODING[n3] + ENCODING[n4]);
        if (isNaN(nr) || nr < 0 || nr >= limits[i]) return;
        numbers[i] = nr;
    }

    return {
        index: numbers[0],
        x: x - numbers[1],
        y: y - numbers[2],
    };
};

/**
 *
 */
const consumeArea = (used, x, y, w, h) => {
    for (let iy = 0; iy < h; iy++) {
        for (let ix = 0; ix < w; ix++) {
            const i = (y + iy) * W * 4 + (x + ix) * 4;
            used[i] = 1;
        }
    }
};


module.exports = renderFrame;