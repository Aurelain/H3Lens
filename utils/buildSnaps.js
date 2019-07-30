module.exports = () => {
    const snaps = {};
    for (let i = 0; i <= 255; i++) {
        const floored = Math.floor(i / 16);
        const min = 16 * floored;
        const max = Math.min(16 * (floored + 1), 255);
        snaps[i] = (i - min > max - i) ? max : min;
    }
    return snaps;
};