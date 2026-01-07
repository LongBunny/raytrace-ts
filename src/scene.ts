import { Ray } from './ray.js';
import { Shape } from './shape.js';
import { Vec3 } from './vector.js';

export class Scene {
    shapes: Shape[];

    constructor(shapes: Shape[]) {
        this.shapes = shapes;
    }

    get_env(ray: Ray): Vec3 {
        const upness = new Vec3(0.0, 1.0, 0.0).dot(ray.dir);
        const upness_sq = upness * upness;
        let sky = Vec3.lerp(Vec3.from_hex(0x90A3ED), Vec3.from_hex(0xF7F7F9), upness_sq);
        let ground = Vec3.lerp(Vec3.from_hex(0xF7F7F9), Vec3.from_hex(0x626262), upness_sq);
        return Vec3.lerp(sky, ground, (upness + 1.0) * 0.5);
    }
}

