const {nativeImage: NativeImage} = require('electron');
const TARGET = 'workbench/screens/MainMenu';

const list = [
    'hd',
    '--heat',
    'lazarus',
    '--stream-wild-colors',
    '--stream-wild-gray',
    '--stream-marked-rejected',
    '--stream-marked-approved',
    'stream',
    'snow',
    'original',
];

const contexts = {};
const screenCanvases = {};
let zoomFactor = 1;
let offsetX = 0;
let offsetY = 0;
let dragInitX;
let dragInitY;
let dragOffsetX;
let dragOffsetY;

const run = () => {
    const options = document.createElement('div');
    document.body.appendChild(options);
    options.style.background = 'rgba(255,255,255,0.95)';
    options.style.position = 'fixed';
    options.style.top = '0';
    options.style.right = '0';
    options.style.padding = '8px';
    options.style.zIndex = '100';
    for (const name of list) {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = 'i' + name;
        input.name = name;
        input.checked = localStorage.getItem(name) === 'yes';
        input.addEventListener('change', onInputChange);

        const label = document.createElement('label');
        label.innerHTML = name;
        label.setAttribute('for', 'i' + name);

        const option = document.createElement('div');
        option.appendChild(input);
        option.appendChild(label);
        options.appendChild(option);
    }

    for (const name of list) {
        let rgba;
        switch (name) {
            case 'hd':
                rgba = getHdRgba();
                break;
            case '--heat':
                rgba = getHeatRgba();
                break;
            case 'lazarus':
                rgba = getLazarusRgba();
                break;
            case '--stream-wild-colors':
                rgba = getWildColorsRgba();
                break;
            case '--stream-wild-gray':
                rgba = getWildGrayRgba();
                break;
            case '--stream-marked-rejected':
                rgba = getMarkedRejectedRgba();
                break;
            case '--stream-marked-approved':
                rgba = getMarkedApprovedRgba();
                break;
            case 'stream':
                rgba = getStreamRgba();
                break;
            case 'snow':
                rgba = getSnowRgba();
                break;
            case 'original':
                rgba = getOriginalRgba();
                break;
            default:
                throw new Error('Unknown canvas type');
        }
        if (!rgba) {
            continue;
        }
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 800;
        canvas.height = 600;
        const imageData = new ImageData(rgba, 800, 600);
        context.putImageData(imageData, 0, 0);
        contexts[name] = context;
    }

    let zIndex = list.length;
    for (const name of list) {
        const canvas = document.createElement('canvas');
        canvas.dataset.id = name;
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.zIndex = zIndex--;
        canvas.style.background = `rgb(${zIndex * 16},${zIndex * 16},${zIndex * 16})`;
        canvas.style.display = localStorage.getItem(name) === 'yes' ? 'block' : 'none';
        document.body.appendChild(canvas);
        screenCanvases[name] = canvas;
    }

    window.addEventListener('pointerdown', onWindowPointerDown);
    window.addEventListener('mousewheel', onWindowMouseWheel);
    window.addEventListener('resize', onWindowResize);
    refreshScreenCanvases();
};


const getHdRgba = () => {

};


const getHeatRgba = () => {

};


const getLazarusRgba = () => {

};


const getWildColorsRgba = () => {

};


const getWildGrayRgba = () => {

};


const getMarkedRejectedRgba = () => {

};


const getMarkedApprovedRgba = () => {

};


const getStreamRgba = () => {
    const nativeImage = NativeImage.createFromPath(TARGET + '_stream.png');
    return convertBgraToRgba(nativeImage.toBitmap());
};


const getSnowRgba = () => {
    const nativeImage = NativeImage.createFromPath(TARGET + '_snow.png');
    return convertBgraToRgba(nativeImage.toBitmap());
};


const getOriginalRgba = () => {
    const nativeImage = NativeImage.createFromPath(TARGET + '_original.png');
    return convertBgraToRgba(nativeImage.toBitmap());

};


const onWindowResize = () => {
    refreshScreenCanvases();
};


