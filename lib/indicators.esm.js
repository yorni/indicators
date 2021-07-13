class CircularBuffer {
    constructor(length) {
        this.length = length;
        this.pointer = 0;
        this.filledCache = false;
        this.buffer = new Array(length).fill(0);
    }
    push(item) {
        const overwrited = this.buffer[this.pointer];
        this.buffer[this.pointer] = item;
        this.pointer = (this.length + this.pointer + 1) % this.length;
        return overwrited;
    }
    pushback(item) {
        this.pointer = (this.length + this.pointer - 1) % this.length;
        const overwrited = this.buffer[this.pointer];
        this.buffer[this.pointer] = item;
        return overwrited;
    }
    current() {
        return this.buffer[this.pointer];
    }
    toArray() {
        return this.buffer;
    }
    filled() {
        this.filledCache = this.filledCache || this.pointer === this.length - 1;
        return this.filledCache;
    }
}

// console.log(sma([1, 2, 3, 4, 5, 6, 7, 8, 9], 4));
//=> [ '2.50', '3.50', '4.50', '5.50', '6.50', '7.50' ]
//=>   │       │       │       │       │       └─(6+7+8+9)/4
//=>   │       │       │       │       └─(5+6+7+8)/4
//=>   │       │       │       └─(4+5+6+7)/4
//=>   │       │       └─(3+4+5+6)/4
//=>   │       └─(2+3+4+5)/4
//=>   └─(1+2+3+4)/4
class SMA {
    constructor(period) {
        this.period = period;
        this.sum = 0;
        this.fill = 0;
        this.circular = new CircularBuffer(period);
    }
    nextValue(value) {
        this.sum += value;
        this.sum -= this.circular.push(value);
        this.fill++;
        if (this.fill !== this.period) {
            return;
        }
        this.nextValue = (value) => {
            this.sum += value;
            this.sum -= this.circular.push(value);
            return this.sum / this.period;
        };
        this.momentValue = (value) => {
            const rmValue = this.circular.current();
            return (this.sum - rmValue + value) / this.period;
        };
        return this.sum / this.period;
    }
    momentValue(value) {
        return;
    }
}

/**
 * The RMA (Relative Moving Average) is a powerful indicator based on the Simple Moving Average indicator.
 * The Simple Moving Average (SMA) indicator is useful to identify the start and rreversal of a trend.
 */
class RMA {
    constructor(period) {
        this.period = period;
        this.smooth = 1 / this.period;
        this.sma = new SMA(this.period);
    }
    /**
     * Get next value for closed candle hlc
     * affect all next calculations
     */
    nextValue(value) {
        if (!this.rma) {
            return (this.rma = this.sma.nextValue(value));
        }
        if (this.rma) {
            this.rma = (value - this.rma) * this.smooth + this.rma;
        }
        return this.rma;
    }
    /**
     * Get next value for non closed (tick) candle hlc
     * does not affect any next calculations
     */
    momentValue(value) {
        if (!this.rma) {
            return;
        }
        return (value - this.rma) * this.smooth + this.rma;
    }
}

/**
 * An exponential moving average (EMA) is a type of moving average (MA)
 * that places a greater weight and significance on the most recent data points.
 * The exponential moving average is also referred to as the exponentially weighted moving average.
 * An exponentially weighted moving average reacts more significantly to recent price changes
 * than a simple moving average (SMA), which applies an equal weight to all observations in the period.
 */
class EMA {
    constructor(period) {
        this.period = period;
        this.fill = 0;
        this.smooth = 2 / (this.period + 1);
        this.sma = new SMA(this.period);
    }
    /**
     * Get next value for closed candle hlc
     * affect all next calculations
     */
    nextValue(value) {
        this.fill++;
        const sma = this.sma.nextValue(value);
        if (this.fill === this.period) {
            this.ema = sma;
            this.nextValue = (value) => {
                return (this.ema = (value - this.ema) * this.smooth + this.ema);
            };
        }
        return this.ema;
    }
    /**
     * Get next value for non closed (tick) candle hlc
     * does not affect any next calculations
     */
    momentValue(value) {
        if (!this.ema) {
            return;
        }
        return (value - this.ema) * this.smooth + this.ema;
    }
}

