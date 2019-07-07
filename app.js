const fs = require('fs-extra');
const buffer = require('buffer');
const path = require('path');
const extractAssets = require('./lod/extractAssets');
const parseAssets = require('./lod/parseAssets');
const markAssets = require('./lod/markAssets');
const PALETTE = require('./lod/PALETTE');
const rgbToDec = require('./utils/rgbToDec');
const show = require('./utils/show');

const SOURCE_DIR = "D:\\H3_ALL_Freeze\\HoMM 3 Complete\\Data";
const DESTINATION_DIR = 'assets';



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
    const db = [];
    const hashes = {};
    const lods = fs.readdirSync(SOURCE_DIR).filter(name => path.extname(name).toLowerCase() === '.lod');
    for (const lod of lods) {
        // if (lod !== 'H3ab_bmp.lod') continue;
        // if (lod !== 'H3bitmap.lod') continue;
        // if (lod !== 'H3ab_spr.lod') continue;
        // if (lod !== 'H3sprite.lod') continue;
        parseAssets(path.join(SOURCE_DIR, lod), db, hashes);
    }

    markAssets(db);

};

window.addEventListener('load', () => {
    console.time('run');
    run();
    console.timeEnd('run');
});

