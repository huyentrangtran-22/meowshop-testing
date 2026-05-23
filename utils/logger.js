const fs = require("fs");
const path = require("path");

function createLogger(testName) {
    const logFile = path.join(__dirname, `../logs/${testName}.log`);

    function log(message) {
        const time = new Date().toISOString();
        fs.appendFileSync(logFile, `[${time}] ${message}\n`);
    }

    return {
        log,
        logFile
    };
}

module.exports = createLogger;
