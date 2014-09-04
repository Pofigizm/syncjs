var conf = require((process.argv[2] + '').trim() || './build.conf.json'),
  fs = require('fs'),
  paths = require('path');

var sourceDir = paths.resolve(__dirname, conf.sourceDir),
  distDir = paths.resolve(__dirname, conf.distDir),
  sourceFiles = conf.files,
  outputString = '';


sourceFiles.forEach(function(file) {
  file = fs.readFileSync(paths.resolve(sourceDir, file));
  outputString += file.toString('utf8');
});

console.log(paths.resolve(distDir, conf.distName));

fs.writeFileSync(paths.resolve(distDir, conf.distName), outputString, {
  encoding: 'utf8'
});