const fs = require('fs');
const zlib = require('zlib');
const rgbToDec = require('../utils/rgbToDec');
const show = require('../utils/show');
const {ENCODING} = require('../utils/COMMON');

const customPalette = buildCustomPalette();
const customPaletteMap = buildPaletteMap(customPalette);
const encoders = {
    '0': encodeRgbaToFormat0,
    '1': encodeRgbaToFormat1,
    '2': encodeRgbaToFormat2,
    '3': encodeRgbaToFormat3,
};

/**
 *
 * @param lodPath
 * @param db
 * @param assetPaths
 */
const injectAssets = (lodPath, db, assetPaths) => {
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
    let deltaSize = 0;
    let hasChanged = false;
    for (const item of list) {
        const {assetName, begin, csize, usize} = item;
        const size = csize || usize;
        const assetPath = lodName + '/' + assetName;
        const dbItem = assetPaths[assetPath]; // undefined, dbItem or array of dbItem
        if (dbItem) {
            const indexes = assetPaths[assetPath];
            hasChanged = true;
            if (assetName.match(/PCX$/)) {
                if (dbItem.frameName) {
                    item.buffer = createBitmapWithPalette(dbItem);
                } else {
                    item.buffer = createSimpleBitmap(dbItem);
                }
            } else {
                let buffer = f.slice(begin, begin + size);
                if (csize) {
                    buffer = zlib.unzipSync(buffer);
                }
                const defModel = reinterpretDef(buffer);
                item.buffer = createDef(dbItem, defModel) || buffer;
            }
            item.usize = item.buffer.length;
            item.csize = 0;
            deltaSize += item.usize - size;
        } else {
            item.buffer = f.slice(begin, begin + size)
        }
    }
    if (hasChanged) {
        const o = Buffer.alloc(f.length + deltaSize);
        let cursor = 92 + itemsCount * 32;
        o.fill(f, 0, cursor);
        p = 92;
        for (let i = 0; i < itemsCount; i++) {
            const item = list[i];
            p += 12; // skip name
            p += 4; // skip 4 unknown bytes

            item.begin = cursor;
            o.writeUInt32LE(item.begin, p);
            p += 4;
            cursor += item.buffer.length;

            o.writeUInt32LE(item.usize, p);
            p += 4;

            p += 4; // skip 4 unknown bytes

            o.writeUInt32LE(item.csize, p);
            p += 4;
        }
        for (let i = 0; i < itemsCount; i++) {
            const {buffer, begin, usize, csize} = list[i];
            const size = csize || usize;
            o.fill(buffer, begin, begin + size);
        }
        console.log(lodPath);
        fs.writeFileSync(lodPath, o);
    }
};

/**
 *
 */
const createBitmapWithPalette = ({rgba, w, h}) => {
    const size = w * h;
    const buffer = Buffer.allocUnsafe(12 + size + 256 * 3);
    buffer.writeUInt32LE(size);
    buffer.writeUInt32LE(w, 4);
    buffer.writeUInt32LE(h, 8);
    let p = 12;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = y * w * 4 + x * 4;
            const dec = rgbToDec(rgba[i], rgba[i + 1], rgba[i + 2]);
            buffer.writeUInt8(customPaletteMap[dec], p);
            p++;
        }
    }
    for (const paletteCell of customPalette) {
        buffer.writeUInt8(paletteCell, p);
        p++;
    }
    return buffer;
};

/**
 *
 */
const createSimpleBitmap = ({rgba, w, h}) => {
    const size = w * h * 3;
    const buffer = Buffer.allocUnsafe(12 + size);
    buffer.writeUInt32LE(size);
    buffer.writeUInt32LE(w, 4);
    buffer.writeUInt32LE(h, 8);
    let p = 12;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = y * w * 4 + x * 4;
            buffer.writeUInt8(rgba[i + 2], p);
            buffer.writeUInt8(rgba[i + 1], p + 1);
            buffer.writeUInt8(rgba[i], p + 2);
            p += 3;
        }
    }
    return buffer;
};

/**
 * {
 *     defType: 47,
 *     defWidth: 100,
 *     defHeight: 100,
 *     groupsCount: 4,
 *     groups: [
 *         {
 *             groupId: 1,
 *             unknownA: 1,
 *             unknownB: 1,
 *             spritesCount: 6,
 *             sprites: [
 *                 {
 *                     name: 'FOO.PCX',
 *                     offset: 123123,
 *                     size: 14400,
 *                     format: 0,
 *                     fullWidth: 302,
 *                     fullHeight: 102,
 *                     width: 300,
 *                     height: 100,
 *                     leftMargin: 1,
 *                     topMargin: 1,
 *                 },
 *                 ...
 *             ],
 *         },
 *         ...
 *     ],
 * }
 */
