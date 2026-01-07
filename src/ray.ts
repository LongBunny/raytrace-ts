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
        let color = new Vec3(0.0, 0.0, 0.0);
        let hit_dist = Number.POSITIVE_INFINITY;
        let hit_info: HitInfo | null = null;
        for (let shape of scene.shapes) {
            const new_hit_info = shape.intersects(this);
            if (new_hit_info === null)
                continue;

            if (new_hit_info.distance < hit_dist) {
                hit_dist = new_hit_info.distance;
                hit_info = new_hit_info;
            }
        }

        if (hit_dist === Number.POSITIVE_INFINITY) {
            color = scene.get_env(this);
        }

        if (hit_info !== null) {
            // color = emissive + albedo * trace(reflected, bounce-1)
            const mat = hit_info.material;
            color = color.add(mat.emissive);

            if (bounce > 0) {
                const eps = 1e-4;
                const reflect_dir = this.dir.reflect(hit_info.normal);
                const offset_dir = this.dir.dot(hit_info.normal) > 0.0
                    ? hit_info.normal.mul(-1.0)
                    : hit_info.normal;
                const origin = hit_info.point.add(offset_dir.mul(eps));
                const new_ray = new Ray(origin, reflect_dir);
                const new_col = new_ray.trace(scene, bounce - 1);
                color = color.add(mat.albedo.mul_vec(new_col));
            }
        }

        return color;
    }
}
