export class BMath {
    static lerp(a, b, t) {
        return (1.0 - t) * a + b * t;
    }
    static srgb_to_linear(c) {
        return Math.pow(c, 2.2);
    }
    static clamp01(x) {
        return Math.min(Math.max(x, 0.0), 1.0);
    }
}
//# sourceMappingURL=bmath.js.map