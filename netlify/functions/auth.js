exports.handler = async (event) => {
    const queryString = event.queryStringParameters;
    
    const allowedRef = "boxit_pc"; 

    if (queryString.ref === allowedRef) {
        return {
            statusCode: 200,
            body: "Access Granted. Page is loading...",
        };
    }

    return {
        statusCode: 302,
        headers: {
            Location: "/403.html",
        },
        body: "Redirecting...",
    };
    
};
