const fs = require("fs");
const path = require("path");

function createLogger(testName) {
    const logDir = path.join(__dirname, "..", "logs");

    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    const logFile = path.join(logDir, `${testName}.log`);

    return {
        logFile,
        log: (msg) => {
            fs.appendFileSync(logFile, msg + "\n");
        }
    };
}

module.exports = createLogger;
