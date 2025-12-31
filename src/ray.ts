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
            let hit_info = shape.intersects(this, scene.sun);
            if (hit_info === null)
                continue;

            if (hit_info.distance < hit_dist) {
                hit_dist = hit_info.distance;
                color = hit_info.color;
                hit_info = hit_info;
            }
        }

        if (hit_dist === Number.POSITIVE_INFINITY) {
            color = scene.get_env(this);
        }

        if (hit_info !== null) {
            const info = hit_info as HitInfo;
            const new_ray = new Ray(info.point, this.dir.reflect(info.normal));
            const new_col = new_ray.trace(scene, bounce - 1);
            color.add(new_col);
        }

        return color;
    }
}
