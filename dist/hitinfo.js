export class HitInfo {
    constructor(distance, point, normal, front_face, material) {
        this.distance = distance;
        this.point = point;
        this.normal = normal;
        this.front_face = front_face;
        this.material = material;
    }
}
