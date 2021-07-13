/**
 * A stochastic oscillator is a momentum indicator comparing a particular closing price
 * of a security to a range of its prices over a certain period of time.
 * The sensitivity of the oscillator to market movements is reducible by adjusting that
 * time period or by taking a moving average of the result.
 * It is used to generate overbought and oversold trading signals,
 * utilizing a 0-100 bounded range of values.
 */
export declare class Stochastic {
    private period;
    private smaPeriod;
    private highs;
    private lows;
    private higestH;
    private lowestL;
    private sma;
    private fill;
    constructor(period?: number, smaPeriod?: number);
    /**
     * Get next value for closed candle hlc
     * affect all next calculations
     */
    nextValue(high: number, low: number, close: number): any;
    /**
     * Get next value for non closed (tick) candle hlc
     * does not affect any next calculations
     */
    momentValue(high: number, low: number, close: number): {
        k: number;
        d: number;
    };
}
