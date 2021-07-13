/**
 * Pivot points are major support and resistance levels where there likely to be a retracement
 * of price used by traders to objectively determine potential entry and exit levels of underlying assets.
 * Pivot point breaks can be an entry marker, confirmation of trend direction
 * also confirmation of trend reversal -exit marker.
 * These retracement calculation is based on the last day trading data as we follow
 * the market open, high, low, close on every day.
 * You can also calculate these pivot level on weekly basis.
 * For weekly pivot you need to weekly high, low, and close prices.
 */
declare type PivotMode = 'classic' | 'woodie' | 'camarilla' | 'fibonacci';
interface PivotValue {
    r4?: number;
    r3?: number;
    r2: number;
    r1: number;
    pp: number;
    s1: number;
    s2: number;
    s3?: number;
    s4?: number;
}
export declare class Pivot {
    private mode;
    private calculator;
    constructor(mode?: PivotMode);
    nextValue(h: number, l: number, c: number): PivotValue;
    private classic;
    private woodie;
    private camarilla;
    private fibonacci;
}
export {};
