export declare class CircularBuffer {
    length: number;
    private pointer;
    private buffer;
    private filledCache;
    constructor(length: number);
    push(item: number): number;
    pushback(item: number): number;
    current(): number;
    toArray(): number[];
    filled(): boolean;
}
