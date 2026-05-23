const fs = require('fs')
const path = require('path')

exports.mochaHooks = {

  async afterEach() {

    const test = this.currentTest

    if (test.state === 'failed') {

      // tạo folder logs
      if (!fs.existsSync('logs')) {
        fs.mkdirSync('logs')
      }

      // file txt log
      fs.writeFileSync(
        path.join(
          'logs',
          `${test.title}.txt`
        ),
        test.err.stack
      )

      // screenshot
      if (global.driver) {

        const image =
          await global.driver.takeScreenshot()

        fs.writeFileSync(
          path.join(
            'logs',
            `${test.title}.png`
          ),
          image,
          'base64'
        )

      }

    }

  }

}
