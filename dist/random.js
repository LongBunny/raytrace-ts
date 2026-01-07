export class Random {
    static rand() {
        return Math.random();
    }
    static range(min, max) {
        return min + (max - min) * this.rand();
    }
}
//# sourceMappingURL=random.js.map