const reinterpretDef = (f) => {
    let p = 0;

    const defType = f.readUInt32LE(p);
    p += 4;

    const defWidth = f.readUInt32LE(p);
    p += 4;

    const defHeight = f.readUInt32LE(p);
    p += 4;

    const groupsCount = f.readUInt32LE(p);
    p += 4;

    const palette = f.slice(p, p + 256 * 3);
    p += 256 * 3; // skip palette

    const groups = [];
    const allSprites = [];
    for (let i = 0; i < groupsCount; i++) {

        const groupId = f.readUInt32LE(p);
        p += 4;

        const spritesCount = f.readUInt32LE(p);
        p += 4;

        const unknownA = f.readUInt32LE(p);
        p += 4;

        const unknownB = f.readUInt32LE(p);
        p += 4;

        const sprites = [];
        for (let j = 0; j < spritesCount; j++) {

            const nameBuffer = f.slice(p, p + 13);
            p += 13;

            const sprite = {
                name: clean(nameBuffer.toString()),
            };
            sprites.push(sprite);
            allSprites.push(sprite);
        }

        for (let j = 0; j < spritesCount; j++) {

            sprites[j].offset = f.readUInt32LE(p);
            p += 4;

        }
        groups.push({
            groupId,
            spritesCount,
            unknownA,
            unknownB,
            sprites,
        });
    }

    for (const sprite of allSprites) {
        p = sprite.offset;

        sprite.size = f.readUInt32LE(p);
        p += 4;

        sprite.format = f.readUInt32LE(p);
        p += 4;

        sprite.fullWidth = f.readUInt32LE(p);
        p += 4;

        sprite.fullHeight = f.readUInt32LE(p);
        p += 4;

        sprite.width = f.readUInt32LE(p);
        p += 4;

        sprite.height = f.readUInt32LE(p);
        p += 4;

        sprite.leftMargin = f.readUInt32LE(p);
        p += 4;

        sprite.topMargin = f.readUInt32LE(p);
        p += 4;

        // special case for some "old" format defs (SGTWMTA.DEF and SGTWMTB.DEF)
        if (sprite.format === 1 && sprite.width > sprite.fullWidth && sprite.height > sprite.fullHeight) {
            sprite.width = sprite.fullWidth;
            sprite.height = sprite.fullHeight;
            sprite.leftMargin = 0;
            sprite.topMargin = 0;
        }

        sprite.bytes = f.slice(p, p + sprite.size);
    }

    return {
        defType,
        defWidth,
        defHeight,
        palette,
        groupsCount,
        groups,
    }

};


/**
 * Dynamic fields:
 *      - sprite offset
 *      - sprite size
 *      - line offset
 */
const createDef = (dbItems, defModel) => {
    // console.log(JSON.stringify(defModel, null, 4));
    const {defType, defWidth, defHeight, groupsCount, groups} = defModel;

    // const palette = defModel.palette;
    // const paletteMap = buildPaletteMap(palette);
    const palette = customPalette;
    const paletteMap = customPaletteMap;

    let bufferSize = 0;
    bufferSize += 16;                                               // type, width, height, groupsCount
    bufferSize += 256 * 3;                                          // palette
    for (const {spritesCount} of groups) {
        bufferSize += 16;                                           // groupId, spritesCount, unknownA, unknownB
        bufferSize += 13 * spritesCount;                            // sprite name
        bufferSize += 4 * spritesCount;                             // sprite offset
    }
    let hasWritten = true;
    for (const {sprites} of groups) {
        for (const sprite of sprites) {
            const {width, height, format, name} = sprite;
            sprite.offset = bufferSize;
            bufferSize += 32;                                       // sprite meta
            const bytes = encoders[format](dbItems[name].rgba, width, height, paletteMap);
            if (!hasWritten) {
                hasWritten = true;
                fs.writeFileSync('bytes1.buf', sprite.bytes);
                fs.writeFileSync('bytes2.buf', bytes);
            }
            sprite.bytes = bytes;
            sprite.size = sprite.bytes.length;
            bufferSize += sprite.size;
        }
    }

    const f = Buffer.alloc(bufferSize);

    let p = 0;

    f.writeUInt32LE(defType, p);
    p += 4;

    f.writeUInt32LE(defWidth, p);
    p += 4;

    f.writeUInt32LE(defHeight, p);
    p += 4;

    f.writeUInt32LE(groupsCount, p);
    p += 4;

    for (const paletteCell of palette) {
        f.writeUInt8(paletteCell, p);
        p++;
    }

    for (const {groupId, spritesCount, unknownA, unknownB, sprites} of groups) {

        f.writeUInt32LE(groupId, p);
        p += 4;

        f.writeUInt32LE(spritesCount, p);
        p += 4;

        f.writeUInt32LE(unknownA, p);
        p += 4;

        f.writeUInt32LE(unknownB, p);
        p += 4;

        for (const {name} of sprites) {
            f.write(name, p, 13);
            p += 13;
        }

        for (const {offset} of sprites) {
            f.writeUInt32LE(offset, p);
            p += 4;
        }
    }
    for (const {sprites} of groups) {
        for (const sprite of sprites) {
            const {name, size, format, fullWidth, fullHeight, width, height, leftMargin, topMargin, bytes} = sprite;

            f.writeUInt32LE(size, p);
            p += 4;

            f.writeUInt32LE(format, p);
            p += 4;

            f.writeUInt32LE(fullWidth, p);
            p += 4;

            f.writeUInt32LE(fullHeight, p);
            p += 4;

            f.writeUInt32LE(width, p);
            p += 4;

            f.writeUInt32LE(height, p);
            p += 4;

            f.writeUInt32LE(leftMargin, p);
            p += 4;

            f.writeUInt32LE(topMargin, p);
            p += 4;

            f.fill(bytes, p, p + size);
            p += size;
        }
    }

    // parseDef(f);
    return f;
};

