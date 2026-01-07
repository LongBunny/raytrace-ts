export class Ray {
    constructor(origin, dir) {
        this.origin = origin;
        this.dir = dir;
    }
    at(t) {
        return this.origin.add(this.dir.mul(t));
    }
}
//# sourceMappingURL=ray.js.map