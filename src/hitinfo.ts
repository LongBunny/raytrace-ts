import { Vec3 } from './vector.js';

export class HitInfo {
    hit_distance: number;
    color: Vec3;

    constructor(hit_distance: number, color: Vec3) {
        this.hit_distance = hit_distance;
        this.color = color;
    }
}
