import { Vec3 } from './vector.js';

export class HitInfo {
    distance: number;
    point: Vec3;
    normal: Vec3;
    color: Vec3;

    constructor(distance: number, point: Vec3, normal: Vec3, color: Vec3) {
        this.distance = distance;
        this.point = point;
        this.normal = normal;
        this.color = color;
    }
}