class Level {
    constructor(period, samples, redunant = 0.85, type = 'RMA') {
        this.period = period;
        this.samples = samples;
        this.redunant = redunant;
        this.type = type;
        this.upper = 0;
        this.lower = 0;
        this.lastUpperValue = 0;
        this.lastLowerValue = 0;
        this.sample1Up = this.createSample();
        this.sample2Up = this.createSample();
        this.sample3Up = this.createSample();
        this.sample1Low = this.createSample();
        this.sample2Low = this.createSample();
        this.sample3Low = this.createSample();
    }
    nextValue(value) {
        if (value > 0) {
            this.upper = this.getUp(value);
            this.lastLowerValue *= this.redunant;
            this.lower = this.getDown(this.lastLowerValue);
            this.lastUpperValue = value;
        }
        else if (value < 0) {
            this.lower = this.getDown(value);
            this.lastUpperValue *= this.redunant;
            this.upper = this.getUp(this.lastUpperValue);
            this.lastLowerValue = value;
        }
        return { upper: this.upper, lower: this.lower };
    }
    getUp(value) {
        const sample1 = this.sample1Up.nextValue(value);
        let sample2 = null;
        if (this.samples === 1) {
            return sample1;
        }
        if (sample1) {
            sample2 = this.sample2Up.nextValue(sample1);
        }
        if (this.samples === 2) {
            return sample2;
        }
        if (sample2) {
            return this.sample3Up.nextValue(sample2);
        }
        return null;
    }
    getDown(value) {
        const sample1 = this.sample1Low.nextValue(value);
        let sample2 = null;
        if (this.samples === 1) {
            return sample1;
        }
        if (sample1) {
            sample2 = this.sample2Low.nextValue(sample1);
        }
        if (this.samples === 2) {
            return sample2;
        }
        if (sample2) {
            return this.sample3Low.nextValue(sample2);
        }
        return null;
    }
    createSample() {
        switch (this.type) {
            case 'EMA':
                return new EMA(this.period);
            case 'RMA':
                return new RMA(this.period);
            case 'SMA':
                return new SMA(this.period);
        }
    }
}

class Correlation {
    constructor(period) {
        this.period = period;
        this.SMAx = new SMA(this.period);
        this.SMAy = new SMA(this.period);
        this.pricesX = new CircularBuffer(this.period);
        this.pricesY = new CircularBuffer(this.period);
    }
    nextValue(priceX, priceY) {
        this.pricesX.push(priceX);
        this.pricesY.push(priceY);
        this.SMAxValue = this.SMAx.nextValue(priceX);
        this.SMAyValue = this.SMAy.nextValue(priceY);
        let SSxy = 0;
        let SSxx = 0;
        let SSyy = 0;
        for (let i = 0; i < this.period; i++) {
            const xPrice = this.pricesX[i];
            const yPrice = this.pricesY[i];
            SSxy += (xPrice - this.SMAxValue) * (yPrice - this.SMAyValue);
            SSxx += (xPrice - this.SMAxValue) ** 2;
            SSyy += (yPrice - this.SMAyValue) ** 2;
        }
        return SSxy / Math.sqrt(SSxx * SSyy);
    }
}

function sum(arr) {
    let sum = 0;
    let i = arr.length;
    while (i > 0) {
        sum += arr[--i];
    }
    return sum;
}
const percentChange = (current, prev) => ((current - prev) / prev) * 100;
const getMax = (arr) => {
    let max = -Infinity;
    let idx = 0;
    for (let i = arr.length - 1; i >= 0; i--) {
        const item = arr[i];
        if (max < item) {
            idx = i;
            max = item;
        }
    }
    return { max, idx };
};
const getMin = (arr) => {
    let min = Infinity;
    let idx = 0;
    for (let i = arr.length - 1; i >= 0; i--) {
        const item = arr[i];
        if (min > item) {
            idx = i;
            min = item;
        }
    }
    return { min, idx };
};

class Move {
    /**
     * Конструктор
     * @param period - целочисленное значение от 1 до  12
     * @param period - период
     */
    constructor(period) {
        this.period = period;
        this.value = 0;
        this.changes = new CircularBuffer(period);
    }
    nextValue(close) {
        if (this.prevPrice) {
            const change = percentChange(close, this.prevPrice);
            this.calculate(change);
            this.prevPrice = close;
            return this.value;
        }
        this.prevPrice = close;
    }
    calculate(change) {
        this.value += change;
        this.value -= this.changes.push(change);
        return this.value;
    }
}

