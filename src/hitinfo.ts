import { Vec3 } from './vector.js';
import {Material} from "./material.js";

export class HitInfo {
    distance: number;
    point: Vec3;
    normal: Vec3;
    front_face: boolean;
    material: Material;

    constructor(distance: number, point: Vec3, normal: Vec3, front_face: boolean, material: Material) {
        this.distance = distance;
        this.point = point;
        this.normal = normal;
        this.front_face = front_face;
        this.material = material;
    }
}
