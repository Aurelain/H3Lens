module.exports = (...args) => {
    for (const arg of args) {
        console.log(JSON.stringify(arg, null, 4));
    }
};