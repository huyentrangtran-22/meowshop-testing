const axios = require("axios");
const fs = require("fs");

// =====================
// ENV CONFIG
// =====================
const JIRA_URL = process.env.JIRA_URL;
const EMAIL = process.env.JIRA_EMAIL;
const API_TOKEN = process.env.JIRA_TOKEN;
const PROJECT_KEY = "MEOW";

// cache file để map test case → issueKey
const CACHE_FILE = "./utils/jira-cache.json";

if (!JIRA_URL || !EMAIL || !API_TOKEN) {
    throw new Error("❌ Missing Jira environment variables (GitHub Secrets not set)");
}

// Basic Auth
const auth = Buffer.from(`${EMAIL}:${API_TOKEN}`).toString("base64");

// =====================
// LOAD CACHE
// =====================
function loadCache() {
    if (!fs.existsSync(CACHE_FILE)) return {};
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
}

// =====================
// SAVE CACHE
// =====================
function saveCache(data) {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
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
        let issueKey = cache[title];

        // =====================
        // CREATE NEW ISSUE
        // =====================
        if (!issueKey) {
            const issueRes = await axios.post(
                `${JIRA_URL}/rest/api/3/issue`,
                {
                    fields: {
                        project: { key: PROJECT_KEY },
                        summary: cleanText(title),

                        issuetype: { name: "Bug" }
                    }
                },
                {
                    headers: {
                        Authorization: `Basic ${auth}`,
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    }
                }
            );

            issueKey = issueRes.data.key;
            cache[title] = issueKey;
            saveCache(cache);

            console.log("🆕 Created Jira issue:", issueKey);
        }

        // =====================
        // UPDATE DESCRIPTION (MỖI LẦN FAIL)
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
                                        text: cleanText(error || "No error message")
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
                    "Accept": "application/json"
                }
            }
        );

        console.log("♻ Updated Jira issue:", issueKey);

        // =====================
        // ATTACH LOG FILE
        // =====================
        if (logFile && fs.existsSync(logFile)) {
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

            console.log("📎 Attached log file:", logFile);
        } else {
            console.warn("⚠ Log file not found:", logFile);
        }

        return issueKey;

    } catch (err) {
        console.error("❌ Jira ERROR DETAIL:");
        console.error(JSON.stringify(err.response?.data || err.message, null, 2));
        return null;
    }
}

module.exports = { createBug };
