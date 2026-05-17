// EdgeOne Pages Node Function — 代理 DeepSeek API 请求
// 前端 -> EdgeOne(国内节点) -> DeepSeek API

export default async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const body = await request.json();
    const { apiKey, baseUrl, model, messages, system } = body;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: { message: '缺少 API Key' } }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const url =
      (baseUrl || 'https://api.deepseek.com/anthropic').replace(/\/$/, '') +
      '/v1/messages';

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

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: { message: e.message } }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
