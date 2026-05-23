const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
require("dotenv").config(); // 🔥 thêm dòng này

const JIRA_URL = process.env.JIRA_URL;
const EMAIL = process.env.JIRA_EMAIL;
const API_TOKEN = process.env.JIRA_TOKEN;
const PROJECT_KEY = process.env.JIRA_PROJECT;

// 🔐 Check cấu hình trước khi chạy (rất quan trọng)
if (!JIRA_URL || !EMAIL || !API_TOKEN || !PROJECT_KEY) {
    throw new Error("❌ Missing Jira environment variables. Check .env file");
}

// Encode auth
const auth = Buffer.from(`${EMAIL}:${API_TOKEN}`).toString("base64");

async function createBug({ title, logFile }) {
    try {
        console.log("🚨 Creating Jira Bug...");

        // ======================
        // 1. CREATE ISSUE
        // ======================
        const issueRes = await axios.post(
            `${JIRA_URL}/rest/api/3/issue`,
            {
                fields: {
                    project: { key: PROJECT_KEY },
                    summary: title,
                    issuetype: { name: "Bug" }
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
        console.log("✅ Bug created:", issueKey);

        // ======================
        // 2. ATTACH LOG FILE
        // ======================
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

            console.log("📎 Log attached successfully");
        } else {
            console.log("⚠️ Log file not found, skip attachment");
        }

        return issueKey;

    } catch (err) {
        console.error("❌ Jira Error:");
        console.error(err.response?.data || err.message);
    }
}

module.exports = { createBug };
