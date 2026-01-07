import { BMath } from "./bmath.js";
import { Random } from "./random.js";
export class Vec3 {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    add(other) {
        if (typeof other === 'number')
            return new Vec3(this.x + other, this.y + other, this.z + other);
        else
            return new Vec3(this.x + other.x, this.y + other.y, this.z + other.z);
    }
    sub(other) {
        if (typeof other === 'number')
            return new Vec3(this.x - other, this.y - other, this.z - other);
        else
            return new Vec3(this.x - other.x, this.y - other.y, this.z - other.z);
    }
    mul(val) {
        return new Vec3(this.x * val, this.y * val, this.z * val);
    }
    mul_vec(other) {
        return new Vec3(this.x * other.x, this.y * other.y, this.z * other.z);
    }
    div(val) {
        if (val === 0.0)
            throw new Error('Can\'t div by 0');
        return new Vec3(this.x / val, this.y / val, this.z / val);
    }
    sqr_mag() {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }
    mag() {
        return Math.sqrt(this.sqr_mag());
    }
    dot(other) {
        return this.x * other.x + this.y * other.y + this.z * other.z;
    }
    cross(other) {
        return new Vec3(this.y * other.z - this.z * other.y, this.z * other.x - this.x * other.z, this.x * other.y - this.y * other.x);
    }
    normalize() {
        return this.div(this.mag());
    }
    reflect(a) {
        return this.sub(a.mul(2 * this.dot(a)));
    }
    near_zero() {
        const eps = 1e-4;
        return this.x < eps && this.y < eps && this.z < eps;
    }
    static lerp(a, b, t) {
        return new Vec3(BMath.lerp(a.x, b.x, t), BMath.lerp(a.y, b.y, t), BMath.lerp(a.z, b.z, t));
    }
    static zero() {
        return new Vec3(0.0, 0.0, 0.0);
    }
    static one() {
        return new Vec3(1.0, 1.0, 1.0);
    }
    static from_hex(hex) {
        const r = ((hex >> 8 * 2) & 0xFF) / 255.0;
        const g = ((hex >> 8 * 1) & 0xFF) / 255.0;
        const b = ((hex >> 8 * 0) & 0xFF) / 255.0;
        return new Vec3(r, g, b);
    }
    static random() {
        return new Vec3(Random.rand(), Random.rand(), Random.rand());
    }
    static random_unit_vector() {
        return this.random().normalize();
    }
    static random_in_hemisphere(normal) {
        const v = this.random_unit_vector();
        return v.dot(normal) > 0.0 ? v : v.mul(-1.0);
    }
    clamp01() {
        return new Vec3(Math.max(0.0, Math.min(1.0, this.x)), Math.max(0.0, Math.min(1.0, this.y)), Math.max(0.0, Math.min(1.0, this.z)));
    }
}
