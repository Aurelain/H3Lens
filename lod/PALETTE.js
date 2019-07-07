const rgbToDec = require('../utils/rgbToDec');

module.exports = {
    '0': true,
    [rgbToDec(0, 255, 255)]: true,
    [rgbToDec(255, 150, 255)]: true,
    [rgbToDec(255, 100, 255)]: true,
    [rgbToDec(255, 50, 255)]: true,
    [rgbToDec(255, 0, 255)]: true,
    [rgbToDec(255, 255, 0)]: true,
    [rgbToDec(180, 0, 255)]: true,
    [rgbToDec(0, 255, 0)]: true,
    [rgbToDec(255, 128, 255)]: true,
};