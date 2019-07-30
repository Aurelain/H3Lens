/*

*/
const fs = require('fs');

/**
 *
 * @param db
 * @param cachePath
 */
const readCache = (db, cachePath) => {
    const f = fs.readFileSync(cachePath);
    let p = 0;

    const count = f.readUInt16LE(p);
    p += 2;

    for (let i = 0; i < count; i++) {

        const len = f.readUInt32LE(p);
        p += 4;

        const w = f.readUInt16LE(p);
        p += 2;

        const h = f.readUInt16LE(p);
        p += 2;

        const path = f.slice(p, p + 34).toString();
        p += 34;

        const rgba = new Uint8ClampedArray(f.slice(p, p + len));
        p += len;

        db.push({rgba, w, h, path});
    }
    return db;
};

module.exports = readCache;