function clenWave(wave) {
    wave.consolidate = 0;
    wave.power = 0;
    wave.streak = 0;
    wave.diff = 0;
    wave.startPrice = 0;
    wave.prevPeak = 0;
    return wave;
}
class Wave {
    /**
     * Конструктор
     */
    constructor() {
        this.up = { consolidate: 0, power: 0, streak: 0, startPrice: 0, diff: 0, prevPeak: 0 };
        this.down = { consolidate: 0, power: 0, streak: 0, startPrice: 0, diff: 0, prevPeak: 0 };
    }
    nextValue(open, close, high, low) {
        // bullish
        if (open < close || (this.up.streak && this.up.prevPeak < low)) {
            if (!this.up.startPrice) {
                this.up.startPrice = open;
            }
            if (this.down.streak) {
                clenWave(this.down);
            }
            const diff = close - open;
            this.up.streak++;
            this.up.prevPeak = low;
            if (this.up.diff > diff) {
                this.up.consolidate++;
            }
            else {
                this.up.consolidate = 0;
            }
            this.up.diff = diff;
            this.up.power = percentChange(close, this.up.startPrice);
        }
        // bearish
        if (open > close || (this.down.streak && this.down.prevPeak > high)) {
            if (!this.down.startPrice) {
                this.down.startPrice = open;
            }
            if (this.up.streak) {
                clenWave(this.up);
            }
            const diff = open - close;
            this.down.streak++;
            this.down.prevPeak = high;
            if (this.down.diff > diff) {
                this.down.consolidate++;
            }
            else {
                this.down.consolidate = 0;
            }
            this.down.diff = diff;
            this.down.power = percentChange(close, this.down.startPrice);
        }
        // doji is neutral
        if (open === close) {
            this.up.streak++;
            this.down.streak++;
            this.up.diff = this.down.diff = 0;
        }
        if (this.up.streak > this.down.streak) {
            return { ...this.up };
        }
        else {
            return { ...this.down };
        }
    }
}

/**
 * A stochastic oscillator is a momentum indicator comparing a particular closing price
 * of a security to a range of its prices over a certain period of time.
 * The sensitivity of the oscillator to market movements is reducible by adjusting that
 * time period or by taking a moving average of the result.
 * It is used to generate overbought and oversold trading signals,
 * utilizing a 0-100 bounded range of values.
 */
class Stochastic {
    constructor(period = 14, smaPeriod = 3) {
        this.period = period;
        this.smaPeriod = smaPeriod;
        this.higestH = null;
        this.lowestL = null;
        this.fill = 0;
        this.sma = new SMA(this.smaPeriod);
        this.highs = new CircularBuffer(this.period);
        this.lows = new CircularBuffer(this.period);
    }
    /**
     * Get next value for closed candle hlc
     * affect all next calculations
     */
    nextValue(high, low, close) {
        this.fill++;
        const filled = this.fill === this.period;
        if (!filled) {
            this.highs.push(high);
            this.lows.push(low);
        }
        if (filled && !this.higestH && !this.lowestL) {
            this.higestH = getMax(this.highs.toArray()).max;
            this.lowestL = getMin(this.lows.toArray()).min;
            this.nextValue = (high, low, close) => {
                const rmHigh = this.highs.push(high);
                const rmLow = this.lows.push(low);
                if (this.higestH === rmHigh) {
                    this.higestH = getMax(this.highs.toArray()).max;
                }
                else if (this.higestH < high) {
                    this.higestH = high;
                }
                if (this.lowestL === rmLow) {
                    this.lowestL = getMin(this.lows.toArray()).min;
                }
                else if (this.lowestL > low) {
                    this.lowestL = low;
                }
                const k = ((close - this.lowestL) / (this.higestH - this.lowestL)) * 100;
                const d = this.sma.nextValue(k);
                return { k, d };
            };
            this.momentValue = (high, low, close) => {
                const rmHigh = this.highs.push(high);
                const rmLow = this.lows.push(low);
                let higestH = this.higestH;
                let lowestL = this.lowestL;
                if (higestH === rmHigh) {
                    higestH = getMax(this.highs.toArray()).max;
                }
                else if (higestH < high) {
                    higestH = high;
                }
                if (lowestL === rmLow) {
                    lowestL = getMin(this.lows.toArray()).min;
                }
                else if (lowestL > low) {
                    lowestL = low;
                }
                this.highs.pushback(rmHigh);
                this.lows.pushback(rmLow);
                const k = ((close - lowestL) / (higestH - lowestL)) * 100;
                const d = this.sma.momentValue(k);
                return { k, d };
            };
            return this.nextValue(high, low, close);
        }
    }
    /**
     * Get next value for non closed (tick) candle hlc
     * does not affect any next calculations
     */
    momentValue(high, low, close) {
        return;
    }
}

