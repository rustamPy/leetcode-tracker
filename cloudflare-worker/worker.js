
const ALLOWED_ORIGIN = "https://rustampy.github.io";
const LC_GQL = "https://leetcode.com/graphql";

export default {
    async fetch(request) {
        const origin = request.headers.get("Origin") ?? "";

        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: corsHeaders(origin),
            });
        }

        if (request.method !== "POST") {
            return new Response("Method Not Allowed", { status: 405 });
        }

        const body = await request.text();
        const session = request.headers.get("x-lc-session") ?? "";

        const upstream = await fetch(LC_GQL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Referer": "https://leetcode.com",
                "User-Agent": "Mozilla/5.0 (compatible; lc-proxy/1.0)",
                ...(session ? { "Cookie": `LEETCODE_SESSION=${session}` } : {}),
            },
            body,
        });

        const response = new Response(upstream.body, {
            status: upstream.status,
            headers: upstream.headers,
        });
        const h = corsHeaders(origin);
        for (const [k, v] of Object.entries(h)) response.headers.set(k, v);
        return response;
    },
};

function corsHeaders(origin) {
    const allowed = origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN;
    return {
        "Access-Control-Allow-Origin": allowed,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-lc-session",
    };
}
