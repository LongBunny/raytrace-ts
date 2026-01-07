import {Vec3} from "./vector.js";
import {Ray} from "./ray.js";
import {HitInfo} from "./hitinfo.js";
import {BMath} from "./bmath.js";

export abstract class Material {
    emitted(hit: HitInfo): Vec3 {
        return Vec3.zero();
    }

    abstract scatter(ray: Ray, hit: HitInfo): Scatter | null;
}

export class Lambertian extends Material {
    albedo: Vec3;

    constructor(albedo: Vec3) {
        super();

        this.albedo = albedo;
    }

    scatter(_ray: Ray, hit: HitInfo): Scatter | null {
        let dir = Vec3.random_in_hemisphere_cosine(hit.normal);
        if (dir.near_zero()) dir = hit.normal;

        const eps = 1e-4;
        const origin = hit.point.add(hit.normal.mul(eps));
        return new Scatter(this.albedo, new Ray(origin, dir.normalize()));
    }
}

export class DiffuseLight extends Material {
    emission: Vec3;

    constructor(emission: Vec3) {
        super();

        this.emission = emission;
    }

    emitted(hit: HitInfo): Vec3 {
        return hit.front_face
            ? this.emission
            : Vec3.zero();
    }

    scatter(ray: Ray, hit: HitInfo): Scatter | null {
        return null;
    }
}

export class Metal extends Material {
    albedo: Vec3;
    fuzz: number;

    constructor(albedo: Vec3, fuzz: number = 0) {
        super();

        this.albedo = albedo;
        this.fuzz = BMath.clamp01(fuzz);
    }

    scatter(ray: Ray, hit: HitInfo): Scatter | null {
        const reflected = ray.dir.normalize().reflect(hit.normal);
        let dir = reflected.add(Vec3.random_in_unit_sphere().mul(this.fuzz));

        if (dir.dot(hit.normal) <= 0) return null;

        const eps = 1e-4;
        const origin = hit.point.add(hit.normal.mul(eps));
        return new Scatter(this.albedo, new Ray(origin, dir.normalize()));
    }
}

export class Dielectric extends Material {
    ior: number;

    constructor(ior: number) {
        super();
        this.ior = ior;
    }

    scatter(ray: Ray, hit: HitInfo): Scatter | null {
        const attenuation = Vec3.one();

        const refraction_ratio = hit.front_face ? (1.0 / this.ior) : this.ior;

        const unit_dir = ray.dir.normalize();
        const cos_theta = Math.min(unit_dir.mul(-1.0).dot(hit.normal), 1.0);
        const sin_theta = Math.sqrt(1.0 - cos_theta * cos_theta);

        const cannot_refract = refraction_ratio * sin_theta > 1.0;

        const reflect_probability = Dielectric.reflectance(cos_theta, refraction_ratio);

        let dir: Vec3;
        if (cannot_refract || Math.random() < reflect_probability) {
            dir = unit_dir.reflect(hit.normal);
        } else {
            dir = unit_dir.refract(hit.normal, refraction_ratio);
        }

        const eps = 1e-4;
        const offset = dir.dot(hit.normal) > 0
            ? hit.normal
            : hit.normal.mul(-1.0);
        const origin = hit.point.add(offset.mul(eps));
        return new Scatter(attenuation, new Ray(origin, dir.normalize()));
    }

    private static reflectance(cosine: number, ref_index: number) {
        let r0 = (1 - ref_index) / (1 + ref_index);
        r0 = r0 * r0;
        return r0 + (1 - r0) * Math.pow((1 - cosine), 5);
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