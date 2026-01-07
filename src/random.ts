
export class Random {
    static rand(): number {
        return Math.random();
    }

    static range(min: number, max: number): number {
        return min + (max - min) * this.rand();
    }
}