const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

const JIRA_URL = process.env.JIRA_URL;
const EMAIL = process.env.JIRA_EMAIL;
const API_TOKEN = process.env.JIRA_TOKEN;
const PROJECT_KEY = "MEOW";

const auth = Buffer.from(`${EMAIL}:${API_TOKEN}`).toString("base64");

// CLEAN KEY
function normalizeKey(text) {
    return (text || "")
        .toString()
        .trim()
        .replace(/^\d+\)\s*/, "")
        .replace(/\s+/g, "_");
}

// SEARCH ISSUE IN JIRA (🔥 QUAN TRỌNG)
async function findIssue(testKey) {
    const jql = `project=${PROJECT_KEY} AND summary~"${testKey}" ORDER BY created DESC`;

    const res = await axios.get(
        `${JIRA_URL}/rest/api/3/search?jql=${encodeURIComponent(jql)}`,
        {
            headers: {
                Authorization: `Basic ${auth}`,
                Accept: "application/json"
            }
        }
    );

    return res.data.issues?.[0]?.key || null;
}

async function createBug({ title, error, logFile }) {
    try {
        const testKey = normalizeKey(title);

        // =====================
        // 1. FIND EXISTING ISSUE
        // =====================
        let issueKey = await findIssue(testKey);

        // =====================
        // 2. CREATE IF NOT FOUND
        // =====================
        if (!issueKey) {
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

            issueKey = res.data.key;
            console.log("🆕 Created:", issueKey);
        } else {
            console.log("♻ Reuse existing:", issueKey);
        }

        // =====================
        // 3. UPDATE DESCRIPTION
        // =====================
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
                                        text: (error || "No error").slice(0, 300)
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

        // =====================
        // 4. ATTACH LOG
        // =====================
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
        }

        return issueKey;

    } catch (err) {
        console.error("Jira error:", err.response?.data || err.message);
        return null;
    }
}

module.exports = { createBug };
