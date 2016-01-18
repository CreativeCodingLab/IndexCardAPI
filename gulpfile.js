// jshint esversion: 6

var gulp = require('gulp');
var spawn = require('child_process').spawn;

gulp.task('start-mongo', (cb) => {
  const mongod = spawn('mongod', ['--dbpath','./data','-v']);
  mongod.stdout.pipe(process.stdout);
  cb();
});

// // http://stackoverflow.com/a/28912360/502331
// function runCommand(command) {
//   return function (cb) {
//     exec(command, function (err, stdout, stderr) {
//       console.log(stdout);
//       console.log(stderr);
//       cb(err);
//     });
//   }
// }

// Running mongo
// http://stackoverflow.com/a/28048696/46810
// gulp.task('start-mongo', runCommand('mongod --dbpath ./data/'));
// gulp.task('start-mongo', () => {
//   exec('mongod --dbpath ./data', function (err, stdout, stderr) {
//     console.log('im a baby')
//     console.log(stdout);
//     console.log(stderr);
//     cb(err);
//   });
// });
