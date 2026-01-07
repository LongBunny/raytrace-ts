import { Vec3 } from './vector.js';
import {Material} from "./material.js";

export class HitInfo {
    distance: number;
    point: Vec3;
    normal: Vec3;
    material: Material;

    constructor(distance: number, point: Vec3, normal: Vec3, material: Material) {
        this.distance = distance;
        this.point = point;
        this.normal = normal;
        this.material = material;
    }
}
