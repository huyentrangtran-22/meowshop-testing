const createLogger = require("./utils/logger");
const jira = require("./utils/jira");

let logger;
let currentTest;

exports.mochaHooks = {
    beforeEach() {
        currentTest = this.currentTest.title;
        logger = createLogger(currentTest);
        logger.log("START TEST");
    },

    afterEach() {
        if (this.currentTest.state === "passed") {
            logger.log("TEST PASSED");
        } else {
            logger.log("TEST FAILED");

            const errorMsg = this.currentTest.err?.message || "Unknown error";

            logger.log("ERROR: " + errorMsg);

            jira.createBug({
                title: `${currentTest} - ${errorMsg}`,
                logFile: logger.logFile
            });
        }
    }
};
