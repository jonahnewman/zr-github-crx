import gulp from 'gulp'
import loadPlugins from 'gulp-load-plugins'
import webpack from 'webpack'
import rimraf from 'rimraf'

import popupWebpackConfig from './popup/webpack.config'
import eventWebpackConfig from './event/webpack.config'
import contentWebpackConfig from './content/webpack.config'

const plugins = loadPlugins()

gulp.task('popup-js', ['clean'], (cb) => {
  webpack(popupWebpackConfig, (err, stats) => {
    if (err) throw new plugins.util.PluginError('webpack', err)

    plugins.util.log('[webpack]', stats.toString())

    cb()
  })
})

gulp.task('event-js', ['clean'], (cb) => {
  webpack(eventWebpackConfig, (err, stats) => {
    if (err) throw new plugins.util.PluginError('webpack', err)

    plugins.util.log('[webpack]', stats.toString())

    cb()
  })
})

gulp.task('content-js', ['clean'], (cb) => {
  webpack(contentWebpackConfig, (err, stats) => {
    if (err) throw new plugins.util.PluginError('webpack', err)

    plugins.util.log('[webpack]', stats.toString())

    cb()
  })
})

gulp.task('popup-html', ['clean'], () => {
  return gulp.src('popup/src/index.html')
    .pipe(plugins.rename('popup.html'))
    .pipe(gulp.dest('./build'))
})

gulp.task('copy-manifest', ['clean'], () => {
  return gulp.src('manifest.json')
    .pipe(gulp.dest('./build'))
})

gulp.task('copy-icons', ['clean'], () => {
  return gulp.src('./icons/*.png')
    .pipe(gulp.dest('./build'))
})

gulp.task('copy-ace-diff', ['clean'], () => {
  return gulp.src(['./node_modules/ace-diff/dist/*',
    './node_modules/ace-diff/libs/*',
    './node_modules/ace-diff/demos/demo2/styles.css'])
    .pipe(gulp.dest('./build/ace-diff/'))
})

gulp.task('clean', (cb) => {
  rimraf('./build', cb)
})

gulp.task('build', ['copy-manifest', 'copy-icons', 'popup-js',
  'popup-html', 'event-js', 'content-js', 'copy-ace-diff'])

gulp.task('watch', ['default'], () => {
  gulp.watch('popup/**/*', ['build'])
  gulp.watch('event/**/*', ['build'])
  gulp.watch('content/**/*', ['build'])
})

gulp.task('default', ['build'])
