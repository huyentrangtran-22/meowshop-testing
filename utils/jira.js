const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const path = require("path");

// =====================
// ENV CONFIG
// =====================
const JIRA_URL = process.env.JIRA_URL;
const EMAIL = process.env.JIRA_EMAIL;
const API_TOKEN = process.env.JIRA_TOKEN;
const PROJECT_KEY = "MEOW";

const CACHE_FILE = path.resolve(__dirname, "jiraCache.json");

if (!JIRA_URL || !EMAIL || !API_TOKEN) {
    throw new Error("❌ Missing Jira environment variables");
}

// =====================
// AUTH
// =====================
const auth = Buffer.from(`${EMAIL}:${API_TOKEN}`).toString("base64");

// =====================
// NORMALIZE KEY (🔥 FIX QUAN TRỌNG)
// =====================
function normalizeKey(text) {
    return (text || "")
        .toString()
        .trim()
        .replace(/\s+/g, " ")   // bỏ nhiều space
        .replace(/^\d+\)\s*/, "") // bỏ "1) "
}

// =====================
// LOAD CACHE
// =====================
function loadCache() {
    try {
        if (!fs.existsSync(CACHE_FILE)) return {};
        return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    } catch {
        return {};
    }
}

// =====================
// SAVE CACHE
// =====================
function saveCache(cache) {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

// =====================
// CLEAN TEXT
// =====================
function cleanText(text) {
    return (text || "")
        .toString()
        .replace(/\n/g, " ")
        .replace(/\r/g, " ")
        .replace(/\t/g, " ")
        .trim()
        .substring(0, 300);
}

// =====================
// CREATE OR UPDATE BUG
// =====================
async function createBug({ title, error, logFile }) {
    try {
        const cache = loadCache();

        const key = normalizeKey(title); // 🔥 FIX
        let issueKey = cache[key];

        // =====================
        // CREATE ISSUE
        // =====================
        if (!issueKey) {
            const res = await axios.post(
                `${JIRA_URL}/rest/api/3/issue`,
                {
                    fields: {
                        project: { key: PROJECT_KEY },
                        summary: key,
                        issuetype: { name: "Bug" }
                    }
                },
                {
                    headers: {
                        Authorization: `Basic ${auth}`,
                        "Content-Type": "application/json",
                        Accept: "application/json"
                    }
                }
            );

            issueKey = res.data.key;
            cache[key] = issueKey;
            saveCache(cache);

            console.log("🆕 Created Jira issue:", issueKey);
        }

        // =====================
        // UPDATE DESCRIPTION
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
                                        text: cleanText(error || "No error")
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
                    "Content-Type": "application/json",
                    Accept: "application/json"
                }
            }
        );

        console.log("♻ Updated Jira issue:", issueKey);

        // =====================
        // ATTACH LOG
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

            console.log("📎 Attached log:", logFile);
        }

        return issueKey;

    } catch (err) {
        console.error("❌ Jira ERROR:");
        console.error(JSON.stringify(err.response?.data || err.message, null, 2));
        return null;
    }
}

module.exports = { createBug };
