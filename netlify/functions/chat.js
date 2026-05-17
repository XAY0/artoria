// Netlify Function — 代理 DeepSeek API 请求
// 解决移动运营商拦截境外 API 域名的问题
// 前端 -> Netlify(你的域名) -> DeepSeek API
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // CORS headers for PWA
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  try {
    const { apiKey, baseUrl, model, messages, system } = JSON.parse(event.body);

    if (!apiKey) {
      return {
        statusCode: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: { message: '缺少 API Key' } }),
      };
    }

    const url = (baseUrl || 'https://api.deepseek.com/anthropic').replace(/\/$/, '') + '/v1/messages';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'deepseek-v4-pro',
        max_tokens: 4096,
        temperature: 0.8,
        system,
        messages,
      }),
    });

    const data = await response.json();

    return {
      statusCode: response.status,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { message: e.message } }),
    };
  }
};
