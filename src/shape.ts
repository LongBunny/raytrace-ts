import {Vec3} from './vector.js';
import {Ray} from './ray.js';
import {HitInfo} from './hitinfo.js';
import {Material} from "./material.js";

export interface Shape {
    intersects(ray: Ray): HitInfo | null;
}

export class Sphere implements Shape {
    pos: Vec3;
    r: number;
    material: Material;

    constructor(pos: Vec3, r: number, material: Material) {
        this.pos = pos;
        this.r = r;
        this.material = material;
    }

    intersects(ray: Ray): HitInfo | null {
        const oc = ray.origin.sub(this.pos);

        const a = ray.dir.dot(ray.dir);
        const b = 2.0 * oc.dot(ray.dir);
        const c = oc.dot(oc) - this.r * this.r;

        const discriminant = b * b - 4 * a * c;

        if (discriminant < 0.0)
            return null;

        const sqr_dist = Math.sqrt(discriminant);
        const t1 = (-b - sqr_dist) / (2.0 * a);
        const t2 = (-b + sqr_dist) / (2.0 * a);

        const eps = 1e-4;
        let t = Number.POSITIVE_INFINITY;
        if (t1 > eps) t = t1;
        else if (t2 > eps) t = t2;
        else return null;

        const point = ray.origin.add(ray.dir.mul(t));
        const normal = point.sub(this.pos).mul(1.0 / this.r);

        return new HitInfo(t, point, normal, this.material);
    };
}
