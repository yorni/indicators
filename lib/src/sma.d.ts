export declare class SMA {
    private period;
    private circular;
    private sum;
    private fill;
    constructor(period: number);
    nextValue(value: number): number;
    momentValue(value: number): number;
}
