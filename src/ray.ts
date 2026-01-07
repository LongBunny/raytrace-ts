import { Vec3 } from './vector.js';
import { Sphere } from './shape.js';
import { Scene } from './scene.js';
import { HitInfo } from './hitinfo.js';

export class Ray {
    origin: Vec3;
    dir: Vec3;

    constructor(origin: Vec3, dir: Vec3) {
        this.origin = origin;
        this.dir = dir;
    }

    at(t: number) {
        return this.origin.add(this.dir.mul(t));
    }
}