/**
 *
 */
function encodeRgbaToFormat0(rgba, w, h, paletteMap) {
    const buffer = Buffer.alloc(w * h);
    let p = 0;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = y * w * 4 + x * 4;
            const dec = rgbToDec(rgba[i], rgba[i + 1], rgba[i + 2]);
            buffer.writeUInt8(paletteMap[dec], p);
            p++;
        }
    }
    return buffer;
}

/**
 *
 */
function encodeRgbaToFormat1(rgba, w, h, paletteMap) {
    const offsets = Buffer.alloc(h * 4);
    const lines = [];
    for (let y = 0; y < h; y++) {
        offsets.writeUInt32LE(offsets.length + lines.length, y * 4);
        for (let x = 0; x < w; x++) {
            const i = y * w * 4 + x * 4;
            const dec = rgbToDec(rgba[i], rgba[i + 1], rgba[i + 2]);
            const index = paletteMap[dec];
            if (index <= 9) { // game palette
                lines.push(index);
                let length = 1;
                for (let z = x + 1; z < w; z++) {
                    const i = y * w * 4 + z * 4;
                    const dec = rgbToDec(rgba[i], rgba[i + 1], rgba[i + 2]);
                    const futureIndex = paletteMap[dec];
                    if (futureIndex !== index) {
                        break;
                    }
                    length++;
                }
                lines.push(length - 1);
                x += length - 1;
            } else {
                lines.push(255);
                let length = 1;
                lines.push(0); // will update later
                const lengthSlot = lines.length - 1;
                lines.push(index);
                for (let z = x + 1; z < w; z++) {
                    const j = y * w * 4 + z * 4;
                    const dec = rgbToDec(rgba[j], rgba[j + 1], rgba[j + 2]);
                    const futureIndex = paletteMap[dec];
                    if (futureIndex <= 9) { // game palette
                        break;
                    }
                    lines.push(futureIndex);
                    length++;
                }
                lines[lengthSlot] = length - 1;
                x += length - 1;
            }
        }
    }
    return Buffer.concat([offsets, Buffer.from(lines)], offsets.length + lines.length);
}

/**
 *
 */
function encodeRgbaToFormat2(rgba, w, h, paletteMap) {
    const offsets = Buffer.alloc(h * 2);
    const lines = [];
    for (let y = 0; y < h; y++) {
        offsets.writeUInt16LE(offsets.length + lines.length, y * 2);
        for (let x = 0; x < w; x++) {
            const i = y * w * 4 + x * 4;
            const dec = rgbToDec(rgba[i], rgba[i + 1], rgba[i + 2]);
            const index = paletteMap[dec];
            if (index <= 9) { // game palette
                let length = 0;
                for (let z = x + 1; z < w; z++) {
                    const i = y * w * 4 + z * 4;
                    const dec = rgbToDec(rgba[i], rgba[i + 1], rgba[i + 2]);
                    const futureIndex = paletteMap[dec];
                    if (futureIndex !== index) {
                        break;
                    }
                    length++;
                }
                x += length;
                const rle = index * 32 + length;
                lines.push(rle);
            } else {
                let length = 0;
                lines.push(0); // will update later
                const lengthSlot = lines.length - 1;
                lines.push(index);
                for (let z = x + 1; z < w; z++) {
                    const j = y * w * 4 + z * 4;
                    const dec = rgbToDec(rgba[j], rgba[j + 1], rgba[j + 2]);
                    const futureIndex = paletteMap[dec];
                    if (futureIndex <= 9) { // game palette
                        break;
                    }
                    lines.push(futureIndex);
                    length++;
                }
                x += length;
                lines[lengthSlot] = 7 * 32 + length;
            }
        }
    }
    return Buffer.concat([offsets, Buffer.from(lines)], offsets.length + lines.length);
}

/**
 *
 */
