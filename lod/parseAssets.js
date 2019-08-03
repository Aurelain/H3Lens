/*
This is a fork of `extractAssets()`, intended to optimize the pixel analysis:
    - ignores special colors
    - does not produce valid rgba arrays
    - hashes bitmaps to avoid dupes
    - ignores solid mono-color bitmaps

*/

const fs = require('fs');
const zlib = require('zlib');
const md5 = require('js-md5');
const PALETTE = require('./PALETTE');
const {ALPHAS} = require('../utils/COMMON');

/**
 *
 * @param lodPath
 * @param db
 * @param hashes
 * @param assetPaths
 */
const parseAssets = (lodPath, db, hashes, assetPaths) => {
    const lodName = lodPath.match(/(\w+)\.\w+$/)[1];
    const f = fs.readFileSync(lodPath);
    const itemsCount = f.readUInt32LE(8);
    let p = 92; // the records always start at 0x5C

    let list = [];
    for (let i = 0; i < itemsCount; i++) {
        const item = {};

        item.assetName = clean(f.slice(p, p + 12).toString());
        p += 12;

        p += 4; // skip 4 unknown bytes

        item.begin = f.readUInt32LE(p);
        p += 4;

        item.usize = f.readUInt32LE(p);
        p += 4;

        p += 4; // skip 4 unknown bytes

        item.csize = f.readUInt32LE(p);
        p += 4;

        list.push(item);
    }
    for (const {assetName, begin, csize, usize} of list) {
        // if (assetName !== "GAMSELBK.PCX") continue;      // main menu background bitmap, no palette
        // if (assetName !== "HPL000KN.PCX") continue;      // orrin portrait bitmap, with palette
        // if (assetName !== "MMENUHS.DEF") continue;       // main menu high scores
        // if (assetName !== "MMENUQT.DEF") continue;
        // if (assetName !== "SGTWMTA.DEF") continue;       // old format
        // if (assetName !== "COHDEM45.PCX") continue;
        // if (assetName !== "HPS001PL.PCX") continue;      // with palette
        // if (assetName !== "AVGPIXIE.DEF") continue;
        // if (assetName !== "GRASTL.DEF") continue;        // format 0, grass
        // if (assetName !== "DIALGBOX.DEF") continue;      // format 1, dialog box
        // if (assetName !== "COBBRD.DEF") continue;        // format 2, a road
        // if (assetName !== "AH06_E.DEF") continue;        // format 3, a hero
        // if (assetName !== "MUPOPUP.PCX") continue;       // multi-player
        // if (assetName !== "AVMGOGR0.DEF") continue;      // gold mine, with yellow flag
        // if (assetName === "CMNUMWIN.PCX") continue;      // hit-points label gets colorized by the game

        if (assetName.match(/\.PCX$|\.DEF$/)) {
            let itemBuffer;
            if (csize) {
                const zipBuffer = f.slice(begin, begin + csize);
                itemBuffer = zlib.unzipSync(zipBuffer);
            } else {
                itemBuffer = f.slice(begin, begin + usize);
            }
            if (assetName.match(/PCX$/)) {
                // continue;
                const size = itemBuffer.readUInt32LE(0);
                const w = itemBuffer.readUInt32LE(4);
                const h = itemBuffer.readUInt32LE(8);
                const hasPalette = Boolean(size === w * h);
                let rgba;
                if (hasPalette) {
                    rgba = parsePcxWithPalette(itemBuffer, w, h);
                } else if (size === w * h * 3) {
                    const bgrBuffer = itemBuffer.slice(12);
                    rgba = convertBgrToRgba(bgrBuffer);
                }
                keep(rgba, w, h, lodName, assetName, hasPalette, db, hashes, assetPaths);
            } else { // DEF
                parseDef(itemBuffer, lodName, assetName, db, hashes, assetPaths);
            }
        }
    }
};

/**
 *
 */
