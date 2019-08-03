/**
 *
 * @param rgba
 * @param w
 * @param h
 * @param zoom
 */
module.exports = (rgba, w, h, zoom = 1) => {
    let showRgba = rgba;
    if (zoom > 1) {
        showRgba = new Uint8ClampedArray(w * h * 4 * zoom * zoom);
        let z = 0;
        for (let y = 0; y < h; y++) {
            for (let yz = 0; yz < zoom; yz++) {
                for (let x = 0; x < w; x++) {
                    const i = y * w * 4 + x * 4;
                    for (let xz = 0; xz < zoom; xz++) {
                        showRgba[z++] = rgba[i];
                        showRgba[z++] = rgba[i + 1];
                        showRgba[z++] = rgba[i + 2];
                        showRgba[z++] = rgba[i + 3];
                    }
                }
            }
        }
        w *= zoom;
        h *= zoom;
    }
    const imageData = new ImageData(showRgba, w, h);
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;left:0;top:0;background:lime';
    canvas.width = w;
    canvas.height = h;
    const context = canvas.getContext('2d');
    context.putImageData(imageData, 0, 0);
    document.body.appendChild(canvas);
};