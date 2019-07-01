const fs = require('fs-extra');
const path = require('path');
const zlib = require('zlib');
const nativeImage = require('electron').nativeImage;
const BufferUtils = require('./utils/BufferUtils');

const SOURCE_DIR = "D:\\H3\\HoMM 3 Complete\\Data";
const DESTINATION_DIR = 'assets';

const run = () => {
    fs.emptyDirSync(DESTINATION_DIR);
    const lods = fs.readdirSync(SOURCE_DIR).filter(name => path.extname(name).toLowerCase() === '.lod');

    for (const lod of lods) {
        if (lod !== 'H3ab_spr.lod') {
            continue;
        }
        const f = open(path.join(SOURCE_DIR, lod));
        seek(f, 8);
        const itemsCount = readUInt(f);
        seek(f, 92, 0); // the records always start at 0x5C
        let list = [];
        for (let i = 0; i < itemsCount; i++) {
            const item = {};
            item.name = clean(readString(f, 12));
            seek(f, 4, 1); // unknown
            item.begin = readUInt(f);
            item.usize = readUInt(f);
            seek(f, 4, 1); // unknown
            item.csize = readUInt(f);
            list.push(item);
        }
        // list = [{begin: 1304183, name: "ARA_COBL.PCX", size: 3646}];
        // list = [{name: "AR_BG.PCX", begin: 538025, size: 766158}];
        for (const item of list) {
            if (item.name.match(/\.PCX$|\.DEF$/)) {
                seek(f, item.begin, 0);


                let itemBuffer;
                if (item.csize) {
                    const zipBuffer = read(f, item.csize);
                    itemBuffer = zlib.unzipSync(zipBuffer);
                } else {
                    itemBuffer = read(f, item.usize);
                }
                if (item.name.match(/PCX$/)) {
                    const size = itemBuffer.readInt32LE(0);
                    const w = itemBuffer.readInt32LE(4);
                    const h = itemBuffer.readInt32LE(8);
                    let rgba;
                    if (size === w * h) {
                        rgba = parsePcxWithPalette(itemBuffer, w, h);
                    } else if (size === w * h * 3) {
                        const bgrBuffer = itemBuffer.slice(12);
                        rgba = convertBgrToRgba(bgrBuffer);
                    }
                    // const destination = path.join(DESTINATION_DIR, item.name.replace(/PCX$/, 'PNG'));
                    // save(rgba, w, h, destination);
                    // show(rgba, w, h);
                } else { // DEF
                    fs.writeFileSync(path.join(DESTINATION_DIR, item.name), itemBuffer);
                    parseDef2(itemBuffer);
                    return;
                }
            }
        }
        close(f);
    }
};

/**
 *
 */
const parsePcxWithPalette = (buffer, w, h) => {
    const len = w * h;
    const paletteOffset = 12 + len;
    const palette = [];
    for (let i = 0; i < 256; i++) {
        const offset = paletteOffset + i * 3;
        const r = buffer.readUInt8(offset);
        const g = buffer.readUInt8(offset + 1);
        const b = buffer.readUInt8(offset + 2);
        palette[i] = {r, g, b};
    }
    const pixels = buffer.slice(12, paletteOffset);
    const rgba = new Uint8ClampedArray(w * h * 4);
    let j = 0;
    for (let i = 0; i < len; i++) {
        const colorIndex = pixels.readUInt8(i);
        const color = palette[colorIndex];
        rgba[j++] = color.r;
        rgba[j++] = color.g;
        rgba[j++] = color.b;
        rgba[j++] = 255;
    }
    return rgba;
};

/**
 *
 */
