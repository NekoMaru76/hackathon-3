/** @jsx h */
import { h, RenderableProps } from "preact";

export default function UserMessage({
    name,
    message
}: RenderableProps<{
    name: string,
    message: string
}>) {
    return (
        <div className="message">
            <a className="username">{name}:&nbsp;</a>
            <a className="user-message">{message}</a>
        </div>
    );
}