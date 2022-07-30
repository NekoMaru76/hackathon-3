/** @jsx h */
import { 
    h, 
    VNode,
    Fragment,
    createRef
} from "preact";
import { 
    useState, 
    useEffect,
    useRef
} from "preact/hooks";
import JoinMessage from "./JoinMessage.tsx";
import LeftMessage from "./LeftMessage.tsx";
import DeathMessage from "./DeathMessage.tsx";
import UserMessage from "./UserMessage.tsx";
import SpawnMessage from "./SpawnMessage.tsx";
import { width, height, Message } from "../static/data.ts";
import { asset } from "https://deno.land/x/fresh@1.0.1/runtime.ts";

enum Status {
    LoggedIn,
    Logging
}

interface Vector {
    x: number,
    y: number
}

export default function Display({
    roomId,
    name
}: { 
    roomId: string,
    name: string
}) {
    const canvRef = useRef<HTMLCanvasElement>(null);
    const node = <canvas id="canvas" ref={canvRef}></canvas>;
    const [msgs, setMsgs] = useState<Message[]>([]);
    const [els, setEls] = useState<VNode[]>([]);
    const [audio] = useState<{
        [key: string]: HTMLAudioElement
    } | false>(typeof Audio !== "undefined" && {
        Spawn: new Audio(asset("/sound/spawn.mp3")),
        Bullet: new Audio(asset("/sound/gun.mp3")),
        Death: new Audio(asset("/sound/impact.wav"))
    });

    let status = Status.Logging;
    let id: string;
    
    useEffect(() => {
        const ws = new WebSocket(`ws://localhost:8000/${roomId}/${name}`);
        const c = canvRef.current as HTMLCanvasElement;
        const ctx = c.getContext("2d") as CanvasRenderingContext2D;
        const resize = () => {
            c.width = c.height = Math.min(window.innerWidth, window.innerHeight);
        };
        const inputRef = createRef<HTMLInputElement>();
        const render = () => {
            const { 
                width : w, 
                height: h
            } = c;

            requestAnimationFrame(render);
            
            ctx.fillStyle = "black";

            ctx.fillRect(0, 0, w, h);
            ctx.save();
            
            try {
                ctx.translate(w/2, h/2);
                ctx.scale(c.width/width, c.height/height);

                if (wall.length) {
                    ctx.fillStyle = "rgb(248, 225, 195)";
                    ctx.lineWidth = 10;

                    ctx.beginPath();

                    for (let i = 0; i < wall.length; i++) {
                        const {
                            x,
                            y
                        } = wall[i];

                        ctx[i ? "lineTo" : "moveTo"](x, y);
                    }

                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                }

                for (const entity of Object.values(entities)) {
                    const { 
                        center: {
                            x: cx, 
                            y: cy
                        }, 
                        radius,
                        type 
                    } = entity;

                    ctx.fillStyle = "black";

                    ctx.beginPath();
                    ctx.arc(cx, cy, radius, 0, 2*Math.PI);
                    ctx.closePath();
                    ctx.fill();

                    if (type === "Player") {
                        ctx.font = "3px Arial";
                        ctx.fillStyle = "gray";

                        const { name } = entity;
                        const metrics = ctx.measureText(name);
                        const h = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
                        const w = metrics.width;

                        ctx.fillRect(cx-w/2-1, cy-radius-h-3.5, w+2.5, h+2.5);

                        ctx.fillStyle = "black";

                        ctx.fillText(name, cx-w/2, cy-radius-2.5);
                    }
                }
            } catch {}

            ctx.restore();
        };
        let entities: Record<string, ({
            center: Vector,
            radius: number
        } & ({
            type: "Player",
            name: string
        } | {
            type: "Bullet"
        }))> = {};
        let wall: Vector[] = [];

        ws.onclose = () => {
            alert("Socket has been closed");
            window.location.reload();
        };
        ws.onmessage = ({
            data
        }) => {
            const json = JSON.parse(data);
    
            switch (status) {
                case Status.Logging: {
                    const { error } = json;
    
                    if (error) {
                        alert(error);
                        return window.location.reload();
                    }
    
                    status = Status.LoggedIn;
                    id = json.id;
    
                    break;
                }
                case Status.LoggedIn: {
                    const msg: Message = json;
                    const { type } = msg;

                    if (type === "Data") {
                        entities = json.entities;
                        wall = json.wall;

                        break;
                    }
                    
                    if (audio) {
                        const sound = audio[type];
                    
                        if (sound) {
                            new Audio(sound.src).play();
                        }
                    }

                    if (type === "Bullet") break;

                    setMsgs(msgs => [...msgs, msg]);
    
                    break;
                }
            }
        };

        setEls([
            <input type="text" ref={inputRef} placeholder="Type Message" onChange={(e: Event) => {
                e.preventDefault();

                if (status !== Status.LoggedIn) return;

                const target = e.target as HTMLInputElement;

                ws.send(JSON.stringify({
                    type: "Message",
                    message: target.value
                }));

                target.value = "";                
            }}/>
            
        ]);
        const keys: string[] = [];

        c.addEventListener("mousedown", (e) => {
            const entity = entities[id];

            if (!entity) return;

            const {
                center: {
                    x: cx,
                    y: cy
                }
            } = entity;
            const rect = c.getBoundingClientRect();
            const x = (e.clientX - rect.left)/(c.width/width) - width/2;
            const y = (e.clientY - rect.top)/(c.height/height) - height/2;

            ws.send(JSON.stringify({
                type: "Bullet",
                rad: Math.atan2(y - cy, x - cx)
            }));
        });
        window.addEventListener("resize", resize);
        window.addEventListener("keydown", ({ repeat, key }) => {
            if (repeat || document.activeElement === inputRef.current || !["w", "a", "s", "d"].includes(key)) return;

            keys.push(key);
            ws.send(JSON.stringify({
                type: "Move",
                keys
            }));
        });
        window.addEventListener("keyup", ({ key }) => {
            if (!["w", "a", "s", "d"].includes(key)) return;

            while (keys.includes(key)) {
                keys.splice(keys.indexOf(key), 1);

                if (document.activeElement === inputRef.current) continue;
                if (keys.length) ws.send(JSON.stringify({
                    keys,
                    type: "Move"
                }));
                else ws.send(JSON.stringify({
                    type: "MoveStop"
                }));
            }
        });
        resize();
        requestAnimationFrame(render);
    }, []);

    return (
        <Fragment>
            {node}
            <div class="interactive-box">
                <div class="chat-box">
                    <h2>Chat:</h2>
                    {
                        msgs.map(msg => {
                            const { name } = msg;

                            switch (msg.type) {
                                case "User": return <UserMessage name={name} message={msg.message}/>;
                                case "Death": return <DeathMessage name={name} by={msg.by}/>;
                                case "Join": return <JoinMessage name={name} />;
                                case "Left": return <LeftMessage name={name} />;
                                case "Spawn": return <SpawnMessage name={name} />;
                            }
                        })
                    }
                </div>
                <div class="send-message">
                    {els}
                </div>
            </div>
        </Fragment>
    );
}