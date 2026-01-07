import { Vec3 } from "./vector.js";
import { Ray } from "./ray.js";
export class Camera {
    constructor(fov_deg, aspect) {
        const theta = (fov_deg * Math.PI) / 180.0;
        const h = Math.tan(theta / 2.0);
        const viewport_height = 2.0 * h;
        const viewport_width = aspect * viewport_height;
        this.origin = new Vec3(0, 0, 0);
        this.horizontal = new Vec3(viewport_width, 0, 0);
        this.vertical = new Vec3(0, viewport_height, 0);
        this.lower_left_corner = this.origin
            .sub(this.horizontal.mul(0.5))
            .sub(this.vertical.mul(0.5))
            .add(new Vec3(0, 0, 1));
    }
    get_ray(u, v) {
        const dir = this.lower_left_corner
            .add(this.horizontal.mul(u))
            .add(this.vertical.mul(v))
            .sub(this.origin);
        return new Ray(this.origin, dir.normalize());
    }
}
