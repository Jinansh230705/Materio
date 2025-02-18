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
