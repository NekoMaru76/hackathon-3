import Matter, { Vector } from "matter-js";
import { 
    Bullet, 
    Entity, 
    Player
} from "./entity.ts";
import Line from "mods/matter-lines/js/line.js";
import { width, height } from "static/data.ts";
import { Message } from "static/data.ts";

type Body = Matter.Body;
type Engine = Matter.Engine;

interface Pair {
    id: string,
    bodyA: Body,
    bodyB: Body
}

type Pairs = Pair[]

const {
    Engine,
    Runner,
    Events,
    Body,
    Composite,
    Bodies,
    Vertices
} = Matter;

//Common.setDecomp(Decomp);

export class Room {
    clients: Record<string, {
        id: string,
        ws: WebSocket,
        entity: Player
    }> = {};
    entities: Record<string, Entity> = {};
    interval = setInterval(() => {
        const entities = Object.fromEntries(Object.entries(this.entities).map(([id, entity]) => [id, entity.toJSON()]));
        const { wall } = this;

        this.sendData({
            entities,
            wall
        });
    }, 1000/30);
    runner = Runner.create();
    engine = Engine.create({
        gravity: {
            x: 0,
            y: 0
        }
    });
    wall: Vector[];

    static getRandVec(): Vector {
        return {
            x: Math.floor(Math.random() * (width-10)) - width/2+10,
            y: Math.floor(Math.random() * (height-10)) - height/2+10
        };
    }
    constructor(public id = crypto.randomUUID()) {
        const {
            entities,
            engine,
            runner
        } = this;

        this.wall = [
            { x: -width/2, y: -height/2 },
            { x:  width/2, y: -height/2 },
            { x:  width/2, y:  height/2 },
            { x: -width/2, y:  height/2 }
        ];
        
        for (const line of [
            new Line([{ x: -width/2, y: -height/2 }, { x:  width/2, y: -height/2 }], 5),
            new Line([{ x:  width/2, y: -height/2 }, { x:  width/2, y:  height/2 }], 5),
            new Line([{ x:  width/2, y:  height/2 }, { x: -width/2, y:  height/2 }], 5),
            new Line([{ x: -width/2, y:  height/2 }, { x: -width/2, y: -height/2 }], 5)
        ]) {
            const vecs = line.getVertices();
            const { x, y } = Vertices.centre(vecs);

            Composite.add(engine.world, Bodies.fromVertices(x, y, [vecs], {
                isStatic: true
            }));
        }

        Runner.run(runner, engine);
        Events.on(engine, "collisionActive", ({ pairs }: {
            pairs: Pairs,
            timestamp: number,
            source: Engine,
            name: string
        }) => {
            for (const pair of pairs) {
                let a: Body;
                let b: Body;

                const isABullet = pair.bodyA.label.startsWith("Bullet");
                const isBBullet = pair.bodyB.label.startsWith("Bullet");

                if (isABullet) {
                    Composite.remove(engine.world, pair.bodyA);

                    if (pair.bodyB.label.startsWith("Player")) {
                        a = pair.bodyB;
                        b = pair.bodyA;
                    } else continue;
                } else if (isBBullet) {
                    Composite.remove(engine.world, pair.bodyB);

                    if (pair.bodyA.label.startsWith("Player")) {
                        a = pair.bodyA;
                        b = pair.bodyB;
                    } else continue;
                }
                else continue;

                const id = a.label.replace("Player-", "");
                const by = (<Player>entities[b.label.replace("Bullet-", "")]).name;
                const entity = entities[id] as Player;
                const { name, body } = entity;

                if (by === name) continue;

                Body.setPosition(body, Room.getRandVec());
                this.sendDeath({
                    name,
                    by
                });
                this.sendSpawn({
                    name
                });
            }
        });
        Events.on(engine, "beforeUpdate", () => {
            for (const entity of Object.values(entities)) {
                const {
                    body
                } = entity;

                if (entity instanceof Player) {
                    const {
                        keys
                    } = entity as Player;

                    if (!keys) continue;

                    const vel = {
                        x: 0,
                        y: 0
                    };
    
                    for (const key of keys) switch (key) {
                        case "w": {
                            vel.y--;
        
                            break;
                        }
                        case "d": {
                            vel.x++;
        
                            break;
                        }
                        case "a": {
                            vel.x--;
        
                            break;
                        }
                        case "s": {
                            vel.y++;
        
                            break;
                        }
                    }
    
                    Body.setPosition(body, {
                        x: body.position.x+vel.x*0.5,
                        y: body.position.y+vel.y*0.5
                    });
                } else {
                    const { rad } = entity as Bullet;

                    Body.setPosition(body, {
                        x: body.position.x+Math.cos(rad),
                        y: body.position.y+Math.sin(rad)
                    });
                }
            }
        });
    }
    destroy() {
        clearInterval(this.interval);
    }
    send(data: Record<string, any> & {
        type: Message["type"]
    }) {
        for (const { ws } of Object.values(this.clients)) ws.send(JSON.stringify(data));
    }
    sendBullet() {
        this.send({
            type: "Bullet"
        });
    }
    sendDeath(data: { name: string, by: string }) {
        this.send({
            ...data,
            type: "Death"
        });
    }
    sendSpawn(data: { name: string }) {
        this.send({
            type: "Spawn",
            ...data
        });
    }
    sendData(data: {
        entities: Record<string, Entity>,
        wall: Vector[]
    }) {
        this.send({
            type: "Data",
            ...data
        });
    }
    sendJoin(data: { name: string }) {
        this.send({
            type: "Join",
            ...data
        });
    }
    sendLeft(data: { name: string }) {
        this.send({
            type: "Left",
            ...data
        });
    }
    sendUser(data: { name: string, message: string }) {
        this.send({
            type: "User",
            ...data
        });
    }
    addEntity(entity: Entity) {
        this.entities[entity.id] = entity;

        Composite.add(this.engine.world, entity.body);
    }
    rmEntity(entity: Entity) {
        delete this.entities[entity.id];

        Composite.remove(this.engine.world, entity.body);
    }
}