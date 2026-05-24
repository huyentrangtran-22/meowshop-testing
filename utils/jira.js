const axios = require("axios");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");

// =====================
const JIRA_URL = process.env.JIRA_URL;
const EMAIL = process.env.JIRA_EMAIL;
const API_TOKEN = process.env.JIRA_TOKEN;
const PROJECT_KEY = "MEOW";

// 🔥 FIX PATH CHUẨN CI/CD
const CACHE_FILE = path.resolve(process.cwd(), "utils", "jiraCache.json");

if (!JIRA_URL || !EMAIL || !API_TOKEN) {
    throw new Error("Missing Jira env variables");
}

// =====================
const auth = Buffer.from(`${EMAIL}:${API_TOKEN}`).toString("base64");

// =====================
// ENSURE FILE EXISTS
// =====================
function ensureCacheFile() {
    const dir = path.dirname(CACHE_FILE);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(CACHE_FILE)) {
        fs.writeFileSync(CACHE_FILE, "{}");
    }
}

// =====================
function loadCache() {
    ensureCacheFile();
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
}

function saveCache(cache) {
    ensureCacheFile();
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

// =====================
function normalizeKey(title) {
    return (title || "")
        .toString()
        .trim()
        .replace(/^\d+\)\s*/, "")
        .replace(/\s+/g, "_");
}

// =====================
async function createBug({ title, error, logFile }) {
    const cache = loadCache();

    const key = normalizeKey(title);
    let issueKey = cache[key];

    // =====================
    // CREATE ONLY ONCE
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
                    "Content-Type": "application/json"
                }
            }
        );

        issueKey = res.data.key;
        cache[key] = issueKey;
        saveCache(cache);

        console.log("🆕 Created Jira:", issueKey);
    }

    // =====================
    // ALWAYS UPDATE DESCRIPTION
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
    }

    console.log("♻ Updated Jira:", issueKey);

    return issueKey;
}

module.exports = { createBug };
