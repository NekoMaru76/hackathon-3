import { HandlerContext } from "$fresh/server.ts";
import { Room } from "game/room";

const alphabets = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const gen = () => "XXXXXXXXXXXX".replaceAll("X", () => {
    return alphabets[Math.floor(Math.random() * alphabets.length)];
});

export const handler = (req: Request, ctx: HandlerContext<void, Record<string, Room>>) => {
    const keys = Object.keys(ctx.state);
    const roomId = ctx.params?.room || keys[Math.floor(Math.random() * keys.length)] || gen();
    const room = ctx.state[roomId];

    while (true) {
        const name = ctx.params?.name || gen();
        let next = false;

        if (room) for (const { entity } of Object.values(room.clients)) if (entity.name === name) {
            next = true;

            break;
        }

        if (next) continue;

        return Response.redirect(new URL(`/${roomId}/${name}`, req.url));
    }
};