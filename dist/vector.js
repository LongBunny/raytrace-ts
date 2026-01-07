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
    reflect(n) {
        return this.sub(n.mul(2 * this.dot(n)));
    }
    refract(n, etai_over_etat) {
        const uv = this.normalize();
        const cos_theta = Math.min(uv.mul(-1).dot(n), 1.0);
        const out_perpendicular = uv.add(n.mul(cos_theta)).mul(etai_over_etat);
        const out_parallel = n.mul(-Math.sqrt(Math.abs(1.0 - out_perpendicular.sqr_mag())));
        return out_perpendicular.add(out_parallel);
    }
    near_zero() {
        const eps = 1e-4;
        return Math.abs(this.x) < eps && Math.abs(this.y) < eps && Math.abs(this.z) < eps;
    }
    clamp01() {
        return new Vec3(BMath.clamp01(this.x), BMath.clamp01(this.y), BMath.clamp01(this.z));
    }
    srgb_to_linear() {
        return new Vec3(BMath.srgb_to_linear(this.x), BMath.srgb_to_linear(this.y), BMath.srgb_to_linear(this.z));
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
        return new Vec3(Random.range(-1, 1), Random.range(-1, 1), Random.range(-1, 1));
    }
    static random_in_unit_sphere() {
        while (true) {
            const p = this.random();
            const mag2 = p.sqr_mag();
            if (mag2 === 0.0 || mag2 >= 1.0)
                continue;
            return p;
        }
    }
    static random_unit_vector() {
        return this.random_in_unit_sphere().normalize();
    }
    static random_in_hemisphere(normal) {
        const v = this.random_in_unit_sphere();
        return v.dot(normal) > 0.0 ? v : v.mul(-1.0);
    }
    static random_cosine_direction() {
        const r1 = Random.rand();
        const r2 = Random.rand();
        const z = Math.sqrt(1.0 - r2);
        const phi = 2.0 * Math.PI * r1;
        const x = Math.cos(phi) * Math.sqrt(r2);
        const y = Math.sin(phi) * Math.sqrt(r2);
        return new Vec3(x, y, z);
    }
    static random_in_hemisphere_cosine(normal) {
        const w = normal.normalize();
        const a = Math.abs(w.x) > 0.9 ? new Vec3(0, 1, 0) : new Vec3(1, 0, 0);
        const v = w.cross(a).normalize();
        const u = v.cross(w);
        const d = this.random_cosine_direction();
        return u.mul(d.x).add(v.mul(d.y)).add(w.mul(d.z));
    }
    toString() {
        return `(${this.x}, ${this.y}, ${this.z})`;
    }
}
//# sourceMappingURL=vector.js.map