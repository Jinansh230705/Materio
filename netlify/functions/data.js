const fs = require("fs");
const path = require("path");

exports.handler = async (event) => {
    const allowedReferrers = [
        "https://materioa.netlify.app",  
        "https://cdn-materioa.netlify.app"
    ];

    const isLocal = process.env.CONTEXT === "dev" || process.env.NETLIFY_DEV;

    if (!isLocal && (!event.headers.referer || !allowedReferrers.some(ref => event.headers.referer.startsWith(ref)))) {
        return { statusCode: 403, body: "Forbidden: Invalid Referrer" };
    }

    const fileName = event.queryStringParameters.file;
    const userApiKey = event.queryStringParameters.key;
    const validApiKey = process.env.JSON_API_KEY; 

    if (validApiKey && userApiKey !== validApiKey) {
        return { statusCode: 403, body: "Forbidden: Invalid API Key" };
    }

    if (fileName === "users") {
        return { statusCode: 403, body: "Forbidden: Access Denied" };
    }

    if (!fileName) return { statusCode: 400, body: "File name required" };

    const filePath = path.join(__dirname, `${fileName}.json`);

    try {
        const jsonData = fs.readFileSync(filePath, "utf8");
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*", 
                "Cache-Control": "no-store, no-cache, must-revalidate"
            },
            body: jsonData
        };
    } catch (error) {
        return { statusCode: 404, body: "File not found" };
    }
};