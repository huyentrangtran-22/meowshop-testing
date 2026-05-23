const createLogger = require("./utils/logger");
const { createBug } = require("./utils/jira");

let logger;
let testName;

exports.mochaHooks = {
    
    beforeEach() {
        testName = this.currentTest.title;

        logger = createLogger(testName);
        logger.log("===== START TEST =====");
        logger.log("Test: " + testName);
    },

    afterEach() {
        const state = this.currentTest.state;

        if (state === "passed") {
            logger.log("STATUS: PASSED");
        }

        if (state === "failed") {
            const error = this.currentTest.err?.message || "Unknown error";

            logger.log("STATUS: FAILED");
            logger.log("ERROR: " + error);

            // 🔥 GỌI JIRA TẠO BUG
            createBug({
                title: `${testName} - ${error}`,
                logFile: logger.logFile
            });
        }

        logger.log("===== END TEST =====\n");
    }
};