/**
 * SMMA (Smoothed Moving Average) is another popular and widely used moving average indicator.
 * As all the other moving average indicators, to achieve the goals, the indicator filters
 * out the market fluctuations (noises) by averaging the price values of the periods, over which it is calculated.
 */
class SMMA {
    constructor(period) {
        this.period = period;
        this.sum = 0;
        this.avg = 0;
        this.filled = false;
        this.fill = 0;
    }
    nextValue(value) {
        if (this.filled) {
            if (this.avg) {
                this.nextValue = (value) => (this.avg = (this.avg * (this.period - 1) + value) / this.period);
                return this.nextValue(value);
            }
        }
        this.sum += value;
        this.fill++;
        if (this.fill === this.period) {
            this.filled = true;
            this.avg = this.sum / this.period;
            return this.avg;
        }
    }
    momentValue(value) {
        if (!this.filled) {
            return;
        }
        return (this.avg * (this.period - 1) + value) / this.period;
    }
}

class AvgChangeProvider {
    constructor(period) {
        this.avgGain = new SMMA(period);
        this.avgLoss = new SMMA(period);
    }
    nextValue(value) {
        const change = value - this.prev;
        if (!this.prev) {
            this.prev = value;
            return;
        }
        const isPositive = change > 0;
        const isNegative = change < 0;
        const localGain = isPositive ? change : 0;
        const localLoss = isNegative ? change : 0;
        const upAvg = this.avgGain.nextValue(localGain);
        const downAvg = this.avgLoss.nextValue(localLoss);
        this.prev = value;
        return { upAvg, downAvg };
    }
    momentValue(value) {
        const change = value - this.prev;
        const isPositive = change > 0;
        const isNegative = change < 0;
        const localGain = isPositive ? change : 0;
        const localLoss = isNegative ? change : 0;
        const upAvg = this.avgGain.momentValue(localGain);
        const downAvg = this.avgLoss.momentValue(localLoss);
        return { upAvg, downAvg };
    }
}

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
class RSI {
    constructor(period = 14) {
        this.period = period;
        this.change = new AvgChangeProvider(this.period);
    }
    nextValue(value) {
        const { downAvg, upAvg } = this.change.nextValue(value) || {};
        if (upAvg === undefined || downAvg === undefined) {
            return;
        }
        const RS = upAvg / -downAvg;
        return 100 - 100 / (1 + RS);
    }
    momentValue(value) {
        const { downAvg, upAvg } = this.change.momentValue(value) || {};
        if (upAvg === undefined || downAvg === undefined) {
            return;
        }
        const RS = upAvg / -downAvg;
        return 100 - 100 / (1 + RS);
    }
}

class MeanDeviationProvider {
    constructor(period) {
        this.period = period;
        this.values = new CircularBuffer(period);
    }
    nextValue(typicalPrice, average) {
        this.values.push(typicalPrice);
        const mean = this.values.toArray().reduce((acc, value) => acc + Math.abs(average - value), 0);
        return average && mean / this.period;
    }
    momentValue(typicalPrice, average) {
        const rm = this.values.push(typicalPrice);
        const mean = this.values.toArray().reduce((acc, value) => acc + Math.abs(average - value), 0);
        this.values.pushback(rm);
        return average && mean / this.period;
    }
}

/**
 * The CCI, or Commodity Channel Index, was developed by Donald Lambert,
 * a technical analyst who originally published the indicator in Commodities magazine (now Futures)
 * in 1980.1 Despite its name, the CCI can be used in any market and is not just for commodities
 */
class CCI {
    constructor(period = 20) {
        this.md = new MeanDeviationProvider(period);
        this.sma = new SMA(period);
    }
    nextValue(high, low, close) {
        const typicalPrice = (high + low + close) / 3;
        const average = this.sma.nextValue(typicalPrice);
        const meanDeviation = this.md.nextValue(typicalPrice, average);
        return meanDeviation && (typicalPrice - average) / (0.015 * meanDeviation);
    }
    momentValue(high, low, close) {
        const typicalPrice = (high + low + close) / 3;
        const average = this.sma.momentValue(typicalPrice);
        const meanDeviation = this.md.momentValue(typicalPrice, average);
        return meanDeviation && (typicalPrice - average) / (0.015 * meanDeviation);
    }
}

