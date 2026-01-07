import {Vec3} from "./vector";

export class Material {
    color: Vec3;
    emissive: Vec3;

    constructor(color: Vec3, emissive: Vec3) {
        this.color = color;
        this.emissive = emissive;
    }
}