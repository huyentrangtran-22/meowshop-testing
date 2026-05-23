const axios = require("axios");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");

// =====================
// ENV CONFIG
// =====================
const JIRA_URL = process.env.JIRA_URL;
const EMAIL = process.env.JIRA_EMAIL;
const API_TOKEN = process.env.JIRA_TOKEN;
const PROJECT_KEY = "MEOW";

if (!JIRA_URL || !EMAIL || !API_TOKEN) {
    throw new Error("❌ Missing Jira environment variables (GitHub Secrets not set)");
}

// Basic Auth
const auth = Buffer.from(`${EMAIL}:${API_TOKEN}`).toString("base64");

// =====================
// CLEAN FUNCTION (QUAN TRỌNG)
// =====================
function cleanText(text) {
    return (text || "")
        .toString()
        .replace(/\n/g, " ")
        .replace(/\r/g, " ")
        .replace(/\t/g, " ")
        .substring(0, 200);
}

// =====================
// CREATE BUG FUNCTION
// =====================
async function createBug({ title, logFile }) {
    try {
        // 1. CREATE ISSUE
        const issueRes = await axios.post(
            `${JIRA_URL}/rest/api/3/issue`,
            {
                fields: {
                    project: { key: PROJECT_KEY },

                    // 🔥 FIX: clean summary tránh 400
                    summary: cleanText(title),

                    // bạn có thể đổi Task/Bug tùy Jira config
                    issuetype: { name: "Task" }
                }
            },
            {
                headers: {
                    Authorization: `Basic ${auth}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const issueKey = issueRes.data.key;
        console.log("Created Jira issue:", issueKey);

        // 2. ATTACH LOG FILE
        if (logFile && fs.existsSync(logFile)) {
            const form = new FormData();

            form.append("file", fs.createReadStream(logFile));

            await axios.post(
                `${JIRA_URL}/rest/api/3/issue/${issueKey}/attachments`,
                form,
                {
                    headers: {
                        Authorization: `Basic ${auth}`,
                        "X-Atlassian-Token": "no-check",
                        ...form.getHeaders()
                    }
                }
            );

            console.log("Attached log file:", logFile);
        } else {
            console.warn("⚠ Log file not found:", logFile);
        }

        return issueKey;

    } catch (err) {
        // 🔥 FIX: show real Jira error (QUAN TRỌNG DEBUG)
        console.error("❌ Jira ERROR DETAIL:");
        console.error(JSON.stringify(err.response?.data || err.message, null, 2));
    }
}

module.exports = { createBug };
