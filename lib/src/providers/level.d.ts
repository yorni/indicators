export declare class Level {
    period: number;
    samples: number;
    redunant: number;
    private type;
    private sample1Up;
    private sample2Up;
    private sample3Up;
    private sample1Low;
    private sample2Low;
    private sample3Low;
    private upper;
    private lower;
    private lastUpperValue;
    private lastLowerValue;
    constructor(period: number, samples: number, redunant?: number, type?: 'RMA' | 'EMA' | 'SMA');
    nextValue(value: number): {
        upper: number;
        lower: number;
    };
    getUp(value: number): number;
    getDown(value: number): number;
    private createSample;
}