const parsePcxWithPalette = (buffer, w, h) => {
    const len = w * h;
    const paletteOffset = 12 + len;
    const palette = [];
    const uniqueColorsMap = {};
    for (let i = 0; i < 256; i++) {
        const offset = paletteOffset + i * 3;
        const r = buffer.readUInt8(offset);
        const g = buffer.readUInt8(offset + 1);
        const b = buffer.readUInt8(offset + 2);
        palette[i] = {r, g, b};
        const n = rgbToDec(r, g, b);
        if (n && !PALETTE[n]) {
            uniqueColorsMap[n] = true;
        }
    }
    if (Object.keys(uniqueColorsMap).length <= 1) {
        return null; // Refuse mono-color bitmaps because they're usually too thin or useless
    }
    const pixels = buffer.slice(12, paletteOffset);
    const rgba = new Uint8ClampedArray(w * h * 4);
    let j = 0;
    for (let i = 0; i < len; i++) {
        const colorIndex = pixels.readUInt8(i);
        putPixelFromPalette(rgba, j, palette, colorIndex);
        j += 4;
    }
    return rgba;
};

/**
 * https://github.com/vcmi/vcmi/blob/develop/client/gui/CAnimation.cpp
 */
const parseDef = (f, lodName, assetName, db, hashes, assetPaths) => {
    let p = 12; // skip type, width and height

    const groupsCount = f.readUInt32LE(p);
    p += 4;

    const palette = [];
    for (let i = 0; i < 256; i++) {
        palette[i] = {
            r: f.readUInt8(p),
            g: f.readUInt8(p + 1),
            b: f.readUInt8(p + 2)
        };
        p += 3;
    }

    const sprites = [];
    for (let i = 0; i < groupsCount; i++) {
        p += 4; // skip group id

        const spritesCount = f.readUInt32LE(p);
        p += 4;

        p += 8; // skip 8 unknown bytes

        const names = [];
        for (let j = 0; j < spritesCount; j++) {
            const name = f.slice(p, p + 13).toString();
            p += 13;
            names.push(clean(name));
        }
        for (let j = 0; j < spritesCount; j++) {
            sprites.push({
                frameName: names[j],
                offset: f.readUInt32LE(p),
            });
            p += 4;
        }
    }
    const usedNames = {};
    for (const {frameName, offset} of sprites) {
        if (usedNames[frameName]) {
            continue; // Assumption: a frame named exactly like a previous frame is identical and we can skip it.
        }

        usedNames[frameName] = true;
        p = offset;
        p += 4; // skip size
        const format = f.readUInt32LE(p);
        const fullWidth = f.readUInt32LE(p + 4);
        const fullHeight = f.readUInt32LE(p + 8);
        let width = f.readUInt32LE(p + 12);
        let height = f.readUInt32LE(p + 16);
        // The following 8 bytes are leftMargin and topMargin, but we're not using those.

        // fs.writeFileSync(path.join(DESTINATION_DIR, name), b.buffer.slice(offset, offset + size));
        // console.log(JSON.stringify({name, offset, size, format, fullWidth, fullHeight, width, height},null,4));

        // special case for some "old" format defs (SGTWMTA.DEF and SGTWMTB.DEF)
        let tempOffset = 32;
        if (format === 1 && width > fullWidth && height > fullHeight) {
            width = fullWidth;
            height = fullHeight;
            tempOffset -= 16;
        }
        const baseOffset = tempOffset;

        let j = 0;
        const rgba = new Uint8ClampedArray(width * height * 4);
        switch (format) {
            case 0: // pixel data is not compressed, copy data to surface
                p = offset + baseOffset;
                for (let i = 0; i < height; i++) {
                    for (let x = 0; x < width; x++) {
                        const colorIndex = f.readUInt8(p++);
                        putPixelFromPalette(rgba, j, palette, colorIndex);
                        j += 4;
                    }
                }
                break;
            case 1: // for each line we have offset of pixel data
                for (let i = 0; i < height; i++) {
                    p = offset + baseOffset + 4 * i;
                    const lineOffset = f.readUInt32LE(p);
                    p = offset + baseOffset + lineOffset;
                    let totalRowLength = 0;
                    while (totalRowLength < width) {
                        const code = f.readUInt8(p++);
                        const length = f.readUInt8(p++) + 1;
                        if (code === 255) {// Raw data
                            const sequence = f.slice(p, p + length);
                            p += length;
                            for (const colorIndex of sequence) {
                                putPixelFromPalette(rgba, j, palette, colorIndex);
                                j += 4;
                            }
                        } else { // RLE
                            for (let i = 0; i < length; i++) {
                                putPixelFromPalette(rgba, j, palette, code);
                                j += 4;
                            }
                        }
                        totalRowLength += length;
                    }
                }
                break;
            case 2:
            case 3:
                if (format === 2) {
                    p = offset + baseOffset + f.readUInt16LE(offset + baseOffset);
                }
                for (let i = 0; i < height; i++) {
                    if (format === 3) {
                        p = offset + baseOffset + i * 2 * (width / 32);
                        p = offset + baseOffset + f.readUInt16LE(p);
                    }
                    let totalRowLength = 0;
                    while (totalRowLength < width) {
                        const segment = f.readUInt8(p++);
                        const code = Math.floor(segment / 32);
                        const length = (segment & 31) + 1;
                        if (code === 7) {// Raw data
                            const sequence = f.slice(p, p + length);
                            p += length;
                            for (const colorIndex of sequence) {
                                putPixelFromPalette(rgba, j, palette, colorIndex);
                                j += 4;
                            }
                        } else { // RLE
                            for (let i = 0; i < length; i++) {
                                putPixelFromPalette(rgba, j, palette, code);
                                j += 4;
                            }
                        }
                        totalRowLength += length;
                    }
                }
                break;
            default:
                console.log('Unknown format!', format);
                break;
        }
        keep(rgba, width, height, lodName, assetName, frameName, db, hashes, assetPaths);
        // return;
    }
};

