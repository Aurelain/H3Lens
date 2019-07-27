/*

*/
const fs = require('fs');

/**
 *
 * @param db
 * @param destination
 */
const cacheAssets = (db, destination) => {
    let size = 2;                   // count
    for (const item of db) {
        size += 4;                   // bytes length size
        size += 2;                   // width
        size += 2;                   // height
        size += item.rgba.length;    // bytes
    }
    const b = Buffer.alloc(size);
    let p = 0;

    b.writeUInt16LE(db.length, p);
    p += 2;

    for (const {rgba, w, h} of db) {

        const len = rgba.length;

        b.writeUInt32LE(len, p);
        p += 4;

        b.writeUInt16LE(w, p);
        p += 2;

        b.writeUInt16LE(h, p);
        p += 2;

        b.fill(rgba, p, p + len);
        p += len;
    }

    fs.writeFileSync(destination, b);
};

module.exports = cacheAssets;