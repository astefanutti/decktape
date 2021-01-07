const path = require('path');

module.exports = {
    target: 'node',
    mode: 'production',
    entry: "./standalone.js",
    output: {
        path: path.resolve(__dirname),
        filename: 'webpack.js',
    },
    context: path.resolve(__dirname),
    node: {
        __filename: true,
        __dirname: true,
    },
    optimization: {
        minimize: false,
    },
    resolve: {
        extensions: ['.js', '.json'],
    },
};
