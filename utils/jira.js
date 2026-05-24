const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

// =====================
const JIRA_URL = process.env.JIRA_URL;
const EMAIL = process.env.JIRA_EMAIL;
const API_TOKEN = process.env.JIRA_TOKEN;
const PROJECT_KEY = "MEOW";

if (!JIRA_URL || !EMAIL || !API_TOKEN) {
    throw new Error("Missing Jira env");
}

const auth = Buffer.from(`${EMAIL}:${API_TOKEN}`).toString("base64");

// =====================
// CLEAN TEST NAME
// =====================
function getTestKey(title) {
    return (title || "")
        .toString()
        .replace(/^\d+\)\s*/, "")
        .trim();
}

// =====================
// FIND ISSUE IN JIRA (🔥 KEY FIX)
// =====================
async function findIssue(testKey) {
    try {
        const res = await axios.get(
            `${JIRA_URL}/rest/api/3/search`,
            {
                headers: {
                    Authorization: `Basic ${auth}`,
                    Accept: "application/json"
                },
                params: {
                    jql: `project=${PROJECT_KEY} AND summary ~ "${testKey}"`
                }
            }
        );

        return res.data.issues?.[0]?.key || null;
    } catch (err) {
        console.error("Search error:", err.message);
        return null;
    }
}

// =====================
async function createIssue(testKey) {
    const res = await axios.post(
        `${JIRA_URL}/rest/api/3/issue`,
        {
            fields: {
                project: { key: PROJECT_KEY },
                summary: testKey,
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

    return res.data.key;
}

// =====================
async function updateIssue(issueKey, error) {
    await axios.put(
        `${JIRA_URL}/rest/api/3/issue/${issueKey}`,
        {
            fields: {
                description: {
                    type: "doc",
                    version: 1,
                    content: [
                        {
                            type: "paragraph",
                            content: [
                                {
                                    type: "text",
                                    text: error || "No error"
                                }
                            ]
                        }
                    ]
                }
            }
        },
        {
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/json"
            }
        }
    );
}

// =====================
async function attachLog(issueKey, logFile) {
    if (!logFile || !fs.existsSync(logFile)) return;

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
}

// =====================
// MAIN
// =====================
async function createBug({ title, error, logFile }) {
    try {
        const testKey = getTestKey(title);

        // 🔥 SEARCH FIRST
        let issueKey = await findIssue(testKey);

        if (!issueKey) {
            issueKey = await createIssue(testKey);
            console.log("🆕 Created:", issueKey);
        } else {
            console.log("♻ Reuse:", issueKey);
        }

        await updateIssue(issueKey, error);
        await attachLog(issueKey, logFile);

        console.log("✅ Done:", issueKey);

        return issueKey;

    } catch (err) {
        console.error("❌ Jira ERROR:", err.response?.data || err.message);
    }
}

module.exports = { createBug };
