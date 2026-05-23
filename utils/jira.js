const axios = require("axios");
const fs = require("fs");

const JIRA_URL = process.env.JIRA_URL;
const EMAIL = process.env.JIRA_EMAIL;
const API_TOKEN = process.env.JIRA_TOKEN;

if (!JIRA_URL || !EMAIL || !API_TOKEN) {
    throw new Error("❌ Missing Jira environment variables (GitHub Secrets not set)");
}

const auth = Buffer.from(`${EMAIL}:${API_TOKEN}`).toString("base64");

async function createBug({ title, logFile }) {
    try {
        const issueRes = await axios.post(
            `${JIRA_URL}/rest/api/3/issue`,
            {
                fields: {
                    project: { key: "MEOW" },
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

        const FormData = require("form-data");
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

        console.log("Created Jira bug:", issueKey);
    } catch (err) {
        console.error("Jira error:", err.message);
    }
}

module.exports = { createBug };