class ATR {
    /**
     * Конструктор
     * @param period - период по умолчанию 14
     */
    constructor(period = 14) {
        this.avg = new SMA(period);
        this.prevClose = 0;
    }
    nextValue(high, low, close) {
        const trueRange = this.getTrueRange(high, low);
        this.prevClose = close;
        return this.avg.nextValue(trueRange);
    }
    momentValue(high, low) {
        const trueRange = this.getTrueRange(high, low);
        return this.avg.momentValue(trueRange);
    }
    getTrueRange(high, low) {
        if (this.prevClose) {
            return Math.max(high - low, Math.abs(high - this.prevClose), Math.abs(low - this.prevClose));
        }
        return high - low;
    }
}
/**
 * fast abs
 * mask = input >> 31;
 * abs = ( input + mast ) ^ mask
 */

/**
 * The Rate-of-Change (ROC) indicator, which is also referred to as simply Momentum,
 * is a pure momentum oscillator that measures the percent change in price from one period to the next.
 * The ROC calculation compares the current price with the price “n” periods ago.
 * The plot forms an oscillator that fluctuates above and below the zero line as the Rate-of-Change moves from positive to negative.
 * As a momentum oscillator, ROC signals include centerline crossovers, divergences and overbought-oversold readings.
 * Divergences fail to foreshadow reversals more often than not, so this article will forgo a detailed discussion on them.
 * Even though centerline crossovers are prone to whipsaw, especially short-term,
 * these crossovers can be used to identify the overall trend.
 * Identifying overbought or oversold extremes comes naturally to the Rate-of-Change oscillator.
 **/
class ROC {
    constructor(period = 5) {
        this.values = new CircularBuffer(period);
    }
    nextValue(value) {
        const outed = this.values.push(value);
        if (outed !== 0) {
            return (value - outed) / outed;
        }
    }
    momentValue(value) {
        const outed = this.values.current();
        if (outed !== 0) {
            return (value - outed) / outed;
        }
    }
}

/**
 * Donchian channels were developed by Richard Donchian, a pioneer of mechanical trend following systems.
 * The two outer bands are plotted as the highest high and lowest low for a set period,
 * originally 20 days, with the optional middle band calculated as the average of the two.
 */
class DC {
    constructor(period = 20) {
        this.max = -Infinity;
        this.min = Infinity;
        this.highest = new CircularBuffer(period + 1);
        this.lowest = new CircularBuffer(period + 1);
    }
    nextValue(high, low) {
        if (this.max < high) {
            this.max = high;
        }
        if (this.min > low) {
            this.min = low;
        }
        const rmMax = this.highest.push(high);
        const rmMin = this.lowest.push(low);
        // Most perf degrade case
        if (rmMax === this.max && high !== this.max) {
            // console.count('degrade_max');
            this.max = getMax(this.highest.toArray()).max;
        }
        // Most perf degrade case
        if (rmMin === this.min && low !== this.min) {
            this.min = getMin(this.lowest.toArray()).min;
            // console.count('degrade_min');
        }
        return { upper: this.max, middle: (this.max + this.min) / 2, lower: this.min };
    }
    momentValue(high, low) {
        let max = this.max;
        let min = this.min;
        if (max < high) {
            max = high;
        }
        if (min > low) {
            min = low;
        }
        const rmMax = this.highest.push(high);
        const rmMin = this.lowest.push(low);
        if (!this.highest.filled()) {
            return;
        }
        // Most perf degrade case
        if (rmMax === max && high !== max) {
            // console.count('degrade_max');
            max = getMax(this.highest.toArray()).max;
        }
        // Most perf degrade case
        if (rmMin === min && low !== min) {
            min = getMin(this.lowest.toArray()).min;
            // console.count('degrade_min');
        }
        this.highest.pushback(rmMax);
        this.lowest.pushback(rmMin);
        return { upper: this.max, middle: (high + low) / 2, lower: this.min };
    }
}

/**
 * Returns the percentile of a value. Returns the same values as the Excel PERCENTRANK and PERCENTRANK.INC functions.
 */
