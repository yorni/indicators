/**
 * The relative strength index (RSI) is a momentum indicator used in technical analysis
 * that measures the magnitude of recent price changes to evaluate overbought or oversold conditions
 * in the price of a stock or other asset. The RSI is displayed as an oscillator
 * (a line graph that moves between two extremes) and can have a reading from 0 to 100.
 * The indicator was originally developed by J. Welles Wilder Jr. and introduced in his seminal 1978 book,
 * "New Concepts in Technical Trading Systems."
 *
 * Traditional interpretation and usage of the RSI are that values of 70 or above indicate
 * that a security is becoming overbought or overvalued and may be primed
 * for a trend reversal or corrective pullback in price.
 * An RSI reading of 30 or below indicates an oversold or undervalued condition.
 */
export declare class RSI {
    private period;
    private change;
    constructor(period?: number);
    nextValue(value: number): number;
    momentValue(value: number): number;
}
