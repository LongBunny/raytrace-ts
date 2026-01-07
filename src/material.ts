import {Vec3} from "./vector";

export class Material {
    albedo: Vec3;

    constructor(albedo: Vec3) {
        this.albedo = albedo;
    }
}