const refreshScreenCanvases = () => {
    const {innerWidth, innerHeight} = window;
    for (const name of list) {
        const screenCanvas = screenCanvases[name];
        screenCanvas.width = innerWidth;
        screenCanvas.height = innerHeight;
        const context = contexts[name];
        if (!context) {
            continue;
        }
        const neededWidth = Math.ceil(innerWidth/zoomFactor);
        const neededHeight = Math.ceil(innerHeight/zoomFactor);
        const imageData = context.getImageData(offsetX, offsetY, neededWidth, neededHeight);
        const amplifiedRgba = amplifyRgba(imageData.data, zoomFactor, neededWidth, neededHeight);
        const amplifiedImageData = new ImageData(amplifiedRgba, neededWidth * zoomFactor, neededHeight * zoomFactor);
        screenCanvas.getContext('2d').putImageData(amplifiedImageData, 0, 0);
    }
};


const amplifyRgba = (rgba, zoom, w, h) => {
    let amplifiedRgba = rgba;
    if (zoom > 1) {
        amplifiedRgba = new Uint8ClampedArray(w * h * 4 * zoom * zoom);
        let z = 0;
        for (let y = 0; y < h; y++) {
            for (let yz = 0; yz < zoom; yz++) {
                for (let x = 0; x < w; x++) {
                    const i = y * w * 4 + x * 4;
                    for (let xz = 0; xz < zoom; xz++) {
                        amplifiedRgba[z++] = rgba[i];
                        amplifiedRgba[z++] = rgba[i + 1];
                        amplifiedRgba[z++] = rgba[i + 2];
                        amplifiedRgba[z++] = 255;
                    }
                }
            }
        }
    }
    return amplifiedRgba;
};


const onWindowMouseWheel = (event) => {
    const {clientX, clientY, deltaY} = event;
    const oldZoomFactor = zoomFactor;
    if (deltaY < 0) {
        zoomFactor = Math.min(zoomFactor + 1, 100);
    } else {
        zoomFactor = Math.max(zoomFactor - 1, 1);
    }
    if (zoomFactor === oldZoomFactor) {
        return;
    }
    const mouseIsAboveX = Math.round(offsetX + clientX/oldZoomFactor);
    offsetX = Math.max(mouseIsAboveX - clientX / zoomFactor, 0);
    const mouseIsAboveY = Math.round(offsetY + clientY/oldZoomFactor);
    offsetY = Math.max(mouseIsAboveY - clientY / zoomFactor, 0);

    refreshScreenCanvases();
};


const onWindowPointerDown = ({target, clientX, clientY}) => {
    if (target instanceof HTMLCanvasElement) {
        dragInitX = clientX;
        dragInitY = clientY;
        dragOffsetX = offsetX;
        dragOffsetY = offsetY;
        window.addEventListener('pointermove', onWindowPointerMove);
        window.addEventListener('pointerup', onWindowPointerUp);
    }
};


const onWindowPointerMove = ({clientX, clientY}) => {
    const deltaX = clientX - dragInitX;
    const deltaY = clientY - dragInitY;
    offsetX = Math.round(dragOffsetX - deltaX / zoomFactor);
    offsetX = Math.max(offsetX, 0);
    offsetY = Math.round(dragOffsetY - deltaY / zoomFactor);
    offsetY = Math.max(offsetY, 0);
    refreshScreenCanvases();
};


const onWindowPointerUp = () => {
    window.removeEventListener('pointermove', onWindowPointerMove);
    window.removeEventListener('pointerup', onWindowPointerUp);
};


const onInputChange = (event) => {
    const {name, checked} = event.currentTarget;
    localStorage.setItem(name, checked ? 'yes' : 'no');
    screenCanvases[name].style.display = checked ? 'block' : 'none';
};


const convertBgraToRgba = (bgraBuffer) => {
    const len = bgraBuffer.length;
    const rgba = new Uint8ClampedArray(len);
    let j = 0;
    for (let i = 0; i < len; i += 4) {
        rgba[j++] = bgraBuffer[i + 2];
        rgba[j++] = bgraBuffer[i + 1];
        rgba[j++] = bgraBuffer[i];
        rgba[j++] = bgraBuffer[i + 3];
    }
    return rgba;
};

run();