const rgbToHex = require('../utils/rgbToHex');
const buildSnaps = require('../utils/buildSnaps');
const {readMarker} = require('../client/renderFrame');
const {SNAP} = require('../utils/COMMON');

const snap = buildSnaps();
const W = 800;
const H = 600;
const OUTPUT = `
rgb  = $Rdo $Gdo $Bdo
hex  = $Rho $Gho $Bho
rgbs = $Rds $Gds $Bds
hexs = $Rhs $Ghs $Bhs
---------------------
layer = $layer
x = $x
y = $y
path = $path
`;

let picker;
let pre;
let isOpen = window.localStorage.picker === 'yes';
let zoomFactor;
let offsetX;
let offsetY;
let db;
let rgbas;
let layers;
let context;



const initializePicker = (theDb, theRgbas) => {
    db = theDb;
    rgbas = theRgbas;

    picker = document.createElement('div');
    picker.style.cssText = 'position:fixed;padding:8px;background:white;z-index:1000;';

    pre = document.createElement('pre');
    picker.appendChild(pre);

    const canvas = document.createElement('canvas');
    context = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 200;
    picker.appendChild(canvas);

    document.body.appendChild(picker);


    window.addEventListener('keydown', onWindowKeyDown);
    window.addEventListener('click', onWindowClick);
    applyIsOpen();
};


const configurePicker = (zoom, x, y, theLayers) => {
    zoomFactor = zoom;
    offsetX = x;
    offsetY = y;
    layers = theLayers;
};


const onWindowKeyDown = (event) => {
    if (event.key === 'p') {
        isOpen = !isOpen;
        applyIsOpen();
    }
};


const applyIsOpen = () => {
    window.localStorage.picker = isOpen ? 'yes' : 'no';
    if (isOpen) {
        window.addEventListener('pointermove', onWindowPointerMove);
        picker.style.display = 'block';
    } else {
        window.removeEventListener('pointermove', onWindowPointerMove);
        picker.style.display = 'none';
    }
};


const onWindowPointerMove = ({clientX, clientY}) => {
    const x = Math.floor(offsetX + clientX / zoomFactor);
    const y = Math.floor(offsetY + clientY / zoomFactor);
    const j = y * W * 4 + x * 4;
    let layer;
    let r = -1;
    let g = -1;
    let b = -1;
    let rgba;
    for (let i = 0; i < layers.length; i++) {
        rgba = rgbas[i];
        if (layers[i] && rgba[j + 3] !== 0) {
            layer = layers[i];
            r = rgba[j];
            g = rgba[j + 1];
            b = rgba[j + 2];
            break;
        }
    }

    picker.style.left = (clientX + 16) + 'px';
    picker.style.top = (clientY + 16) + 'px';

    const hex = rgbToHex(r, g, b).toUpperCase();
    const hexSnap = rgbToHex(SNAP[r], SNAP[g], SNAP[b]).toUpperCase();
    let text = OUTPUT.trim();
    if (!layer) {
        text = text.replace(/\$[RGB]../g, '');
    } else {
        text = text.replace('$Rdo', pad(r));
        text = text.replace('$Gdo', pad(g));
        text = text.replace('$Bdo', pad(b));
        text = text.replace('$Rho', pad(hex[1] + hex[2]));
        text = text.replace('$Gho', pad(hex[3] + hex[4]));
        text = text.replace('$Bho', pad(hex[5] + hex[6]));
        text = text.replace('$Rds', pad(SNAP[r]));
        text = text.replace('$Gds', pad(SNAP[g]));
        text = text.replace('$Bds', pad(SNAP[b]));
        text = text.replace('$Rhs', pad(hexSnap[1] + hexSnap[2]));
        text = text.replace('$Ghs', pad(hexSnap[3] + hexSnap[4]));
        text = text.replace('$Bhs', pad(hexSnap[5] + hexSnap[6]));
    }
    text = text.replace('$layer', layer);
    text = text.replace('$x', x);
    text = text.replace('$y', y);

    context.clearRect(0, 0, 200, 200);

    const marker = readMarker(rgba, db, x, y);
    if (marker) {
        const {rgba, w, h, path} = db[marker.index];
        text = text.replace('$path', path);
        context.putImageData(new ImageData(rgba, w,h), 0, 0);
    }

    pre.innerHTML = text;
};


const onWindowClick = (event) => {
    if (event.target instanceof HTMLCanvasElement) {
        console.log('====================');
        console.log(JSON.stringify({zoomFactor, offsetX, offsetY}));
        console.log(pre.innerHTML);
    }
};


const pad = (value) => {
    return String(value).padStart(4, ' ');
};


module.exports = {
    initializePicker,
    configurePicker,
};