function encodeRgbaToFormat3(rgba, w, h, paletteMap) {
    const zones = Math.ceil(w / 32);
    let p = 0;
    const offsets = Buffer.alloc(h * 2 * zones);
    const lines = [];
    for (let y = 0; y < h; y++) {
        for (let k = 0; k < zones; k++) {
            offsets.writeUInt16LE(offsets.length + lines.length, p);
            p += 2;
            const lowerX = k * 32;
            const upperX = Math.min(w, (k + 1) * 32);
            for (let x = lowerX; x < upperX; x++) {
                const i = y * w * 4 + x * 4;
                const dec = rgbToDec(rgba[i], rgba[i + 1], rgba[i + 2]);
                const index = paletteMap[dec];
                if (index <= 9) { // game palette
                    let length = 0;
                    for (let z = x + 1; z < upperX; z++) {
                        const i = y * w * 4 + z * 4;
                        const dec = rgbToDec(rgba[i], rgba[i + 1], rgba[i + 2]);
                        const futureIndex = paletteMap[dec];
                        if (futureIndex !== index) {
                            break;
                        }
                        length++;
                    }
                    x += length;
                    const rle = index * 32 + length;
                    lines.push(rle);
                } else {
                    let length = 0;
                    lines.push(0); // will update later
                    const lengthSlot = lines.length - 1;
                    lines.push(index);
                    for (let z = x + 1; z < upperX; z++) {
                        const j = y * w * 4 + z * 4;
                        const dec = rgbToDec(rgba[j], rgba[j + 1], rgba[j + 2]);
                        const futureIndex = paletteMap[dec];
                        if (futureIndex <= 9) { // game palette
                            break;
                        }
                        lines.push(futureIndex);
                        length++;
                    }
                    x += length;
                    lines[lengthSlot] = 7 * 32 + length;
                }
            }

        }

    }
    return Buffer.concat([offsets, Buffer.from(lines)], offsets.length + lines.length);
}

/**
 * https://github.com/vcmi/vcmi/blob/develop/client/gui/CAnimation.cpp
 */
const parseDef = (f) => {
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
                        const {r, g, b} = palette[colorIndex];
                        rgba[j++] = r;
                        rgba[j++] = g;
                        rgba[j++] = b;
                        rgba[j++] = 255;
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
                                const {r, g, b} = palette[colorIndex];
                                rgba[j++] = r;
                                rgba[j++] = g;
                                rgba[j++] = b;
                                rgba[j++] = 255;
                            }
                        } else { // RLE
                            for (let i = 0; i < length; i++) {
                                const {r, g, b} = palette[code];
                                rgba[j++] = r;
                                rgba[j++] = g;
                                rgba[j++] = b;
                                rgba[j++] = 255;
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
                                const {r, g, b} = palette[colorIndex];
                                rgba[j++] = r;
                                rgba[j++] = g;
                                rgba[j++] = b;
                                rgba[j++] = 255;
                            }
                        } else { // RLE
                            for (let i = 0; i < length; i++) {
                                const {r, g, b} = palette[code];
                                rgba[j++] = r;
                                rgba[j++] = g;
                                rgba[j++] = b;
                                rgba[j++] = 255;
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
        show(rgba, width, height, 1);
        return;
    }
};


const clean = (s) => {
    return s.replace(/[^a-zA-Z0-9_.][\s\S]*/g, '').toUpperCase();
};

/**
 *
 */
function buildCustomPalette() {
    const colors = [
        0, 255, 255,        // game palette
        255, 150, 255,      // game palette
        255, 100, 255,      // game palette
        255, 50, 255,       // game palette
        255, 0, 255,        // game palette
        255, 255, 0,        // game palette
        180, 0, 255,        // game palette
        0, 255, 0,          // game palette
        255, 128, 255,      // game palette
        255, 128, 255,      // game palette
    ];
    const palette = new Uint8ClampedArray(256 * 3);
    for (let i = 0; i < colors.length; i++) {
        palette[i] = colors[i];
    }

    let p = colors.length;
    for (const key in ENCODING) {
        const buffer = ENCODING[key];
        palette.set(buffer, p);
        p += 3;
    }

    palette.set([255, 255, 255], p); // manually add white
    p += 3;

    // We must obscure the rest of the pixels because sometimes the game uses them to adapt colors to match the theme.
    for (let i = p; i < palette.length; i += 3) {
        palette[i] = 200;
        palette[i + 1] = 0;
        palette[i + 2] = 200;
    }
    return palette;
}

/**
 *
 */
function buildPaletteMap(palette) {
    const pojo = {};
    let index = 0;
    for (let i = 0; i < palette.length; i += 3) {
        pojo[rgbToDec(palette[i], palette[i + 1], palette[i + 2])] = index++;
    }
    return pojo;
}

module.exports = injectAssets;