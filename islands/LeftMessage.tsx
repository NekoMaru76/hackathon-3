/** @jsx h */
import { h, RenderableProps } from "preact";

export default function LeftMessage({
    name
}: RenderableProps<{
    name: string
}>) {
    return (
        <div className="message">
            <div className="username" style="red">{name} left the game</div>
        </div>
    );
}