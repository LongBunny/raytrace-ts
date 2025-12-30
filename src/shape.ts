import { Vec3 } from './vector.js';
import { Ray } from './ray.js';
import { HitInfo } from './hitinfo.js';

const sun = new Vec3(0.5, -1.0, 0.0).normalize();

export class Sphere {
    pos: Vec3;
    r: number;
    color: Vec3;

    constructor(pos: Vec3, r: number, color: Vec3) {
        this.pos = pos;
        this.r = r;
        this.color = color;
    }

    intersects(r: Ray): HitInfo | null {
        const oc = r.origin.sub(this.pos);

        const a = r.dir.dot(r.dir);
        const b = 2.0 * oc.dot(r.dir);
        const c = oc.dot(oc) - this.r * this.r;

        const discriminant = b * b - 4 * a * c;

        if (discriminant < 0.0)
            return null;

        const sqr_dist = Math.sqrt(discriminant);
        const t1 = (-b - sqr_dist) / (2.0 * a);
        const t2 = (-b + sqr_dist) / (2.0 * a);

        if (t1 > 0.0 || t2 > 0.0) {
            const s = sun.dot(r.dir);

            let out_color = this.color.mul(s * 2.0);

            return new HitInfo(t1 > 0.0 ? t1 : t2, out_color);
        }

        return null;
    };
}
