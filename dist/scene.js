export class Scene {
    constructor(shapes) {
        this.shapes = shapes;
    }
    hit(ray, t_min = 1e-4, t_max = Number.POSITIVE_INFINITY) {
        let closest = t_max;
        let best = null;
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
//# sourceMappingURL=scene.js.map