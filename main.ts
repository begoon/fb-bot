import { env } from "node:process";

const PORT = env.PORT || 8000;
const FB_VERIFY_TOKEN = env.FB_VERIFY_TOKEN;
console.log({ PORT, FB_VERIFY_TOKEN });

Deno.serve(
    {
        port: Number(PORT),
        onListen: () => console.log(`listing on port ${PORT}`),
    },
    (request: Request) => {
        console.log(request.method, request.url);
        const url = new URL(request.url);
        const params = url.searchParams;
        const path = url.pathname;
        if (path === "/callback") {
            const mode = params.get("hub.mode");
            const token = params.get("hub.verify_token");
            const challenge = params.get("hub.challenge");
            console.log({ mode, token, challenge });
            if (mode === "subscribe" && token === FB_VERIFY_TOKEN) {
                console.log("callback verified");
                return new Response(challenge);
            } else {
                console.log("callback failed");
                return new Response("failed", { status: 403 });
            }
        }
        return new Response("OK");
    }
);
