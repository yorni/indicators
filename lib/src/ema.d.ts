/**
 * An exponential moving average (EMA) is a type of moving average (MA)
 * that places a greater weight and significance on the most recent data points.
 * The exponential moving average is also referred to as the exponentially weighted moving average.
 * An exponentially weighted moving average reacts more significantly to recent price changes
 * than a simple moving average (SMA), which applies an equal weight to all observations in the period.
 */
export declare class EMA {
    private period;
    private smooth;
    private ema;
    private sma;
    private fill;
    constructor(period: number);
    /**
     * Get next value for closed candle hlc
     * affect all next calculations
     */
    nextValue(value: number): number;
    /**
     * Get next value for non closed (tick) candle hlc
     * does not affect any next calculations
     */
    momentValue(value: number): number;
}
