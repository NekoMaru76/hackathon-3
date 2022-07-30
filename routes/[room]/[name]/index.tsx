/** @jsx h */
import { h, Fragment } from "preact";
import { asset } from "$fresh/runtime.ts";
import { Room } from "game/room";
import { PageProps, Handlers } from "$fresh/server.ts";
import Display from "islands/Display.tsx";
import { Player } from "game/entity";
import { gen } from "static/data.ts";

export const handler: Handlers<{
    room: Room,
    name: string
}, Record<string, Room>> = {
    async GET(req, ctx) {
        let {
            params: {
                room: roomId,
                name
            },
            state: rooms
        } = ctx;
        let room = rooms[roomId];

        name = name.slice(0, 12);

        if (!room) {
            room = new Room(roomId);
            rooms[room.id] = room;
        }

        for (const { 
            entity 
        } of Object.values(room.clients)) if (name === entity.name) return new Response(`${name} name is already exist`, {
            status: 409
        });

        if (req.headers.get("upgrade") === "websocket") {
            const { 
                socket: ws, 
                response 
            } = Deno.upgradeWebSocket(req);
            const id = gen();
            const entity = new Player(id, name, Room.getRandVec());

            ws.onopen = () => {
                ws.send(JSON.stringify({
                    error: null,
                    id
                }));

                room.clients[id] = {
                    id,
                    ws,
                    entity
                };

                room.sendJoin({
                    name
                });
                room.sendSpawn({
                    name
                });
                room.addEntity(entity);
            };
            ws.onerror = e => {
                console.log(`${id}: Error`, e);

                //delete ctx.state[room.id];
            };
            ws.onclose = () => {
                if (!room) return;

                delete room.clients[id];

                room.rmEntity(entity);
                room.sendLeft({ name });

                if (!Object.keys(room.clients).length) {
                    room.destroy();

                    delete ctx.state[room.id];
                }
            }
            ws.onerror = e => {
                console.error(e);
            };
            ws.onmessage = ({
                data
            }) => {
                try {
                    const json = JSON.parse(data);

                    switch (json.type) {
                        case "Message": {
                            room.sendUser({
                                name,
                                message: json.message
                            });

                            break;
                        }
                        case "Move": {
                            entity.keys = (json.keys as string[]).filter(key => ["w", "a", "s", "d"].includes(key));

                            break;
                        }
                        case "MoveStop": {
                            delete entity.keys;

                            break;
                        }
                        case "Bullet": {
                            room.addEntity(entity.shoot(json.rad));
                            room.sendBullet();

                            break;
                        }
                    }
                } catch (e) {
                    console.log(`${id}: Failed to parse message`, e);
                }
            };
            
            return response;
        }

        return await ctx.render({
            room,
            name
        });
    }
}

export default function Page({
    data: {
        name,
        room
    }
}: PageProps<{
    room: Room,
    name: string
}>) {
    return (
        <Fragment>
            <link rel="stylesheet" href={asset("/css/style.css")} />
            <title>Dots.io</title>
            <Display roomId={room.id} name={name}/>
        </Fragment>
    );
}
