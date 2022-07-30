import Matter, {
    Vector
} from "matter-js";

type Body = Matter.Body;

const {
    Bodies,
    Vertices
} = Matter;

export enum EntityType {
    Player,
    Bullet
}

export abstract class Entity {
    abstract type: EntityType;
    abstract id: string;

    constructor(public body: Body) {}
    toJSON() {
        const { type, body } = this;

        return {
            type: EntityType[type],
            center: Vertices.centre(body.vertices),
            radius: body.circleRadius
        };
    }
}

export class Player extends Entity {
    type = EntityType.Player;
    keys?: string[];

    constructor(public id: string, public name: string, center: Vector = { x: 0, y: 0 }) {
        super(Bodies.circle(center.x, center.y, 1.5, {
            label: "Player-" + id
        }));
    }
    shoot(rad: number) {
        return new Bullet({
            ...this.body.position,
        }, rad, this.id);
    }
    toJSON() {
        return {
            ...super.toJSON(),
            name: this.name
        };
    }
}

export class Bullet extends Entity {
    type = EntityType.Bullet;
    id = crypto.randomUUID();

    constructor(public first: Vector, public rad: number, by: string) {
        const body = Bodies.circle(first.x, first.y, 0.5, {
            label: "Bullet-" + by,
            frictionAir: 0
        });

        super(body);
        
    }
}