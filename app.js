const fs = require('fs-extra');
const buffer = require('buffer');
const path = require('path');
const extractAssets = require('./lod/extractAssets');
const parseAssets = require('./lod/parseAssets');
const PALETTE = require('./lod/PALETTE');
const rgbToDec = require('./utils/rgbToDec');

const SOURCE_DIR = "D:\\H3\\HoMM 3 Complete\\Data";
const DESTINATION_DIR = 'assets';

const SAMPLE_SIZE = 21;


/*
const runExtractAssets = () => {
    fs.emptyDirSync(DESTINATION_DIR); // also creates the dir if it's missing
    const lods = fs.readdirSync(SOURCE_DIR).filter(name => path.extname(name).toLowerCase() === '.lod');

    for (const lod of lods) {
        // if (lod !== 'H3ab_spr.lod') continue;
        // if (lod !== 'H3bitmap.lod') continue;
        extractAssets(path.join(SOURCE_DIR, lod), DESTINATION_DIR);
    }
};
*/

const run = () => {
    // const blob = Buffer.alloc(buffer.constants.MAX_LENGTH); // TODO: 2 600 000 * 8 * 10
    // const db = new Uint16Array(16777215);
    const db = [];
    const lods = fs.readdirSync(SOURCE_DIR).filter(name => path.extname(name).toLowerCase() === '.lod');
    for (const lod of lods) {
        // if (lod !== 'H3ab_spr.lod') continue;
        // if (lod !== 'H3bitmap.lod') continue;
        parseAssets(path.join(SOURCE_DIR, lod), db);
    }

    /*
    let sampleCount = 0;
    for (const item of db) {
        const {rgba, w, h, name} = item;
        const len = rgba.length;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = y * w * 4 + x * 4;
                let isValid = true;
                for (let ys = y; ys < y + SAMPLE_SIZE; ys++) {
                    if (isValid) {
                        for (let xs = x; xs < x + SAMPLE_SIZE; xs++) {
                            const j = ys * w * 4 + xs * 4;
                            const n = rgbToDec(rgba[j], rgba[j + 1], rgba[j + 2]);
                            if (PALETTE[n]) {
                                isValid = false;
                                break;
                            }
                        }
                    }
                }
                if (isValid) {
                    sampleCount++;
                }
            }
        }
    }
    console.log('sampleCount', sampleCount);
    */

    /*
    const colors = new Uint16Array(16777215);
    let count = 0;
    for (const item of db) {
        const {rgba, w, h, name} = item;
        const len = rgba.length;
        for (let i = 0; i < len; i += 4) {
            const n = rgbToDec(rgba[i], rgba[i + 1], rgba[i + 2]);
            if (!PALETTE[n]) {
                colors[n]++;
            }
        }
    }

    const lengths = [];
    const len = colors.length;
    let mostPopularColorOccurrences = 0;
    let mostPopularColorCode = 0;
    for (let color = 0; color < len; color++) {
        const occurrences = colors[color];
        if (occurrences > mostPopularColorOccurrences) {
            mostPopularColorOccurrences = occurrences;
            mostPopularColorCode = color;
        }
        lengths[occurrences] = lengths[occurrences] || 0;
        lengths[occurrences]++;
    }
    console.log('mostPopularColorCode', mostPopularColorCode);
    console.log('mostPopularColorOccurrences', mostPopularColorOccurrences);
    console.log('lengths', lengths);
    */
};


console.time('run');
run();
console.timeEnd('run');

