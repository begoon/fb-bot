import { env } from "node:process";

const PORT = env.PORT || 8000;

Deno.serve(
    {
        port: Number(PORT),
        onListen: () => console.log(`listing on port ${PORT}`),
    },
    (request: Request) => {
        console.log(request.method, request.url);
        return new Response("OK");
    }
);
