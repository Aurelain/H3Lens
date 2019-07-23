const fs = require('fs');
const zlib = require('zlib');
const rgbToDec = require('../utils/rgbToDec');
const show = require('../utils/show');

const customPalette = new Uint8ClampedArray(256 * 3);
const mapColorToIndex = {};
fillCustomPaletteAndColorMap();

/**
 *
 * @param lodPath
 * @param db
 * @param assetPaths
 */
const injectAssets = (lodPath, db, assetPaths) => {
    const lodName = lodPath.match(/[^\/\\]+$/)[0];
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
        if (assetPath in assetPaths) {
            const indexes = assetPaths[assetPath];
            hasChanged = true;
            if (assetName.match(/PCX$/)) {
                const dbItem = db[indexes[0]]; // the only available index is 0
                if (dbItem.frameName) {
                    item.buffer = createBitmapWithPalette(dbItem);
                } else {
                    item.buffer = createSimpleBitmap(dbItem);
                }
            } else {
                const dbItems = [];
                for (const index of indexes) {
                    dbItems.push(db[index]);
                }
                let buffer = f.slice(begin, begin + size);
                if (csize) {
                    buffer = zlib.unzipSync(buffer);
                }
                const defModel = reinterpretDef(buffer);
                console.log(JSON.stringify(defModel, null, 4));
                // item.buffer = createDef(dbItems, buffer);
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
            const dec = rgbToDec(rgba[i + 2], rgba[i + 1], rgba[i]);
            buffer.writeUInt8(mapColorToIndex[dec], p);
            p++;
        }
    }
    for (const paletteCell of palette) {
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
 *                     nameBuffer: Buffer(13),
 *                     offset: 123123,
 *                     size: 14400,
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
                // nameBuffer,
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
    }

    return {
        defType,
        defWidth,
        defHeight,
        groupsCount,
        groups,
    }

};


/**
 * Based on `parseDef()` from "parseAssets.js".
 */
const createDef = (dbItems, f) => {
    let p = 12; // skip type, width and height

    const groupsCount = f.readUInt32LE(p);
    p += 4;

    for (let i = 0; i < 256; i++) {
        p += 3;
    }

    const offsets = [];
    for (let i = 0; i < groupsCount; i++) {
        p += 4; // skip group id

        const spritesCount = f.readUInt32LE(p);
        p += 4;

        p += 8; // skip 8 unknown bytes

        for (let j = 0; j < spritesCount; j++) {
            p += 13;
        }
        for (let j = 0; j < spritesCount; j++) {
            offsets.push(f.readUInt32LE(p));
            p += 4;
        }
    }
    const beginningSize = p;
    let bufferSize = beginningSize;

    const frames = [];
    console.log('bufferSize', bufferSize);
    for (const offset of offsets) {
        p = offset;
        p += 4; // skip size
        const format = f.readUInt32LE(p);
        const fullWidth = f.readUInt32LE(p + 4);
        const fullHeight = f.readUInt32LE(p + 8);
        let width = f.readUInt32LE(p + 12);
        let height = f.readUInt32LE(p + 16);
        let leftMargin = f.readUInt32LE(p + 20);
        let topMargin = f.readUInt32LE(p + 24);

        // special case for some "old" format defs (SGTWMTA.DEF and SGTWMTB.DEF)
        if (format === 1 && width > fullWidth && height > fullHeight) {
            width = fullWidth;
            height = fullHeight;
            leftMargin = 0;
            topMargin = 0;
        }
        frames.push({
            offset: bufferSize,
            size: width * height,
            fullWidth,
            fullHeight,
            width,
            height,
            leftMargin,
            topMargin,
        });
        bufferSize += width * height + 32; // 32 is the future header size
    }

    const buffer = Buffer.alloc(bufferSize);
    buffer.fill(f, 0, beginningSize);
    let currentFrame = 0;
    p = 12; // skip type, width and height
    p += 4; // skip groupCount
    for (const paletteCell of palette) {
        buffer.writeUInt8(paletteCell, p);
        p++;
    }
    for (let i = 0; i < groupsCount; i++) {
        p += 4; // skip group id
        const spritesCount = f.readUInt32LE(p);
        p += 4;
        p += 8; // skip 8 unknown bytes
        for (let j = 0; j < spritesCount; j++) {
            p += 13; // skip names
        }
        for (let j = 0; j < spritesCount; j++) {
            buffer.writeUInt32LE(frames[currentFrame].offset, p);
            p += 4;
            currentFrame++;
        }
    }
    for (const {size, fullWidth, fullHeight, width, height, leftMargin, topMargin} of frames) {
        buffer.writeUInt32LE(size, p);
        p += 4;
        buffer.writeUInt32LE(0, p); // format
        p += 4;
        buffer.writeUInt32LE(fullWidth, p);
        p += 4;
        buffer.writeUInt32LE(fullHeight, p);
        p += 4;
        buffer.writeUInt32LE(width, p);
        p += 4;
        buffer.writeUInt32LE(height, p);
        p += 4;
        buffer.writeUInt32LE(leftMargin, p);
        p += 4;
        buffer.writeUInt32LE(topMargin, p);
        p += 4;
        buffer.writeUInt32LE(size, p);
        p += 4;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                buffer.writeUInt8(0, p++);
            }
        }
    }

    const myDb = {};
    parseDef(buffer, 'a', 'b', myDb, {}, {});
    console.log(myDb);

    console.log(frames);

};


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
        show(rgba, width, height);
        return;
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
function fillCustomPaletteAndColorMap () {
    const colors = [
        0, 255, 255,
        255, 150, 255,
        255, 100, 255,
        255, 50, 255,
        255, 0, 255,
        255, 255, 0,
        180, 0, 255,
        0, 255, 0,
        255, 128, 255,
        0, 0, 0,
        0x10, 0x10, 0x10,
        0x20, 0x20, 0x20,
        0x30, 0x30, 0x30,
        0x40, 0x40, 0x40,
        0x50, 0x50, 0x50,
        0x60, 0x60, 0x60,
        0x70, 0x70, 0x70,
        0x80, 0x80, 0x80,
        0x90, 0x90, 0x90,
        0xa0, 0xa0, 0xa0,
        0xb0, 0xb0, 0xb0,
        0xc0, 0xc0, 0xc0,
        0xd0, 0xd0, 0xd0,
        0xe0, 0xe0, 0xe0,
        0xf0, 0xf0, 0xf0,
        0xff, 0xff, 0xff,
    ];
    for (let i = 0; i < colors.length; i++) {
        customPalette[i] = colors[i];
    }
    let index = 0;
    for (let i = 0; i < colors.length; i += 3) {
        mapColorToIndex[rgbToDec(colors[i + 2], colors[i + 1], colors[i])] = index++;
    }
}

module.exports = injectAssets;