class PercentRank {
    constructor(period) {
        this.period = period;
        this.fill = 0;
        this.values = new CircularBuffer(period);
    }
    nextValue(value) {
        this.values.push(value);
        this.fill++;
        if (this.fill === this.period) {
            this.nextValue = (value) => {
                const result = this.calc(value);
                this.values.push(value);
                return result;
            };
            this.momentValue = this.calc;
            return this.calc(value);
        }
    }
    momentValue(value) {
        return;
    }
    calc(value) {
        let count = 0;
        this.values.toArray().forEach((item) => {
            if (item <= value)
                count++;
        });
        return (count / this.period) * 100;
    }
}

/**
 * Connors RSI (CRSI) uses the above formula to generate a value between 0 and 100.
 * This is primarily used to identify overbought and oversold levels.
 * Connor's original definition of these levels is that a value over 90
 * should be considered overbought and a value under 10 should be considered oversold.
 * On occasion, signals occur during slight corrections during a trend. For example,
 * when the market is in an uptrend, Connors RSI might generate short term sell signals.
 * When the market is in a downtrend, Connors RSI might generate short term buy signals.
 * Original core here: https://tradingview.com/script/vWAPUAl9-Stochastic-Connors-RSI/
 */
class cRSI {
    constructor(period = 3, updownRsiPeriod = 2, percentRankPeriod = 100) {
        this.period = period;
        this.rsi = new RSI(this.period);
        this.updownRsi = new RSI(updownRsiPeriod);
        this.roc = new ROC(1);
        this.percentRank = new PercentRank(percentRankPeriod);
        this.updownPeriod = 0;
        this.prevClose = 0;
    }
    nextValue(value) {
        const rsi = this.rsi.nextValue(value);
        const percentRank = this.percentRank.nextValue(this.roc.nextValue(value));
        this.updownPeriod = this.getUpdownPeriod(value);
        this.prevClose = value;
        this.updownValue = this.updownRsi.nextValue(this.updownPeriod);
        if (!this.updownValue) {
            return;
        }
        return (rsi + this.updownValue + percentRank) / 3;
    }
    momentValue(value) {
        const rsi = this.rsi.momentValue(value);
        const percentRank = this.percentRank.momentValue(this.roc.momentValue(value));
        const updownPeriod = this.getUpdownPeriod(value);
        const updownValue = this.updownRsi.momentValue(updownPeriod);
        if (!updownValue) {
            return;
        }
        return (rsi + updownValue + percentRank) / 3;
    }
    getUpdownPeriod(value) {
        let updownPeriod = this.updownPeriod;
        if (value > this.prevClose) {
            // reset negative streak
            if (this.updownPeriod < 0) {
                updownPeriod = 0;
            }
            updownPeriod++;
        }
        else if (value < this.prevClose) {
            // reset positive streak
            if (this.updownPeriod > 0) {
                updownPeriod = 0;
            }
            updownPeriod--;
        }
        else {
            updownPeriod = 0;
        }
        return updownPeriod;
    }
}

class StandardDeviation {
    constructor(period) {
        this.period = period;
        this.values = new CircularBuffer(period);
    }
    nextValue(value, mean) {
        this.values.push(value);
        return Math.sqrt(this.values.toArray().reduce((acc, item) => acc + (item - mean) ** 2, 0) / this.period);
    }
    momentValue(value, mean) {
        const rm = this.values.push(value);
        const result = Math.sqrt(this.values.toArray().reduce((acc, item) => acc + (item - mean) ** 2, 0) / this.period);
        this.values.pushback(rm);
        return result;
    }
    calculate(values, value, mean) { }
}

class BollingerBands {
    constructor(period = 20, stdDev = 2) {
        this.period = period;
        this.stdDev = stdDev;
        this.fill = 0;
        this.sma = new SMA(period);
        this.sd = new StandardDeviation(period);
    }
    nextValue(close) {
        const middle = this.sma.nextValue(close);
        const sd = this.sd.nextValue(close, middle);
        this.fill++;
        if (this.fill !== this.period) {
            return;
        }
        const lower = middle - this.stdDev * sd;
        const upper = middle + this.stdDev * sd;
        this.nextValue = (close) => {
            const middle = this.sma.nextValue(close);
            const sd = this.sd.nextValue(close, middle);
            const lower = middle - this.stdDev * sd;
            const upper = middle + this.stdDev * sd;
            return { lower, middle, upper };
        };
        return { lower, middle, upper };
    }
    momentValue(close) {
        const middle = this.sma.momentValue(close);
        const sd = this.sd.momentValue(close, middle);
        const lower = middle - this.stdDev * sd;
        const upper = middle + this.stdDev * sd;
        return { lower, middle, upper };
    }
}

