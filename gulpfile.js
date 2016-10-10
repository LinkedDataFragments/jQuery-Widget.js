var gulp = require('gulp'),
    pump = require('pump'),
    exec = require('child_process').exec,
    autoprefixer = require('autoprefixer'),
    concat = require('gulp-concat'),
    csso = require('postcss-csso'),
    del = require('del'),
    postcss = require('gulp-postcss'),
    replace = require('gulp-replace'),
    sourcemaps = require('gulp-sourcemaps'),
    sync = require('browser-sync').create(),
    uglify = require('gulp-uglify'),
    util = require('gulp-util');

var production = util.env.production;

gulp.task('default', ['build'], function () {
  sync.init({
    ui: false,
    notify: false,
    server: { baseDir: 'build' },
  });
  gulp.watch('*.html', ['html']);
  gulp.watch(['*.js', 'deps'], ['scripts']);
  gulp.watch('*.css', ['styles']);
  gulp.watch(['*.json', 'queries/**/*.sparql'], ['queries']);
});

gulp.task('clean', function () {
  return del('build');
});

gulp.task('build', ['html', 'queries', 'scripts', 'styles']);

gulp.task('html', function (done) {
  pump([
    gulp.src(['*.html', 'images/*.*', 'favicon.ico'], { base: './' }),
    gulp.dest('build'),
    sync.stream(),
  ], done);
});

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

gulp.task('scripts', ['scripts:ui', 'scripts:worker']);

gulp.task('scripts:ui', function (done) {
  pump([
    gulp.src([
      'deps/jquery-2.1.0.js',
      'deps/chosen-1.1.0.js',
      'deps/fast-scroller.js',
      'ldf-client-ui.js',
      'ldf-client-url-state.js',
    ]),
    sourcemaps.init(),
    concat('ldf-client-ui-packaged.js'),
    production ? uglify({ preserveComments: 'license' }) : util.noop(),
    sourcemaps.write('.'),
    gulp.dest('build/scripts'),
    sync.stream(),
  ], done);
});

gulp.task('scripts:worker', function (done) {
  pump([
    gulp.src([
      'deps/ldf-client-browser.js',
      'ldf-client-worker.js',
    ]),
    sourcemaps.init(),
    concat('ldf-client-worker.js'),
    // Correct lodash from window (browser) to self (Web Worker)
    replace(/var root =.*;/, 'var root = self;'),
    production ? uglify({ preserveComments: 'license' }) : util.noop(),
    sourcemaps.write('.'),
    gulp.dest('build/scripts'),
    sync.stream(),
  ], done);
});

gulp.task('styles', function (done) {
  pump([
    gulp.src('*.css'),
    postcss([
      autoprefixer,
      csso,
    ]),
    gulp.dest('build/styles'),
    sync.stream(),
  ], done);
});
