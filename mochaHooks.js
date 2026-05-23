afterEach(async function () {
    const state = this.currentTest.state;

    if (state === "passed") {
        logger.log("STATUS: PASSED");
    }

    if (state === "failed") {
        const error = this.currentTest.err?.message || "Unknown error";

        logger.log("STATUS: FAILED");
        logger.log("ERROR: " + error);

        try {
            await createBug({
                title: `${testName} - ${error}`,
                logFile: logger.logFile
            });
        } catch (err) {
            console.error("Create Jira bug failed:", err.message);
        }
    }

    logger.log("===== END TEST =====\n");
});