/*
How work MACD?
https://www.investopedia.com/terms/m/macd.asp#:~:text=The%20MACD%20is%20calculated%20by,for%20buy%20and%20sell%20signals.
*/
class MACD {
    constructor(periodEmaFast = 12, periodEmaSlow = 26, periodSignal = 9) {
        this.periodEmaFast = periodEmaFast;
        this.periodEmaSlow = periodEmaSlow;
        this.periodSignal = periodSignal;
        this.emaFastIndicator = new EMA(periodEmaFast);
        this.emaSlowIndicator = new EMA(periodEmaSlow);
        this.emaSignalIndicator = new EMA(periodSignal);
    }
    nextValue(value) {
        const emaFast = this.emaFastIndicator.nextValue(value);
        const emaSlow = this.emaSlowIndicator.nextValue(value);
        const macd = emaFast - emaSlow;
        const signal = (macd && this.emaSignalIndicator.nextValue(macd)) || undefined;
        const histogram = macd - signal || undefined;
        if (isNaN(macd)) {
            return;
        }
        return {
            macd,
            emaFast,
            emaSlow,
            signal,
            histogram,
        };
    }
    momentValue(value) {
        const emaFast = this.emaFastIndicator.momentValue(value);
        const emaSlow = this.emaSlowIndicator.momentValue(value);
        const macd = emaFast - emaSlow;
        const signal = macd && this.emaSignalIndicator.momentValue(macd);
        const histogram = macd - signal;
        return {
            macd,
            emaFast,
            emaSlow,
            signal,
            histogram,
        };
    }
}

/**
 * Heikin-Ashi Candlesticks are an offshoot from Japanese candlesticks.
 * Heikin-Ashi Candlesticks use the open-close data from the prior period
 * and the open-high-low-close data from the current period to create a combo candlestick.
 * The resulting candlestick filters out some noise in an effort to better capture the trend.
 * In Japanese, Heikin means “average” and Ashi means “pace” (EUDict.com).
 * Taken together, Heikin-Ashi represents the average pace of prices.
 * Heikin-Ashi Candlesticks are not used like normal candlesticks.
 * Dozens of bullish or bearish reversal patterns consisting of 1-3 candlesticks are not to be found.
 * Instead, these candlesticks can be used to identify trending periods,
 * potential reversal points and classic technical analysis patterns.
 */
