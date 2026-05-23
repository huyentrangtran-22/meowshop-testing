const createLogger = require("./utils/logger");
const { createBug } = require("./utils/jira");

let logger;
let testName;

exports.mochaHooks = {
    // =====================
    // BEFORE EACH TEST
    // =====================
    beforeEach() {
        testName = this.currentTest.title;

        logger = createLogger(testName);
        logger.log("===== START TEST =====");
        logger.log("Test: " + testName);
    },

    // =====================
    // AFTER EACH TEST
    // =====================
    afterEach: async function () {
        const state = this.currentTest.state;

        if (state === "passed") {
            logger.log("STATUS: PASSED");
        }

        if (state === "failed") {
            const error =
                this.currentTest.err?.message ||
                "Unknown error";

            logger.log("STATUS: FAILED");
            logger.log("ERROR: " + error);

            try {
                // =====================
                // CREATE JIRA BUG
                // =====================
                await createBug({
                    title: testName,     // ✅ CHỈ TÊN TEST CASE
                    logFile: logger.logFile
                });

            } catch (err) {
                // ❌ KHÔNG FAIL CI VÌ JIRA
                console.error("❌ Jira error:", err.message);
            }
        }

        logger.log("===== END TEST =====\n");
    }
};
