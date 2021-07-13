/**
 * Donchian channels were developed by Richard Donchian, a pioneer of mechanical trend following systems.
 * The two outer bands are plotted as the highest high and lowest low for a set period,
 * originally 20 days, with the optional middle band calculated as the average of the two.
 */
export declare class DC {
    private highest;
    private lowest;
    private max;
    private min;
    constructor(period?: number);
    nextValue(high: number, low: number): {
        upper: number;
        middle: number;
        lower: number;
    };
    momentValue(high: number, low: number): {
        upper: number;
        middle: number;
        lower: number;
    };
}
