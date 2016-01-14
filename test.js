// var exec = require('child_process').exec;
var spawn = require('child_process').spawn;

console.log('boop')

// exec('mongod --dbpath ./data', function (err, stdout, stderr) {
//   console.log(err)
//   console.log('im a baby')
//   console.log(stdout);
//   console.log(stderr);
// });

// const child = exec('mongod',
//   (error, stdout, stderr) => {
//     console.log('im a baby')
// });

const mongod = spawn('mongod', ['--dbpath','./data'])
mongod.stdout.pipe(process.stdout)
