const axios = require("axios");
const fs = require("fs");

const JIRA_URL = "https://huyentrangt0504.atlassian.net";
const EMAIL = "huyentrangt0504@gmail.com";
const API_TOKEN = "";
const PROJECT_KEY = "MEOW";

const auth = Buffer.from(`${EMAIL}:${API_TOKEN}`).toString("base64");

async function createBug({ title, logFile }) {
    try {
        // 1. Create issue
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

        // 2. Attach log file
        const formData = require("form-data");
        const FormData = new formData();

        FormData.append("file", fs.createReadStream(logFile));

        await axios.post(
            `${JIRA_URL}/rest/api/3/issue/${issueKey}/attachments`,
            FormData,
            {
                headers: {
                    Authorization: `Basic ${auth}`,
                    "X-Atlassian-Token": "no-check",
                    ...FormData.getHeaders()
                }
            }
        );

        console.log(`Created Jira bug: ${issueKey}`);
    } catch (err) {
        console.error("Jira error:", err.message);
    }
}

module.exports = { createBug };
