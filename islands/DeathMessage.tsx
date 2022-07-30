/** @jsx h */
import { h, RenderableProps } from "preact";

export default function JoinMessage({
    name,
    by
}: RenderableProps<{
    name: string,
    by: string
}>) {
    return (
        <div className="message">
            <div className="username" style="red">{name} was killed by {by}</div>
        </div>
    );
}