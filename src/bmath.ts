
export class BMath {
    static lerp(a: number, b: number, t: number): number {
        return (1.0 - t) * a + b * t;
    }

    static srgb_to_linear(c: number): number {
        return Math.pow(c, 2.2);
    }
}
