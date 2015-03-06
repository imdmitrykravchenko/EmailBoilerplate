var fs, gulp, gutil, sass, imagemin, connect, autoprefixer, jade, inlineCSS, s3, replace, open;

var autoPrefixBrowserList = ['last 2 version', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1', 'ios 6', 'android 4'];

fs          = require('fs');
gulp        = require('gulp');
gutil       = require('gulp-util');
sass        = require('gulp-sass');
connect     = require('gulp-connect');
imagemin    = require('gulp-imagemin');
jade        = require('gulp-jade');
inlineCSS   = require('gulp-inline-css');
autoprefixer= require('gulp-autoprefixer');
s3          = require('gulp-s3');
replace     = require('gulp-replace');
open        = require('gulp-open');

gulp.task('connect', function() {
  connect.server({
    root: '',
    livereload: true
  });
});


gulp.task("build", ['inline'], function() {
    if(!gutil.env.spam){
      console.log('Error: "spam" param is empty');
      return
    }
    var path = 'images/'+gutil.env.spam+'/';
    var spamFile = gutil.env.spam+'.html';
    if(!fs.existsSync(spamFile)){
      console.log('Error: spam '+spamFile+' is not exists');
      return; 
    }
    if(!fs.existsSync(path)){
      console.log('Error: '+path+' directory is not exists');
      return; 
    }

    var awsConfig = JSON.parse(fs.readFileSync('./aws.json'));

    var awsCredentials = awsConfig.awsCredentials;

    var uploadPath = awsConfig.uploadPath + gutil.env.spam + '/';

    var webUrl = 'http://'+awsCredentials.bucket+'.s3.amazonaws.com'+uploadPath;
    
    var regExpImages = new RegExp('(../)?images/'+gutil.env.spam+'/','ig');

    gulp.src(spamFile)
        .pipe(replace(regExpImages,webUrl))
        .pipe(gulp.dest('build/'));

    gulp.src([path+'*.png', path+'*.jpg', path+'*.gif'])
              .pipe(imagemin({ optimizationLevel: 5, progressive: true, interlaced: true }))
              .pipe(s3(awsCredentials,{
                  uploadPath: uploadPath, 
                  headers: {
                    'x-amz-acl': 'public-read'
                  }
              }));
    gulp.src('build/'+spamFile).pipe(open());
});


gulp.task('styles', function() {
    return gulp.src('styles/scss/*.scss')
               .pipe(sass({
                      errLogToConsole: true
               }))
               .pipe(autoprefixer({
                   browsers: autoPrefixBrowserList,
                   cascade:  true
               }))
               .on('error', gutil.log)
               .pipe(gulp.dest('styles'))
               .pipe(connect.reload());

});

gulp.task('jade',function(){
    return gulp.src('jade/*.jade')
        .pipe(jade())
        .pipe(gulp.dest(''));
});

gulp.task('html', function() {
    return gulp.src('*.html')
        .pipe(connect.reload())
       .on('error', gutil.log);
});

gulp.task('inline',['jade','styles'],function(){

    return gulp.src('*.html')
          .pipe(inlineCSS())
          .pipe(gulp.dest(''))
         .on('error', gutil.log);
});

gulp.task('reset',['jade']);

gulp.task('default', ['connect', 'styles', 'jade', 'html'], function() {
    
    gulp.watch('styles/scss/*.scss', ['styles']);
    gulp.watch('jade/*.jade', ['jade']);
    gulp.watch('*.html', ['html']);
    
});