class HeikenAshi {
    constructor() {
        this.prevOpen = 0;
        this.prevClose = 0;
    }
    /**
     * Get next value for closed candle hlc
     * affect all next calculations
     */
    nextValue(o, h, l, c) {
        const data = this.calculate(o, h, l, c);
        this.prevClose = data.c;
        this.prevOpen = data.o;
        return data;
    }
    /**
     * Get next value for non closed (tick) candle hlc
     * does not affect any next calculations
     */
    momentValue(o, h, l, c) {
        return this.calculate(o, h, l, c);
    }
    /**
     * Heiken ashi formula
     */
    calculate(o, h, l, c) {
        c = (o + h + l + c) / 4;
        if (this.prevOpen) {
            o = (this.prevOpen + this.prevClose) / 2;
        }
        h = Math.max(h, o, c);
        l = Math.min(l, o, c);
        return { o, h, l, c };
    }
}

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
class Pivot {
    constructor(mode = 'classic') {
        this.mode = mode;
        switch (this.mode) {
            case 'classic':
                this.calculator = this.classic;
                break;
            case 'camarilla':
                this.calculator = this.camarilla;
                break;
            case 'woodie':
                this.calculator = this.woodie;
                break;
            case 'fibonacci':
                this.calculator = this.fibonacci;
                break;
        }
    }
    nextValue(h, l, c) {
        return this.calculator(h, l, c);
    }
    // Classsic
    // Pivot Point (P) = (High + Low + Close)/3
    // Support 1 (S1) = (P x 2) - High
    // Support 2 (S2) = P  -  (High  -  Low)
    // Support 3 (S3) = Low – 2(High – PP)
    // Resistance 1 (R1) = (P x 2) - Low
    // Resistance 2 (R2) = P + (High  -  Low)
    // Resistance 3 (R3) = High + 2(PP – Low)
    classic(h, l, c) {
        const pp = (h + l + c) / 3;
        const s1 = pp * 2 - h;
        const s2 = pp - (h - l);
        const s3 = l - 2 * (h - pp);
        const r1 = pp * 2 - l;
        const r2 = pp + (h - l);
        const r3 = h + 2 * (pp - l);
        return { r3, r2, r1, pp, s1, s2, s3 };
    }
    // Woodie
    //R2 = PP + High – Low
    // R1 = (2 X PP) – Low
    // PP = (H + L + 2C) / 4
    // S1 = (2 X PP) – High
    // S2 = PP – High + Low
    woodie(h, l, c) {
        const pp = (h + l + 2 * c) / 4;
        const r2 = pp + h - l;
        const r1 = 2 * pp - l;
        const s1 = 2 * pp - h;
        const s2 = pp - h + l;
        return { r2, r1, pp, s1, s2 };
    }
    // Camarilla
    // R4 = C + ((H-L) x 1.5000)
    // R3 = C + ((H-L) x 1.2500)
    // R2 = C + ((H-L) x 1.1666)
    // R1 = C + ((H-L) x 1.0833)
    // PP = (H + L + C) / 3
    // S1 = C – ((H-L) x 1.0833)
    // S2 = C – ((H-L) x 1.1666)
    // S3 = C – ((H-L) x 1.2500)
    // S4 = C – ((H-L) x 1.5000)
    camarilla(h, l, c) {
        const delta = h - l;
        const pp = (h + l + c) / 3;
        const r4 = c + delta * 1.5;
        const r3 = c + delta * 1.25;
        const r2 = c + delta * 1.1666;
        const r1 = c + delta * 1.0833;
        const s1 = c - delta * 1.0833;
        const s2 = c - delta * 1.1666;
        const s3 = c - delta * 1.25;
        const s4 = c - delta * 1.5;
        return { r4, r3, r2, r1, pp, s1, s2, s3, s4 };
    }
    // Fibonacci Pivot Point
    // R3 = PP + ((High – Low) x 1.000)
    // R2 = PP + ((High – Low) x .618)
    // R1 = PP + ((High – Low) x .382)
    // PP = (H + L + C) / 3
    // S1 = PP – ((High – Low) x .382)
    // S2 = PP – ((High – Low) x .618)
    // S3 = PP – ((High – Low) x 1.000)
    fibonacci(h, l, c) {
        const delta = h - l;
        const pp = (h + l + c) / 3;
        const r3 = pp + delta;
        const r2 = pp + delta * 0.618;
        const r1 = pp + delta * 0.382;
        const s1 = pp - delta * 0.382;
        const s2 = pp - delta * 0.618;
        const s3 = pp - delta;
        return { r3, r2, r1, pp, s1, s2, s3 };
    }
}

/**
 * A linearly weighted moving average (LWMA) is a moving average calculation that more heavily weights recent price data.
 * The most recent price has the highest weighting, and each prior price has progressively less weight.
 * The weights drop in a linear fashion.
 * LWMAs are quicker to react to price changes than simple moving averages (SMA) and exponential moving averages (EMA).
 */
class LWMA {
    constructor(period) {
        this.period = period;
        // Circular buffer ned foreach or reduce for that case
        this.arr = [];
        this.filled = false;
        this.devider = 0;
        this.devider = sum(Array.from(Array(this.period).keys()).map((i) => i + 1));
    }
    nextValue(value) {
        this.filled = this.filled || this.arr.length === this.period;
        this.arr.push(value);
        if (this.filled) {
            this.arr.shift();
            return this.arr.reduce((sum, value, idx) => sum + value * (idx + 1), 0) / this.devider;
        }
    }
    momentValue(value) {
        if (this.filled) {
            return this.arr.reduce((sum, value, idx) => sum + value * (idx + 1), 0) / this.devider;
        }
    }
}

export { ATR, BollingerBands, CCI, Correlation, DC, EMA, HeikenAshi, LWMA, Level, MACD, Move, Pivot, RMA, ROC, RSI, SMA, StandardDeviation, Stochastic, Wave, cRSI };
