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
                    const webhook_event = entry.changes.at(0);
                    const value = webhook_event.value;
                    const { item, verb, thread_id } = value;
                    if (
                        item === "comment" &&
                        verb === "add" &&
                        thread_id === FB_GROUP_ID
                    ) {
                        const { message, comment_id, from } = value;

                        console.log(
                            "received message",
                            inspect({ message, from })
                        );

                        fetch(
                            `https://graph.facebook.com/${comment_id}/replies`,
                            {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                    message: message,
                                    access_token: FB_PAGE_ACCESS_TOKEN,
                                }),
                            }
                        )
                            .then((response) => console.log("sent", response))
                            .catch((error) => console.error("error", error));
                    }
                }
            }
            return new Response("EVENT_RECEIVED");
        }
        return new Response("OK");
    }
);
