// const fs = require('fs');
// const content = fs.readFileSync('hello.txt');
const {spawn} = require('child_process');
const {desktopCapturer} = require('electron');

//console.log(process.versions.chrome);

// const ffi = require("ffi");
//const ref = require("ref");
/*
const onSources = async (sources) => {
    console.log('onSources=============');
    for (const source of sources) {
        console.log(source);
    }
};


desktopCapturer.getSources({ types: ['window'] }).then(onSources);
*/

/*
const activeWin = require('active-win');

setInterval(()=>{
    console.log('now');
    (async () => {
        console.log(await activeWin());
    })();
},1000);
*/

/*

var Buffer;

var user32 = new ffi.Library("user32", {
    "GetForegroundWindow": ["int32", []],
    "GetWindowTextA": ["int32", ["int32", "string", "int32"]],
});

function getForegroundWindowText() {
    var buffer = new Buffer(256);
    //buffer.type = ref.types.CString;
    var handle = user32.GetForegroundWindow();
    let length = user32.GetWindowTextA(handle, buffer, 256);
    return buffer.toString().substr(0, length);
}

console.log(getForegroundWindowText());



*/

const findH3Dir = require('./utils/findH3Dir');
const findH3HdDir = require('./utils/findH3HdDir');
(async () => {

    const h3Dir = await findH3Dir();
    const companion = spawn('client/companion.exe', [h3Dir]);

    // console.log(await findH3HdDir());


})();
