import { NextResponse } from "next/server";

/**
 * Optional AI enrichment for the Insights tool. The client always has a
 * heuristic summary; if ANTHROPIC_API_KEY is configured this route asks Claude
 * for a richer narrative + graphing suggestions. With no key it returns
 * { available: false } and the UI keeps the local heuristic — so the feature
 * degrades gracefully and never blocks.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  profile: unknown;
}

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({ available: false, reason: "no_api_key" });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const system =
    "You are a data-analysis assistant for laboratory researchers using a " +
    "scientific graphing app. Given a JSON profile of an uploaded dataset " +
    "(columns, types, ranges, correlations), write a concise, concrete " +
    "assessment. Be specific to the columns named. Respond ONLY with minified " +
    'JSON of the form {"summary": string, "suggestions": string[]} where ' +
    "summary is 2-3 sentences and suggestions is 3-5 short, actionable " +
    "graphing/analysis recommendations (name the columns and chart type).";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        system,
        messages: [
          { role: "user", content: JSON.stringify(body.profile).slice(0, 12000) },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json(
        { available: false, reason: "api_error", detail: detail.slice(0, 300) },
        { status: 200 },
      );
    }

    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    const text =
      data.content?.map((c) => c.text ?? "").join("").trim() ?? "";

    // Strip accidental code fences, then parse the JSON payload.
    const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    let parsed: { summary?: string; suggestions?: string[] } = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { summary: text };
    }

    return NextResponse.json({
      available: true,
      model: MODEL,
      summary: parsed.summary ?? "",
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    });
  } catch (e) {
    return NextResponse.json(
      { available: false, reason: "fetch_failed", detail: String(e).slice(0, 200) },
      { status: 200 },
    );
  }
}
