var gulp = require('gulp'),
    pump = require('pump'),
    exec = require('child_process').exec,
    autoprefixer = require('autoprefixer'),
    browserify = require('browserify'),
    buffer = require('vinyl-buffer'),
    concat = require('gulp-concat'),
    csso = require('postcss-csso'),
    del = require('del'),
    postcss = require('gulp-postcss'),
    replace = require('gulp-replace'),
    source = require('vinyl-source-stream'),
    sourcemaps = require('gulp-sourcemaps'),
    sync = require('browser-sync').create(),
    uglify = require('gulp-uglify'),
    saveLicense = require('uglify-save-license'),
    util = require('gulp-util');

var production = util.env.production;

// Start a Web server
gulp.task('default', ['build'], function () {
  sync.init({
    ui: false,
    notify: false,
    server: { baseDir: 'build' },
  });
  gulp.watch('*.html', ['html']);
  gulp.watch('src/*', ['scripts']);
  gulp.watch('styles/*', ['styles']);
  gulp.watch(['*.json', 'queries/**/*.sparql'], ['queries']);
});

// Remove all generated files
gulp.task('clean', function () {
  return del(['build', 'deps/*-browser*.js*']);
});

// Create build/*
gulp.task('build', ['html', 'queries', 'scripts', 'styles']);

// Create build/index.html with images
gulp.task('html', function (done) {
  pump([
    gulp.src(['*.html', 'images/*.*', 'favicon.ico'], { base: './' }),
    gulp.dest('build'),
    sync.stream(),
  ], done);
});

// Create build/queries.json
gulp.task('queries', function (done) {
  exec('./queries-to-json', function (error) {
    if (error)
      return done(error);
    pump([
      gulp.src('queries.json'),
      gulp.dest('build'),
      sync.stream(),
    ], done);
  });
});

// Create build/scripts/*
gulp.task('scripts', ['scripts:ui', 'scripts:worker']);

// Create build/scripts/ldf-client-ui-packaged.js with source map
gulp.task('scripts:ui', ['deps:n3'], function (done) {
  pump([
    gulp.src([
      'deps/jquery-2.1.0.js',
      'deps/chosen-1.1.0.js',
      'deps/fast-scroller.js',
      'deps/n3-browser.js',
      'src/ldf-client-ui.js',
      'src/ldf-client-url-state.js',
    ], { base: './' }),
    sourcemaps.init({ loadMaps: true }),
    concat('ldf-client-ui-packaged.js'),
    production ? uglify({ output: { comments: saveLicense } }) : util.noop(),
    sourcemaps.write('./', { sourceRoot: '../' }),
    gulp.dest('build/scripts'),
    sync.stream(),
  ], done);
});

// Create build/scripts/ldf-client-worker.js with source map
gulp.task('scripts:worker', ['deps:ldf-client'], function (done) {
  pump([
    gulp.src([
      'deps/ldf-client-browser.js',
      'src/ldf-client-worker.js',
    ], { base: './' }),
    sourcemaps.init({ loadMaps: true }),
    concat('ldf-client-worker.js'),
    // Correct lodash from window (browser) to self (Web Worker)
    replace(/var root =.*;/, 'var root = self;'),
    production ? uglify({ output: { comments: saveLicense } }) : util.noop(),
    sourcemaps.write('./', { sourceRoot: '../' }),
    gulp.dest('build/scripts'),
    sync.stream(),
  ], done);
});

// Create deps/ldf-client-browser.js with source map
gulp.task('deps:ldf-client', function (done) {
  browerifyDependency('ldf', 'ldf-client', { exclude: ['stream'] }, done);
});

// Create deps/n3-browser.js with source map
gulp.task('deps:n3', function (done) {
  browerifyDependency('N3', 'n3', { exclude: [
    // The UI only uses the writer
    'util', 'stream',
    'n3/lib/N3Lexer.js', 'n3/lib/N3Parser.js',
    'n3/lib/N3Store.js', 'n3/lib/N3Util.js',
  ] }, done);
});

// Browserifies the module and save it as a dependency
function browerifyDependency(name, entry, options, done) {
  // Browserify the module
  var module = browserify({ debug: true, standalone: name }, { base: './' });
  module.add('node_modules/' + entry);
  options.exclude.forEach(function (excluded) {
    module.exclude(excluded);
    module.exclude('/node_modules/' + excluded);
  });
  // Save as a dependency with a source map
  pump([
    module.bundle(),
    source(entry + '-browser.js'),
    buffer(),
    sourcemaps.init({ loadMaps: true }),
    sourcemaps.write('./', { sourceRoot: '../' + entry }),
    gulp.dest('deps'),
  ], done);
}

// Create build/styles/*.css with source map
gulp.task('styles', function (done) {
  pump([
    gulp.src('styles/*.css'),
    postcss([
      autoprefixer,
      csso,
    ]),
    gulp.dest('build/styles'),
    sync.stream(),
  ], done);
});
