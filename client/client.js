// const fs = require('fs');
// const content = fs.readFileSync('hello.txt');
const {desktopCapturer} = require('electron');
console.log(process.versions.chrome);

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
/*
const { spawn } = require('child_process');
const test = spawn('client/companion.exe', ['hello']);
test.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
});

test.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`);
});

test.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
});
*/
/*
const winreg = require('winreg');
const regKey = winreg({
    hive: winreg.HKCU,
    key:  '\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
});


// list autostart programs
regKey.values(function (err, items) {
    if (err)
        console.log('ERROR: '+err);
    else
        for (var i=0; i<items.length; i++)
            console.log('ITEM: '+items[i].name+'\t'+items[i].type+'\t'+items[i].value);
});
*/
const findH3Dir = require('./utils/findH3Dir');
const findH3HdDir = require('./utils/findH3HdDir');
(async () => {


    console.log(await findH3Dir());
    console.log(await findH3HdDir());


})();
