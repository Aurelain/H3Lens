const winreg = require('winreg');

const toPromise = (ctx, func, ...args) => {
    return new Promise((resolve, reject) => {
        args.push((err, res) => {
            if (err) reject(err);
            else resolve(res);
        });
        func.apply(ctx, args);
    });
};


module.exports = async (path) => {
    const parts = path.split('\\');
    const hive = parts.shift();
    const itemName = parts.pop();
    const key = '\\' + parts.join('\\');

    const regKey = winreg({hive, key});
    try {
        const items = await toPromise(regKey, regKey.values);
        for (const item of items) {
            if (item.name === itemName) {
                return item.value;
            }
        }
    } catch (error) {
    }
    return '';
};