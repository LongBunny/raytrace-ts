import {Vec3} from "./vector.js";
import {Ray} from "./ray.js";
import {HitInfo} from "./hitinfo.js";

export class Material {
    albedo: Vec3;

    constructor(albedo: Vec3) {
        this.albedo = albedo;
    }

    scatter(ray: Ray, hit: HitInfo): Scatter {
        let dir = Vec3.random_in_hemisphere_cosine(hit.normal);

        const eps = 1e-4;
        const origin = hit.point.add(hit.normal.mul(eps));
        if (dir.near_zero()) dir = hit.normal;

        return new Scatter(this.albedo, new Ray(origin, dir.normalize()));
    }
}

export class Scatter {
    attenuation: Vec3;
    ray: Ray;

    constructor(attenuation: Vec3, ray: Ray) {
        this.attenuation = attenuation;
        this.ray = ray;
    }
}