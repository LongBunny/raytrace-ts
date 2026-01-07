export class Random {
    static rand() {
        return Math.random();
    }
    static rand_range(min, max) {
        return min + (max - min) * this.rand();
    }
}
