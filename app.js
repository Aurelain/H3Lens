const fs = require('fs-extra');
const buffer = require('buffer');
const path = require('path');
const extractAssets = require('./lod/extractAssets');
const parseAssets = require('./lod/parseAssets');
const markAssets = require('./lod/markAssets');
const injectAssets = require('./lod/injectAssets');
const PALETTE = require('./lod/PALETTE');
const rgbToDec = require('./utils/rgbToDec');
const show = require('./utils/show');

const SOURCE_DIR = "D:\\H3_ALL_Freeze\\HoMM 3 Complete\\Data";
const DESTINATION_DIR = 'assets';
const GAME_DATA_DIR = "D:\\H3\\HoMM 3 Complete\\Data";



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
    const assetPaths = {};
    const lods = fs.readdirSync(SOURCE_DIR).filter(name => path.extname(name).toLowerCase() === '.lod');
    for (const lod of lods) {
        parseAssets(path.join(SOURCE_DIR, lod), db, hashes, assetPaths);
    }

    console.log(db);
    console.log(hashes);
    console.log(assetPaths);
    // markAssets(db);

    for (const {rgba, w, h} of db) {
        // show(rgba, w, h, 1);
    }

    const gameLods = fs.readdirSync(GAME_DATA_DIR).filter(name => path.extname(name).toLowerCase() === '.lod');
    for (const lod of gameLods) {
        injectAssets(path.join(GAME_DATA_DIR, lod), db, assetPaths);
    }


};

window.addEventListener('load', () => {
    console.time('run');
    run();
    console.timeEnd('run');
});

