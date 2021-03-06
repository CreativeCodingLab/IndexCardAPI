const spawn = require('child_process').spawn;
const gulp = require('gulp');

const dbpath = '/data/mongo-data-index-cards';

gulp.task('start-mongo', function(cb) {
  // mongod --dbpath /data/mongodb-data --fork --logpath ./mongo.log --logappend
  const logpath = './mongo.log';
  const args = [
    '--dbpath', dbpath, '--fork', '--logpath', logpath, '--logappend'
  ];
  const process = spawn('mongod', args);
  process.stdout.on('data', d => console.log(d.toString()));
  process.stdout.on('error', d => console.log(d.toString()));
  return process.stdout;
});

gulp.task('stop-mongo', function(cb) {
  const args = [ '--shutdown', '--dbpath', dbpath ];
  const process = spawn('mongod', args);
  process.stdout.on('data', d => console.log(d.toString()));
  process.stdout.on('error', d => console.log(d.toString()));
  return process.stdout;
});
