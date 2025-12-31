import { BMath } from "./bmath.js";
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
    static lerp(a, b, t) {
        return new Vec3(BMath.lerp(a.x, b.x, t), BMath.lerp(a.y, b.y, t), BMath.lerp(a.z, b.z, t));
    }
    static from_hex(hex) {
        const r = ((hex >> 8 * 2) & 0xFF) / 255.0;
        const g = ((hex >> 8 * 1) & 0xFF) / 255.0;
        const b = ((hex >> 8 * 0) & 0xFF) / 255.0;
        return new Vec3(r, g, b);
    }
}
