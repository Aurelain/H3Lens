const readRegistry = require('./readRegistry');


const LOCATIONS = [
    'HKCU\\SOFTWARE\\Classes\\VirtualStore\\MACHINE\\SOFTWARE\\WOW6432Node\\New World Computing\\Heroes of Might and Magic® III\\1.0\\AppPath',
    'HKLM\\SOFTWARE\\WOW6432Node\\GOG.com\\Games\\1207658787\\path',
];

module.exports = async () => {
    for (const location of LOCATIONS) {
        const value = await readRegistry(location);
        if (value) {
            return value;
        }
    }
    return '';
};