export const width = 100;
export const height = 100;

export interface BaseMessage<Type extends string = string> {
    type: Type,
    name: string
}

export interface UserMessage extends BaseMessage<"User"> {
    message: string
}

export type JoinMessage = BaseMessage<"Join">

export type LeftMessage = BaseMessage<"Left">

export interface DeathMessage extends BaseMessage<"Death"> {
    by: string
}

export type SpawnMessage = BaseMessage<"Spawn">

export type BulletMessage = BaseMessage<"Bullet">

export type DataMessage = BaseMessage<"Data"> & Record<string, any>

export type Message = UserMessage | JoinMessage | LeftMessage | DeathMessage | SpawnMessage | BulletMessage | DataMessage