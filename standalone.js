const decktape = require('./decktape')

const { join } = require('path'),
    { tmpdir } = require('os'),
    puppeteer = require('puppeteer');

const tmpPath = tmpdir()
const chromePath = join(tmpPath, '.local-chromium')

// download browser
const browserFetcher = puppeteer.createBrowserFetcher({
    path: chromePath,
})
browserFetcher.download('809590', ((downloadBytes, totalBytes) => {
   console.log(`${downloadBytes}/${totalBytes}`) 
})).then(revisionInfo => {
    console.log(revisionInfo)
    decktape(revisionInfo.executablePath)
})
