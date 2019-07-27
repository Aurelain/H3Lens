const fs = require('fs-extra');
const path = require('path');
const {desktopCapturer} = require('electron');
const parseAssets = require('./lod/parseAssets');
const rgbToDec = require('./utils/rgbToDec');

/*
const findH3Dir = require('./utils/findH3Dir');
const findH3HdDir = require('./utils/findH3HdDir');
const {spawn} = require('child_process');
(async () => {
    const h3Dir = await findH3Dir();
    const companion = spawn('client/companion.exe', [h3Dir]);
    // console.log(await findH3HdDir());
})();
*/


const video = document.createElement('video');
const canvas = document.createElement('canvas');
const canvas2 = document.createElement('canvas');
const context = canvas.getContext('2d');
const context2 = canvas2.getContext('2d');
const TEMP_WIDTH = 806;
const TEMP_HEIGHT = 648;
const W = 800;
const H = 600;
const db = [];
const SOURCE_DIR = "D:\\H3_ALL_Freeze\\HoMM 3 Complete\\Data";
let used;
const NR_TO_LETTER = {};


const run = async () => {

    parse();

    for (let i = 0; i < 16; i++) {
        NR_TO_LETTER[i * 16] = Number(i * 16).toString(16).charAt(0);
    }

    const sources = await desktopCapturer.getSources({types: ['window']});
    for (const source of sources) {
        if (source.name === 'Heroes of Might and Magic III') {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: source.id,
                        minWidth: TEMP_WIDTH,
                        maxWidth: TEMP_WIDTH,
                        minHeight: TEMP_HEIGHT,
                        maxHeight: TEMP_HEIGHT,
                    },
                },
            });

            canvas.width = TEMP_WIDTH;
            canvas.height = TEMP_HEIGHT;

            document.body.appendChild(canvas2);
            canvas2.width = 800;
            canvas2.height = 600;

            video.autoplay = true;
            video.srcObject = stream;
            video.addEventListener('play', () => draw());
        }
    }
};

/**
 *
 */
const parse = () => {
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
};

/**
 *
 */
const draw = () => {
    context.drawImage(video, 0, 0, TEMP_WIDTH, TEMP_HEIGHT);
    const imageData = context.getImageData(3, TEMP_HEIGHT - 2 - H, W, H);
    context2.putImageData(imageData, 0, 0);

    used = new Uint8Array(W * H * 4);

    const bytes = imageData.data;
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const i = y * W * 4 + x * 4;
            const byte = bytes[i];
            // console.log(i, byte);
            if (byte === 255) {
                readMarker(bytes, x, y);
                // return;
            }
        }
    }

    // requestAnimationFrame(draw);
};

/**
 *
 */
const readMarker = (bytes, x, y) => {
    const i = y * W * 4 + x * 4;
    const j = (y + 1) * W * 4 + x * 4;
    const k = (y + 2) * W * 4 + x * 4;
    const m = (y + 3) * W * 4 + x * 4;
    const id = retrieveNumber([bytes[i + 4], bytes[i + 8], bytes[i + 12], bytes[j]]);
    const left = retrieveNumber([bytes[j + 4], bytes[j + 8], bytes[j + 12], bytes[k]]);
    const top = retrieveNumber([bytes[k + 4], bytes[k + 8], bytes[k + 12], bytes[m]]);
    const rest = retrieveNumber([bytes[m + 4], bytes[m + 8], bytes[m + 12]]);
    // console.log({id, left, top, rest});
};

/**
 *
 */
const retrieveNumber = (encoded) => {
    let s = '0x';
    for (const nr of encoded) {
        const floored = Math.floor(nr / 16);
        const min = 16 * floored;
        const max = 16 * (floored + 1);
        const snapped = (nr - min > max - nr) ? max : min;
        s += NR_TO_LETTER[snapped];
    }
    return Number(s);
};

/**
 *
 */
window.addEventListener('load', async () => {
    console.time('run');
    await run();
    console.timeEnd('run');
});