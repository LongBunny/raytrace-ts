import { Vec3 } from "./vector.js";
import { Ray } from "./ray.js";
export class Material {
    constructor(albedo) {
        this.albedo = albedo;
    }
    scatter(ray, hit) {
        let dir = hit.normal.add(Vec3.random_in_hemisphere(hit.normal));
        const eps = 1e-4;
        const origin = hit.point.add(hit.normal.mul(eps));
        if (dir.near_zero())
            dir = hit.normal;
        return new Scatter(this.albedo, new Ray(origin, dir.normalize()));
    }
}
export class Scatter {
    constructor(attenuation, ray) {
        this.attenuation = attenuation;
        this.ray = ray;
    }
}
