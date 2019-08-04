const fs = require('fs-extra');
const buffer = require('buffer');
const path = require('path');
const extractAssets = require('./lod/extractAssets');
const parseAssets = require('./lod/parseAssets');
const markAssets = require('./lod/markAssets');
const injectAssets = require('./lod/injectAssets');
const cacheAssets = require('./lod/cacheAssets');
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
    const lods = [];

    for (const fileName of fs.readdirSync(SOURCE_DIR)) {
        if (path.extname(fileName).toLowerCase() === '.lod') {
            lods.push({
                lodPath: path.join(SOURCE_DIR, fileName),
                lodName: fileName,
            });
        }
    }

    for (const {lodPath} of lods) {
        parseAssets(lodPath, db, hashes, assetPaths);
    }
    show(db[0].rgba, db[0].w, db[0].h, 10);

    cacheAssets(db, path.join(GAME_DATA_DIR, 'db.cache'));

    markAssets(db);
    show(db[0].rgba, db[0].w, db[0].h, 10);

    for (const {lodName, lodPath} of lods) {
        const loxPath = path.join(GAME_DATA_DIR, lodName.replace(/\.lod$/, '.lox'));
        fs.copyFileSync(lodPath, loxPath);
        injectAssets(loxPath, db, assetPaths);
    }


};

window.addEventListener('load', () => {
    console.time('run');
    run();
    console.timeEnd('run');
});

