import { MiddlewareHandlerContext } from "$fresh/server.ts";
import { Room } from "game/room";

const rooms: Record<string, Room> = {};

export async function handler(
    req: Request,
    ctx: MiddlewareHandlerContext<typeof rooms>,
) {
    ctx.state = rooms;

    return await ctx.next();
}