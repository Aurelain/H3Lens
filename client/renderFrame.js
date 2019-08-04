const {SNAP, DECODING, W, H, MARKER} = require('../utils/COMMON');
const SIGNATURE_WHITE_THRESHOLD = 240;
const SIGNATURE_BLACK_THRESHOLD = 8;
const MAX_VOTES = 100;


/**
 *
 */
const renderFrame = (rgba, db, context) => {
    const unrecognized = new Uint8ClampedArray(W * H * 4);
    const elections = {};
    const consumed = new Uint8Array(W * H);

    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            if (!consumed[y * W + x]) {
                const marker = readMarker(rgba, db, x, y);
                if (marker) {
                    const {index, ox, oy} = marker;
                    const fingerprint = ox + '_' + oy;
                    const election = elections[fingerprint] || (elections[fingerprint] = {});
                    const candidate = election[index] || (election[index] = {votes: 0, list: []});
                    candidate.votes++;
                    candidate.list.push(marker);
                    consumeArea(consumed, x, y, 4, 4);
                    x += MARKER - 1; // skip the remaining pixels in the first line of the marker
                    // TODO: see if we can also skip MARKER_SIZE in the following lines
                } else {

                }
            }
        }
    }

    let winners = [];
    for (const fingerprint in elections) {
        const election = elections[fingerprint];
        let bestList;
        let maxVotes = -1;
        for (const candidateIndex in election) {
            const {votes, list} = election[candidateIndex];
            if (votes > maxVotes) {
                maxVotes = votes;
                bestList = list;
            }
        }
        if (maxVotes < 3) {
            continue;
        }
        const {index, ox, oy} = bestList[0];
        const dbItem = db[index];
        const {w, h} = dbItem;
        winners.push({
            dbItem,
            L: ox,
            R: ox + w,
            T: oy,
            B: oy + h,
            markers: bestList,
            i: winners.length,
            elevation: 0,
        });
        // if (dbItem.path.match(/TGRB002.PCX/)) {
        //     console.log(winners.length - 1);
        // }
    }

    // winners = [winners[48], winners[49]];
    // winners = [winners[24], winners[32]];
    // winners = [winners[24], winners[3], winners[4], winners[5], winners[6], winners[19], winners[23]];
    // winners = [winners[23], winners[40]];
    // console.log(winners);
    // winners.sort(sorter);

    computeElevations(winners);
    winners.sort(sortByElevation);
    // console.log(winners);

    for (const {dbItem, w, h, T, L} of winners) {
        const {rgba, bmp, w, h} = dbItem;
        context.drawImage(bmp, L, T);
    }
};

/**
 *
 */
const readMarker = (rgba, db, x, y) => {
    if (x > W - MARKER) return;
    if (y > H - MARKER) return;

    let p = y * W * 4 + x * 4;
    for (let i = 0; i < 2; i++) {
        if (rgba[p++] < SIGNATURE_WHITE_THRESHOLD) return;
        if (rgba[p++] < SIGNATURE_WHITE_THRESHOLD) return;
        if (rgba[p++] < SIGNATURE_WHITE_THRESHOLD) return;
        p++; // skip alpha
    }

    const n1 = DECODING[SNAP[rgba[p]]];

    p = (y + 1) * W * 4 + x * 4; // next line

    const n2 = DECODING[SNAP[rgba[p++]]];
    p += 3; // skip the remaining g+b+a

    const n3 = DECODING[SNAP[rgba[p++]]];
    p += 3; // skip the remaining g+b+a

    const n = parseInt(n1 + n2 + n3, 32);

    if (isNaN(n) || n < 0 || n >= db.length) return;

    const left1 = DECODING[SNAP[rgba[p]]];

    p = (y + 2) * W * 4 + x * 4; // next line

    const left2 = DECODING[SNAP[rgba[p++]]];
    p += 3; // skip the remaining g+b+a

    const left = parseInt([left1,left2].join(''), 32);

    if (isNaN(left) || left < 0 || left >= 800) return;

    const top1 = DECODING[SNAP[rgba[p++]]];
    p += 3; // skip the remaining g+b+a

    const top2 = DECODING[SNAP[rgba[p++]]];

    const top = parseInt(top1 + top2 + '', 32);

    if (isNaN(top) || top < 0 || top >= 600) return;


    return {
        index: n,
        ox: x - left,
        oy: y - top,
        x,
        y,
    };
};

/**
 *
 */
const consumeArea = (consumed, x, y, w, h) => {
    for (let iy = 0; iy < h; iy++) {
        for (let ix = 0; ix < w; ix++) {
            const i = (y + iy) * W + (x + ix);
            consumed[i] = 1;
        }
    }
};

/**
 *
 */
const isObscuring = (a, b, L, R, T, B) => {
    // console.log('----------------');
    // console.log({a, b, L, R, T, B});
    const {markers} = a;
    const bw = b.dbItem.w;
    const bRgba = b.dbItem.rgba;
    let obscuredCount = 0;
    for (const {x, y} of markers) {
        if (x > L && x < R && y > T && y < B) {
            const bx = x - b.L;
            const by = y - b.T;
            const i = by * bw * 4 + bx * 4;
            const alpha = bRgba[i + 3];
            // console.log({bx, by, alpha});
            if (alpha === 255) {
                obscuredCount++;
            }
        }
    }
    return obscuredCount;
};

/**
 *
 */
const computeElevations = (list) => {
    const len = list.length;
    for (let i = 0; i < len; i++) {
        for (let k = i + 1; k < len; k++) {
            const a = list[i];
            const b = list[k];

            const pathA = a.dbItem.path + `(${a.i})`;
            const pathB = b.dbItem.path + `(${b.i})`;
            const isInterestingA = pathA.match(/AVGGRM15.PCX/);
            const isInterestingB = pathB.match(/AVGGRM15.PCX/);
            const isInteresting = isInterestingA || isInterestingB;
            if (isInteresting) {
                // console.log('===============');
                // console.log(pathA + ' vs ' + pathB);
            }

            const L = Math.max(a.L, b.L);
            const R = Math.min(a.R, b.R);
            if (L >= R) {
                if (isInteresting) {
                    // console.log('not intersected');
                }
                continue;
            }
            const T = Math.max(a.T, b.T);
            const B = Math.min(a.B, b.B);
            if (T >= B) {
                if (isInteresting) {
                    // console.log('not intersected');
                }
                continue;
            }

            const obscuredByA = isObscuring(a, b, L, R, T, B);
            const obscuredByB = isObscuring(b, a, L, R, T, B);
            if (!obscuredByA && !obscuredByB) {
                continue;
            }
            const level = (obscuredByA > obscuredByB) ? 1 : -1;
            a.elevation += level;
            b.elevation += level * -1;

            if (isInteresting) {
                console.log('===============');
                if (isInterestingA) {
                    console.log(pathA, 'vs', pathB);
                    console.log(level === 1 ? 'MASTER' : 'slave');
                    console.log('elevation', a.elevation);
                    console.log('score', obscuredByA + ':' + obscuredByB);
                } else {
                    console.log(pathB, 'vs', pathA);
                    console.log(level === 1 ? 'slave' : 'MASTER');
                    console.log('elevation', b.elevation);
                    console.log('score', obscuredByB + ':' + obscuredByA);
                }
            }
        }
    }
};

/**
 *
 */
const sortByElevation = (a, b) => a.elevation - b.elevation;

renderFrame.readMarker = readMarker;
module.exports = renderFrame;