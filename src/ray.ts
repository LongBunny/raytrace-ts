import { Vec3 } from './vector.js';
import { Sphere } from './shape.js';
import { Scene } from './scene.js';
import { HitInfo } from './hitinfo.js';

export class Ray {
    origin: Vec3;
    dir: Vec3;

    constructor(origin: Vec3, dir: Vec3) {
        this.origin = origin;
        this.dir = dir;
    }

    trace(scene: Scene, bounce: number): Vec3 {
        if (bounce <= 0)
            return new Vec3(0.0, 0.0, 0.0);

        let color = new Vec3(0.0, 0.0, 0.0);
        let hit_dist = Number.POSITIVE_INFINITY;
        let hit_info: HitInfo | null = null;
        for (let shape of scene.shapes) {
            const new_hit_info = shape.intersects(this);
            if (new_hit_info === null)
                continue;

            if (new_hit_info.distance < hit_dist) {
                hit_dist = new_hit_info.distance;
                color = new_hit_info.color;
                hit_info = new_hit_info;
            }
        }

        if (hit_dist === Number.POSITIVE_INFINITY) {
            color = scene.get_env(this);
        }

        if (hit_info !== null) {
            const eps = 1e-4;
            const origin = hit_info.point.add(hit_info.normal.mul(eps));
            const new_ray = new Ray(origin, this.dir.reflect(hit_info.normal));
            const new_col = new_ray.trace(scene, bounce - 1);
            color = color.add(new_col);
        }

        return color;
    }
}
