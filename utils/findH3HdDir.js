const readRegistry = require('./readRegistry');

const LOCATIONS = [
    'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Steam App 297000\\InstallLocation',
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