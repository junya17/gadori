// POST /api/explain  { prompt: string }
// APIキーはCloudflareの環境変数に置き、ブラウザには出さない。

const MODEL = "claude-haiku-4-5-20251001";

export async function onRequestPost({ request, env }) {
  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: "APIキーが設定されていません" }, 500);
  }

  let prompt;
  try {
    ({ prompt } = await request.json());
  } catch {
    return json({ error: "リクエストの形式が不正です" }, 400);
  }

  if (typeof prompt !== "string" || prompt.length < 10) {
    return json({ error: "プロンプトが空です" }, 400);
  }
  // 想定外に長い入力でコストが跳ねるのを防ぐ
  if (prompt.length > 8000) {
    return json({ error: "テキストが長すぎます。分割してください" }, 413);
  }

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return json(
      { error: `モデルの呼び出しに失敗しました (${upstream.status})`, detail: detail.slice(0, 300) },
      upstream.status
    );
  }

  return new Response(upstream.body, {
    headers: { "content-type": "application/json" },
  });
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}