const clean = (s) => {
    return s.replace(/[^a-zA-Z0-9_.][\s\S]*/g, '').toUpperCase();
};

const convertBgrToRgba = (rgbBuffer) => {
    const len = rgbBuffer.length;
    const rgba = new Uint8ClampedArray(len * 4 / 3);
    let j = 0;
    for (let i = 0; i < len; i += 3) {
        rgba[j++] = rgbBuffer[i + 2];
        rgba[j++] = rgbBuffer[i + 1];
        rgba[j++] = rgbBuffer[i];
        rgba[j++] = 255;
    }
    return rgba;
};

/**
 *
 */
const keep = (rgba, w, h, lodName, assetName, frameName, db, hashes, assetPaths) => {
    if (rgba) {
        const hash = md5(rgba);
        let index;
        if (hash in hashes) {
            index = hashes[hash];
        } else {
            db.push({rgba, w, h, lodName, assetName, frameName, hash});
            index = db.length - 1;
            hashes[hash] = index;
        }
        const assetPath = lodName + '/' + assetName;
        if (typeof frameName === 'string') { // string => def
            if (!assetPaths[assetPath]) {
                assetPaths[assetPath] = {};
            }
            assetPaths[assetPath][frameName] = db[index];
        } else { // boolean => bitmap
            assetPaths[assetPath] = db[index];
        }
    }
};

/**
 *
 */
const putPixelFromPalette = (rgba, offset, palette, colorIndex) => {
    const {r, g, b} = palette[colorIndex];
    const alphaPixel = ALPHAS[rgbToDec(r, g, b)];
    if (alphaPixel) {
        rgba.set(alphaPixel, offset);
    } else {
        rgba[offset] = r;
        rgba[offset + 1] = g;
        rgba[offset + 2] = b;
        rgba[offset + 3] = 255;
    }
};


module.exports = parseAssets;