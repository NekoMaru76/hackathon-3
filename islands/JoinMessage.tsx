/** @jsx h */
import { h, RenderableProps } from "preact";

export default function JoinMessage({
    name
}: RenderableProps<{
    name: string
}>) {
    return (
        <div className="message">
            <div className="username">{name} joined the game</div>
        </div>
    );
}