const parseDef = (buffer) => {
    let pos = 0;
    const type = buffer.readUInt32LE(pos);
    pos += 4;
    pos += 8; // skip width and height
    const groupsCount = buffer.readUInt32LE(pos);
    pos += 4;
    const palette = [];
    for (let i = 0; i < 256; i++) {
        const r = buffer.readUInt8(pos);
        const g = buffer.readUInt8(pos + 1);
        const b = buffer.readUInt8(pos + 2);
        pos += 3;
        palette[i] = {r, g, b};
    }
    const sprites = [];
    for (let i = 0; i < groupsCount; i++) {
        pos += 4; // skip group id
        const spritesCount = buffer.readUInt32LE(pos);
        pos += 4;
        pos += 8; // skip unknown
        const names = [];
        for (let j = 0; j < spritesCount; j++) {
            const name = buffer.slice(pos, pos + 13);
            pos += 13;
            names.push(clean(name.toString()));
        }
        for (let j = 0; j < spritesCount; j++) {
            sprites.push({
                name: names[j],
                offset: buffer.readUInt32LE(pos),
            });
            pos += 4;
        }
    }
    /*
    for (const {name, offset} of sprites) {
        pos = offset;
        const size = buffer.readUInt32LE(pos);
        pos += 4;
        const format = buffer.readUInt32LE(pos);
        pos += 4;
        const fullWidth = buffer.readUInt32LE(pos);
        pos += 4;
        const fullHeight = buffer.readUInt32LE(pos);
        pos += 4;
        console.log(name, format, fullWidth);
    }*/
    console.log('sprites',sprites);
};
/**
 *
 */
const parseDef2 = (buffer) => {
    const {open, seek, read, readUInt8, readUInt32} = BufferUtils;
    const b = open(buffer);
    const type = readUInt32(b);
    seek(b, 8); // skip width and height
    const groupsCount = readUInt32(b);
    const palette = [];
    for (let i = 0; i < 256; i++) {
        const red = readUInt8(b);
        const green = readUInt8(b);
        const blue = readUInt8(b);
        palette[i] = {red, green, blue};
    }
    const sprites = [];
    let aur = 0;
    for (let i = 0; i < groupsCount; i++) {
        seek(b, 4); // skip group id
        const spritesCount = readUInt32(b);
        seek(b, 8); // skip unknown
        const names = [];
        for (let j = 0; j < spritesCount; j++) {
            const name = read(b, 13);
            names.push(clean(name.toString()));
        }
        for (let j = 0; j < spritesCount; j++) {
            sprites.push({
                name: names[j],
                offset: readUInt32(b),
            });
        }
    }
    for (const {name, offset} of sprites) {
        seek(b, offset, 0);
        const size = readUInt32(b);
        const format = readUInt32(b);
        const fullWidth = readUInt32(b);
        const fullHeight = readUInt32(b);
        const width = readUInt32(b);
        const height = readUInt32(b);
        const leftMargin = readUInt32(b);
        const topMargin = readUInt32(b);
        console.log({name, format, fullWidth,fullHeight,width,height,leftMargin,topMargin});
    }
};

/**
 *
 */
const open = (filePath) => {
    return {
        d: fs.openSync(filePath, 'r'),
        p: 0,
    }
};

const seek = (file, pos, mode) => {
    file.p = mode === 0 ? pos : (file.p + pos);
};

const read = (file, size) => {
    const buffer = Buffer.alloc(size);
    fs.readSync(file.d, buffer, 0, size, file.p);
    file.p += size;
    return buffer;
};

const readUInt = (file) => {
    const buffer = read(file, 4);
    return buffer.readInt32LE();
};

const readString = (file, size) => {
    const buffer = read(file, size);
    return buffer.toString('utf8');
};

const close = (file) => {
    fs.closeSync(file.d);
};

const clean = (s) => {
    return s.replace(/[^a-zA-Z0-9_.]*$/g, '').toUpperCase();
};

const show = (rgba, w, h) => {
    const imageData = new ImageData(rgba, w, h);
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;left:0;top:0;';
    canvas.width = w;
    canvas.height = h;
    const context = canvas.getContext('2d');
    context.putImageData(imageData, 0, 0);
    setTimeout(function () {
        document.body.appendChild(canvas);
    }, 100)
};

const save = (rgba, w, h, destination) => {
    const len = rgba.length;
    const bgra = new Uint8ClampedArray(len);
    let j = 0;
    for (let i = 0; i < len; i += 4) {
        bgra[j++] = rgba[i + 2];
        bgra[j++] = rgba[i + 1];
        bgra[j++] = rgba[i];
        bgra[j++] = rgba[i + 3];
    }
    const pngBuffer = nativeImage.createFromBuffer(bgra, {width: w, height: h}).toPNG();
    fs.writeFileSync(destination, pngBuffer);
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

console.time('run');
run();
console.timeEnd('run');

