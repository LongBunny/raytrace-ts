import { Vec3 } from './vector.js';
import { Ray } from './ray.js';

const sun = new Vec3(0.5, -1.0, 0.0).normalize();

export class Sphere {
    pos: Vec3;
    r: number;

    constructor(pos: Vec3, r: number) {
        this.pos = pos;
        this.r = r;
    }

    intersects(r: Ray): number[] {
        const oc = r.origin.sub(this.pos);

        const a = r.dir.dot(r.dir);
        const b = 2.0 * oc.dot(r.dir);
        const c = oc.dot(oc) - this.r * this.r;

        const discriminant = b * b - 4 * a * c;

        if (discriminant < 0.0)
            return [0.0, 0.0, 0.0];

        const sqr_dist = Math.sqrt(discriminant);
        const t1 = (-b - sqr_dist) / (2.0 * a);
        const t2 = (-b + sqr_dist) / (2.0 * a);

        if (t1 > 0.0 || t2 > 0.0) {
            const s = sun.dot(r.dir);
            if (s > 0.0)
                return [s, s, s];
            else
                return [0.0, 0.0, 0.0];
        }

        return [0.0, 0.0, 0.0];
    };
}
