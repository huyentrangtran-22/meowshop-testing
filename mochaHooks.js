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
// NORMALIZE TEST NAME (QUAN TRỌNG NHẤT)
// =====================
function normalizeTestName(title) {
    if (!title) return "UNKNOWN";

    return title
        .toString()
        .trim()
        .replace(/^\d+\)\s*/, "")   // bỏ "1) "
        .replace(/\s+/g, "_");      // chuẩn hóa key Jira cache
}

// =====================
// MOCHA HOOKS
// =====================
exports.mochaHooks = {
    beforeEach() {
        testName = normalizeTestName(this.currentTest.title);

        logger = createLogger(testName);
        logger.log("===== START TEST =====");
        logger.log("TEST: " + testName);
    },

    afterEach: async function () {
        const state = this.currentTest.state;

        try {
            // =====================
            // PASSED
            // =====================
            if (state === "passed") {
                logger.log("STATUS: PASSED");
            }

            // =====================
            // FAILED → CREATE/UPDATE JIRA
            // =====================
            if (state === "failed") {
                const error =
                    this.currentTest.err?.stack ||
                    this.currentTest.err?.message ||
                    "Unknown error";

                logger.log("STATUS: FAILED");
                logger.log("ERROR: " + error);

                await createBug({
                    title: testName,
                    error: error,
                    logFile: logger?.logFile
                });
            }
        } catch (err) {
            // ❌ KHÔNG FAIL CI
            console.error("❌ Hook error (ignored):", err.message);
        } finally {
            try {
                logger?.log("===== END TEST =====\n");
            } catch (e) {
                console.error("Logger error:", e.message);
            }
        }
    }
};
