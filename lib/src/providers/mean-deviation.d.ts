export declare class MeanDeviationProvider {
    private period;
    private values;
    constructor(period: number);
    nextValue(typicalPrice: number, average?: number): number;
    momentValue(typicalPrice: number, average?: number): number;
}
