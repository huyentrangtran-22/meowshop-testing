const createLogger = require("./utils/logger");
const { createBug } = require("./utils/jira");

let logger;
let testName;

// =====================
// GLOBAL ERROR HANDLING
// =====================
process.on("uncaughtException", (err) => {
    console.error("❌ Uncaught Exception:", err.message);
});

process.on("unhandledRejection", (err) => {
    console.error("❌ Unhandled Rejection:", err);
});

// =====================
// MOCHA HOOKS
// =====================
exports.mochaHooks = {
    beforeEach() {
        testName = this.currentTest.title;

        logger = createLogger(testName);
        logger.log("===== START TEST =====");
        logger.log("Test: " + testName);
    },

    afterEach: async function () {
        const state = this.currentTest.state;

        try {
            if (state === "passed") {
                logger.log("STATUS: PASSED");
            }

            if (state === "failed") {
                const error =
                    this.currentTest.err?.stack ||
                    this.currentTest.err?.message ||
                    "Unknown error";

                logger.log("STATUS: FAILED");
                logger.log("ERROR: " + error);

                // =====================
                // SAFE JIRA CALL
                // =====================
                await createBug({
                    title: testName,
                    error: error,
                    logFile: logger?.logFile
                });
            }
        } catch (err) {
            // ❌ KHÔNG làm fail test run
            console.error("❌ Hook error:", err.message);
        } finally {
            // ALWAYS RUN
            try {
                logger.log("===== END TEST =====\n");
            } catch (e) {
                console.error("Logger error:", e.message);
            }
        }
    }
};
