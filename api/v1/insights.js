const { BetaAnalyticsDataClient } = require('@google-analytics/data');

// Decode service account key from base64
const base64Key = process.env.GA_SERVICE_ACCOUNT_KEY_BASE64;
const credentials = JSON.parse(Buffer.from(base64Key, 'base64').toString());

// Initialize Analytics client
const analyticsDataClient = new BetaAnalyticsDataClient({ credentials });

exports.handler = async () => {
  try {
    const [response] = await analyticsDataClient.runRealtimeReport({
      property: `properties/${process.env.GA4_PROPERTY_ID}`,
      dimensions: [{ name: 'unifiedScreenName' }],
      metrics: [{ name: 'activeUsers' }],
    });

    const users = response.rows?.[0]?.metricValues?.[0]?.value || '0';

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ users }),
    };
  } catch (error) {
    console.error('Error fetching real-time users:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
