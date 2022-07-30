/** @jsx h */
import { h, RenderableProps } from "preact";

export default function SpawnMessage({
    name
}: RenderableProps<{
    name: string
}>) {
    return (
        <div className="message">
            <div className="username">{name} spawned</div>
        </div>
    );
}