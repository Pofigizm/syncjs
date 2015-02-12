var builds = [
  require( './build/build.conf.json' ),
  require( './build/build.ie.json' ),
  require( './build/build.pointers.json' )
];

var gulp = require( 'gulp' ),
  rimraf = require( 'rimraf' ),
  uglify = require( 'gulp-uglify' ),
  concat = require( 'gulp-concat' ),
  rename = require( 'gulp-rename' );

gulp.task( 'clean-dist', function( cb ) {
  rimraf( './dist', cb );
});

gulp.task( 'build-dist', [ 'clean-dist' ], function() {

  builds.forEach(function( build ) {

    gulp.src( build.files.map(function( file ) {
      return build.sourceDir + file;
    }) )
      .pipe( concat( build.distName + '.js' ) )
      .pipe( gulp.dest( build.distDir ) )
      .pipe( rename( build.distName + '.min.js' ) )
      .pipe( uglify() )
      .pipe( gulp.dest( build.distDir ) );
  });
});

gulp.task( 'default', [ 'build-dist' ]);
