const fs = require('fs-extra');
const path = require('path');
const zlib = require('zlib');
const nativeImage = require('electron').nativeImage;

const SOURCE_DIR = "D:\\H3\\HoMM 3 Complete\\Data";
const DESTINATION_DIR = 'assets';

const run = () => {
    fs.emptyDirSync(DESTINATION_DIR);
    const lods = fs.readdirSync(SOURCE_DIR).filter(name => path.extname(name).toLowerCase() === '.lod');

    for (const lod of lods) {
        // if (lod !== 'H3ab_bmp.lod') {
        //     continue;
        // }
        const f = open(path.join(SOURCE_DIR, lod));
        seek(f, 8);
        const itemsCount = readUInt(f);
        seek(f, 92, 0); // the records always start at 0x5C
        let list = [];
        for (let i = 0; i < itemsCount; i++) {
            const item = {};
            item.name = readString(f, 12).replace(/[^a-zA-Z0-9_.]/g, '').toUpperCase();
            seek(f, 4, 1); // unknown
            item.begin = readUInt(f);
            seek(f, 8, 1); // unknown
            item.size = readUInt(f);
            list.push(item);
        }
        // list = [list[834]];
        for (const item of list) {
            if (item.name.match(/PCX$|DEF/)) {
                //console.log(item);
                seek(f, item.begin, 0);
                const zipBuffer = read(f, item.size);
                let itemBuffer;
                try {
                    itemBuffer = zlib.unzipSync(zipBuffer);
                } catch (e) {
                    console.log('Could not unzip: ' + item);
                    continue;
                }
                if (item.name.match(/PCX$/)) {
                    const size = itemBuffer.readInt32LE(0);
                    const w = itemBuffer.readInt32LE(4);
                    const h = itemBuffer.readInt32LE(8);
                    if (size === w * h) {

                    } else if (size === w * h * 3) {
                        saveRgbBufferToPng(itemBuffer.slice(12), w, h, path.join(DESTINATION_DIR, item.name.replace(/PCX$/, 'PNG')));
                        showRgbBuffer(itemBuffer.slice(12), w, h);
                        return;
                    }
                }
            }
        }
        close(f);
    }
};

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

const show = (imageData, w, h) => {
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

const saveRgbBufferToPng = (rgbBuffer, w, h, destination) => {
    const rgba = new Uint8ClampedArray(w * h * 4);
    let j = 0;
    const len = rgbBuffer.length;
    for (let i = 0; i < len; i += 3) {
        rgba[j++] = rgbBuffer[i];
        rgba[j++] = rgbBuffer[i + 1];
        rgba[j++] = rgbBuffer[i + 2];
        rgba[j++] = 255;
    }
    const pngBuffer = nativeImage.createFromBuffer(rgba, {width: w, height: h}).toPNG();
    fs.writeFileSync(destination, pngBuffer);
};

const showRgbBuffer = (rgbBuffer, w, h) => {
    const rgba = new Uint8ClampedArray(w * h * 4);
    let j = 0;
    const len = rgbBuffer.length;
    for (let i = 0; i < len; i += 3) {
        rgba[j++] = rgbBuffer[i + 2];
        rgba[j++] = rgbBuffer[i + 1];
        rgba[j++] = rgbBuffer[i];
        rgba[j++] = 255;
    }
    const imageData = new ImageData(rgba, w, h);
    show(imageData, w, h);
};

console.time('run');
run();
console.timeEnd('run');

