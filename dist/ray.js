import { Vec3 } from './vector.js';
export class Ray {
    constructor(origin, dir) {
        this.origin = origin;
        this.dir = dir;
    }
    trace(spheres) {
        let color = new Vec3(0.0, 0.0, 0.0);
        let hit_dist = Number.POSITIVE_INFINITY;
        for (let sphere of spheres) {
            let hit_info = sphere.intersects(this);
            if (hit_info === null)
                continue;
            if (hit_info.hit_distance < hit_dist) {
                hit_dist = hit_info.hit_distance;
                color = hit_info.color;
            }
        }
        return color;
    }
}
