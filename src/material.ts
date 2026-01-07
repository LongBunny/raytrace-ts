import {Vec3} from "./vector";

export class Material {
    albedo: Vec3;
    emissive: Vec3;

    constructor(albedo: Vec3, emissive: Vec3) {
        this.albedo = albedo;
        this.emissive = emissive;
    }
}