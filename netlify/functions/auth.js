exports.handler = async (event) => {
    const queryString = event.queryStringParameters;
    const cookies = event.headers.cookie || "";
    const allowedRef = "boxit_pc";

    if (cookies.includes("access_granted=true")) {
        return {
            statusCode: 200,
            body: "Authenticated. Continue to page.",
        };
    }

    if (queryString.ref === allowedRef) {
        return {
            statusCode: 302,
            headers: {
                "Set-Cookie": "access_granted=true; Path=/; HttpOnly",
                "Location": "/p", 
            },
            body: "Redirecting...",
        };
    }

    return {
        statusCode: 403,
        headers: {
            Location: "/403",
        },
        body: "Redirecting...",
    };
};
