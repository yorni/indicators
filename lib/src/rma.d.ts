/**
 * The RMA (Relative Moving Average) is a powerful indicator based on the Simple Moving Average indicator.
 * The Simple Moving Average (SMA) indicator is useful to identify the start and rreversal of a trend.
 */
export declare class RMA {
    private period;
    private smooth;
    private rma;
    private sma;
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
