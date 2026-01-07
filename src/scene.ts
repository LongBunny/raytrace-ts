import {Ray} from './ray.js';
import {Shape} from './shape.js';
import {Vec3} from './vector.js';
import {HitInfo} from "./hitinfo.js";

export class Scene {
    shapes: Shape[];

    constructor(shapes: Shape[]) {
        this.shapes = shapes;
    }

    hit(ray: Ray, t_min: number = 1e-4, t_max: number = Number.POSITIVE_INFINITY): HitInfo | null {
        let closest = t_max;
        let best: HitInfo | null = null;

        for (const shape of this.shapes) {
            const hit = shape.intersects(ray);
            if (hit && hit.distance > t_min && hit.distance < closest) {
                closest = hit.distance;
                best = hit;
            }
        }

        return best;
    }
}

