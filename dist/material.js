import { Vec3 } from "./vector.js";
import { Ray } from "./ray.js";
import { BMath } from "./bmath.js";
export class Material {
    emitted(hit) {
        return Vec3.zero();
    }
}
export class Lambertian extends Material {
    constructor(albedo) {
        super();
        this.albedo = albedo;
    }
    scatter(_ray, hit) {
        let dir = Vec3.random_in_hemisphere_cosine(hit.normal);
        if (dir.near_zero())
            dir = hit.normal;
        const eps = 1e-4;
        const origin = hit.point.add(hit.normal.mul(eps));
        return new Scatter(this.albedo, new Ray(origin, dir.normalize()));
    }
}
export class DiffuseLight extends Material {
    constructor(emission) {
        super();
        this.emission = emission;
    }
    emitted(hit) {
        return hit.front_face
            ? this.emission
            : Vec3.zero();
    }
    scatter(ray, hit) {
        return null;
    }
}
export class Metal extends Material {
    constructor(albedo, fuzz = 0) {
        super();
        this.albedo = albedo;
        this.fuzz = BMath.clamp01(fuzz);
    }
    scatter(ray, hit) {
        const reflected = ray.dir.normalize().reflect(hit.normal);
        let dir = reflected.add(Vec3.random_in_unit_sphere().mul(this.fuzz));
        if (dir.dot(hit.normal) <= 0)
            return null;
        const eps = 1e-4;
        const origin = hit.point.add(hit.normal.mul(eps));
        return new Scatter(this.albedo, new Ray(origin, dir.normalize()));
    }
}
export class Scatter {
    constructor(attenuation, ray) {
        this.attenuation = attenuation;
        this.ray = ray;
    }
}
//# sourceMappingURL=material.js.map