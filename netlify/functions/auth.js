exports.handler = async (event) => {
    const queryString = event.queryStringParameters;
    
    const allowedRef = "boxit_pc"; 

    if (queryString.ref === allowedRef) {
        return {
            statusCode: 302, 
            headers: {
                Location: "/p", 
            },
            body: "Redirecting...",
        };
    }

    return {
        statusCode: 302,
        headers: {
            Location: "/403",
        },
        body: "Redirecting...",
    };
    
};


exports.handler = async (event) => {
    const queryString = event.queryStringParameters;
    const cookies = event.headers.cookie || "";
    const allowedRef = "boxit_pc";

    // Check if the user already has the auth cookie
    if (cookies.includes("access_granted=true")) {
        return {
            statusCode: 200,
            body: "Authenticated. Continue to page.",
        };
    }

    // If `ref` is correct, set a cookie and redirect to /p
    if (queryString.ref === allowedRef) {
        return {
            statusCode: 302,
            headers: {
                "Set-Cookie": "access_granted=true; Path=/; HttpOnly",
                "Location": "/p",  // Redirect to actual page
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
