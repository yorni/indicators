export declare class ATR {
    private prevClose;
    private avg;
    /**
     * Конструктор
     * @param period - период по умолчанию 14
     */
    constructor(period?: number);
    nextValue(high: number, low: number, close: number): number;
    momentValue(high: number, low: number): number;
    private getTrueRange;
}
/**
 * fast abs
 * mask = input >> 31;
 * abs = ( input + mast ) ^ mask
 */
