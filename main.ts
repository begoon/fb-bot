import { env } from "node:process";

const PORT = env.PORT || 8000;

const FB_VERIFY_TOKEN = env.FB_VERIFY_TOKEN;
const FB_PAGE_ACCESS_TOKEN = env.FB_PAGE_ACCESS_TOKEN;
const FB_GROUP_ID = env.FB_GROUP_ID;

console.log({
    PORT,
    FB_VERIFY_TOKEN,
    FB_GROUP_ID,
    FB_PAGE_ACCESS_TOKEN: FB_PAGE_ACCESS_TOKEN?.slice(0, 10) + "...",
});

function inspect(obj: any) {
    return Deno.inspect(obj, { depth: 1000, colors: true, compact: false });
}

Deno.serve(
    {
        port: Number(PORT),
        onListen: () => console.log(`listing on port ${PORT}`),
    },
    async (request: Request) => {
        console.log(request.method, request.url);
        const url = new URL(request.url);
        const method = request.method;
        const params = url.searchParams;
        const path = url.pathname;
        if (method == "GET" && path === "/callback") {
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
        if (method == "POST" && path === "/callback") {
            console.log("received message");
            const data = await request.json();
            console.log(inspect(data));
            if (data.object === "page") {
                for (const entry of data.entry) {
                    const webhook_event = entry.messaging[0];
                    const sender_psid = webhook_event.sender.id;

                    if (webhook_event.message) {
                        await handleMessage(sender_psid, webhook_event.message);
                    }
                }
            }
            return new Response("EVENT_RECEIVED");
        }
        return new Response("OK");
    }
);

async function handleMessage(sender_psid: string, received_message: any) {
    if (!received_message.text) {
        console.error("no text message");
        return;
    }
    const response = { text: `you said: ${received_message.text}` } as const;

    await callSendAPI(sender_psid, response);
}

async function callSendAPI(sender_psid: string, message_response: any) {
    const request = {
        recipient: {
            thread_key: FB_GROUP_ID,
        },
        message: message_response,
    };

    const q = "access_token=" + FB_PAGE_ACCESS_TOKEN;
    const r = await fetch("https://graph.facebook.com/v17.0/me/messages?" + q, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    console.log(r.status);
}
