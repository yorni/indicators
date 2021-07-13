/**
 * A linearly weighted moving average (LWMA) is a moving average calculation that more heavily weights recent price data.
 * The most recent price has the highest weighting, and each prior price has progressively less weight.
 * The weights drop in a linear fashion.
 * LWMAs are quicker to react to price changes than simple moving averages (SMA) and exponential moving averages (EMA).
 */
export declare class LWMA {
    private period;
    private arr;
    private filled;
    private devider;
    constructor(period: number);
    nextValue(value: number): number;
    momentValue(value: number): number;
}
