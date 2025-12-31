export class BMath {
    static lerp(a, b, t) {
        return (1.0 - t) * a + b * t;
    }
}
