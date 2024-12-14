exports.handler = async () => {
  const clientId = process.env.ADOBE_CLIENT_ID; // Fetch the key from the environment variable
  if (!clientId) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "API key not found" }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ clientId }),
  };
};
