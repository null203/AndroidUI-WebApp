// Copyright 2009 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * goog.math.Long Typescript port
 */

module goog.math{
    /**
     * Constructs a 64-bit two's-complement integer, given its low and high 32-bit
     * values as *signed* integers.  See the from* functions below for more
     * convenient ways of constructing Longs.
     *
     * The internal representation of a long is the two given signed, 32-bit values.
     * We use 32-bit pieces because these are the size of integers on which
     * Javascript performs bit-operations.  For operations like addition and
     * multiplication, we split each number into 16-bit pieces, which can easily be
     * multiplied within Javascript's floating-point representation without overflow
     * or change in sign.
     *
     * In the algorithms below, we frequently reduce the negative case to the
     * positive case by negating the input(s) and then post-processing the result.
     * Note that we must ALWAYS check specially whether those values are MIN_VALUE
     * (-2^63) because -MIN_VALUE == MIN_VALUE (since 2^63 cannot be represented as
     * a positive number, it overflows back into a negative).  Not handling this
     * case would often result in infinite recursion.
     *
     * @param {number} low  The low (signed) 32 bits of the long.
     * @param {number} high  The high (signed) 32 bits of the long.
     * @constructor
     */
    export class Long{

        /**
         * A cache of the Long representations of small integer values.
         * @type {!Object}
         * @private
         */
        private static IntCache_ = {};

        /**
         * Number used repeated below in calculations.  This must appear before the
         * first call to any from* function below.
         * @type {number}
         * @private
         */
        private static TWO_PWR_16_DBL_ = 1 << 16;
        private static TWO_PWR_24_DBL_ = 1 << 24;
        private static TWO_PWR_32_DBL_ = Long.TWO_PWR_16_DBL_ * Long.TWO_PWR_16_DBL_;
        private static TWO_PWR_31_DBL_ = Long.TWO_PWR_32_DBL_ / 2;
        private static TWO_PWR_48_DBL_ = Long.TWO_PWR_32_DBL_ * Long.TWO_PWR_16_DBL_;
        private static TWO_PWR_64_DBL_ = Long.TWO_PWR_32_DBL_ * Long.TWO_PWR_32_DBL_;
        private static TWO_PWR_63_DBL_ = Long.TWO_PWR_64_DBL_ / 2;

        private static TWO_PWR_24_ = Long.fromInt(1 << 24);

        static ZERO = Long.fromInt(0);
        static ONE = Long.fromInt(1);
        static NEG_ONE = Long.fromInt(-1);
        static MAX_VALUE = Long.fromBits(0xFFFFFFFF | 0, 0x7FFFFFFF | 0);
        static MIN_VALUE = Long.fromBits(0, 0x80000000 | 0);




        private low_:number;
        private high_:number;

        /**
         * Constructs a 64-bit two's-complement integer, given its low and high 32-bit
         * values as *signed* integers.  See the from* functions below for more
         * convenient ways of constructing Longs.
         *
         * @param {number} low  The low (signed) 32 bits of the long.
         * @param {number} high  The high (signed) 32 bits of the long.
         * @constructor
         */
        constructor(low:number, high:number) {
            this.low_ = low | 0;  // force into 32 signed bits.
            this.high_ = high | 0;  // force into 32 signed bits.
        }

        /** @return {number} The value, assuming it is a 32-bit integer. */
        toInt():number {
            return this.low_;
        }


        /** @return {number} The closest floating-point representation to this value. */
        toNumber():number {
            return this.high_ * Long.TWO_PWR_32_DBL_ + this.getLowBitsUnsigned();
        }

        /**
         * @param {number=} opt_radix The radix in which the text should be written.
         * @return {string} The textual representation of this value.
         * @override
         */
        toString(opt_radix:number):string {
            var radix = opt_radix || 10;
            if (radix < 2 || 36 < radix) {
                throw Error('radix out of range: ' + radix);
            }

            if (this.isZero()) {
                return '0';
            }

            if (this.isNegative()) {
                if (this.equals(Long.MIN_VALUE)) {
                    // We need to change the Long value before it can be negated, so we remove
                    // the bottom-most digit in this base and then recurse to do the rest.
                    var radixLong = Long.fromNumber(radix);
                    var div = this.div(radixLong);
                    let rem = div.multiply(radixLong).subtract(this);
                    return div.toString(radix) + rem.toInt().toString(radix);
                } else {
                    return '-' + this.negate().toString(radix);
                }
            }

            // Do several (6) digits each time through the loop, so as to
            // minimize the calls to the very expensive emulated div.
            var radixToPower = Long.fromNumber(Math.pow(radix, 6));

            let rem:Long = this;
            var result = '';
            while (true) {
                var remDiv = rem.div(radixToPower);
                var intval = rem.subtract(remDiv.multiply(radixToPower)).toInt();
                var digits = intval.toString(radix);

                rem = remDiv;
                if (rem.isZero()) {
                    return digits + result;
                } else {
                    while (digits.length < 6) {
                        digits = '0' + digits;
                    }
                    result = '' + digits + result;
                }
            }
        }

        /** @return {number} The high 32-bits as a signed value. */
        getHighBits():number {
            return this.high_;
        }

        /** @return {number} The low 32-bits as a signed value. */
        getLowBits():number {
            return this.low_;
        }

        /** @return {number} The low 32-bits as an unsigned value. */
        getLowBitsUnsigned():number {
            return (this.low_ >= 0) ? this.low_ : Long.TWO_PWR_32_DBL_ + this.low_;
        }

        /**
         * @return {number} Returns the number of bits needed to represent the absolute
         *     value of this Long.
         */
        getNumBitsAbs():number {
            if (this.isNegative()) {
                if (this.equals(Long.MIN_VALUE)) {
                    return 64;
                } else {
                    return this.negate().getNumBitsAbs();
                }
            } else {
                var val = this.high_ != 0 ? this.high_ : this.low_;
                for (var bit = 31; bit > 0; bit--) {
                    if ((val & (1 << bit)) != 0) {
                        break;
                    }
                }
                return this.high_ != 0 ? bit + 33 : bit + 1;
            }
        }

        /** @return {boolean} Whether this value is zero. */
        isZero():boolean {
            return this.high_ == 0 && this.low_ == 0;
        }

        /** @return {boolean} Whether this value is negative. */
        isNegative():boolean {
            return this.high_ < 0;
        }

        /** @return {boolean} Whether this value is odd. */
        isOdd():boolean {
            return (this.low_ & 1) == 1;
        }

        /**
         * @param {goog.math.Long} other Long to compare against.
         * @return {boolean} Whether this Long equals the other.
         */
        equals(other:Long):boolean {
            return (this.high_ == other.high_) && (this.low_ == other.low_);
        }


        /**
         * @param {goog.math.Long} other Long to compare against.
         * @return {boolean} Whether this Long does not equal the other.
         */
        notEquals(other:Long):boolean {
            return (this.high_ != other.high_) || (this.low_ != other.low_);
        }


        /**
         * @param {goog.math.Long} other Long to compare against.
         * @return {boolean} Whether this Long is less than the other.
         */
        lessThan(other:Long):boolean {
            return this.compare(other) < 0;
        }


        /**
         * @param {goog.math.Long} other Long to compare against.
         * @return {boolean} Whether this Long is less than or equal to the other.
         */
        lessThanOrEqual(other:Long):boolean {
            return this.compare(other) <= 0;
        }


        /**
         * @param {goog.math.Long} other Long to compare against.
         * @return {boolean} Whether this Long is greater than the other.
         */
        greaterThan(other:Long):boolean {
            return this.compare(other) > 0;
        }


        /**
         * @param {goog.math.Long} other Long to compare against.
         * @return {boolean} Whether this Long is greater than or equal to the other.
         */
        greaterThanOrEqual(other:Long):boolean {
            return this.compare(other) >= 0;
        }


        /**
         * Compares this Long with the given one.
         * @param {goog.math.Long} other Long to compare against.
         * @return {number} 0 if they are the same, 1 if the this is greater, and -1
         *     if the given one is greater.
         */
        compare(other:Long):number {
            if (this.equals(other)) {
                return 0;
            }

            var thisNeg = this.isNegative();
            var otherNeg = other.isNegative();
            if (thisNeg && !otherNeg) {
                return -1;
            }
            if (!thisNeg && otherNeg) {
                return 1;
            }

            // at this point, the signs are the same, so subtraction will not overflow
            if (this.subtract(other).isNegative()) {
                return -1;
            } else {
                return 1;
            }
        }


        /** @return {!goog.math.Long} The negation of this value. */
        negate():Long {
            if (this.equals(Long.MIN_VALUE)) {
                return Long.MIN_VALUE;
            } else {
                return this.not().add(Long.ONE);
            }
        }


        /**
         * Returns the sum of this and the given Long.
         * @param {goog.math.Long} other Long to add to this one.
         * @return {!goog.math.Long} The sum of this and the given Long.
         */
        add(other:Long):Long {
            // Divide each number into 4 chunks of 16 bits, and then sum the chunks.

            var a48 = this.high_ >>> 16;
            var a32 = this.high_ & 0xFFFF;
            var a16 = this.low_ >>> 16;
            var a00 = this.low_ & 0xFFFF;

            var b48 = other.high_ >>> 16;
            var b32 = other.high_ & 0xFFFF;
            var b16 = other.low_ >>> 16;
            var b00 = other.low_ & 0xFFFF;

            var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
            c00 += a00 + b00;
            c16 += c00 >>> 16;
            c00 &= 0xFFFF;
            c16 += a16 + b16;
            c32 += c16 >>> 16;
            c16 &= 0xFFFF;
            c32 += a32 + b32;
            c48 += c32 >>> 16;
            c32 &= 0xFFFF;
            c48 += a48 + b48;
            c48 &= 0xFFFF;
            return Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
        }


        /**
         * Returns the difference of this and the given Long.
         * @param {goog.math.Long} other Long to subtract from this.
         * @return {!goog.math.Long} The difference of this and the given Long.
         */
        subtract(other:Long):Long {
            return this.add(other.negate());
        }


        /**
         * Returns the product of this and the given long.
         * @param {goog.math.Long} other Long to multiply with this.
         * @return {!goog.math.Long} The product of this and the other.
         */
        multiply(other:Long):Long {
            if (this.isZero()) {
                return Long.ZERO;
            } else if (other.isZero()) {
                return Long.ZERO;
            }

            if (this.equals(Long.MIN_VALUE)) {
                return other.isOdd() ? Long.MIN_VALUE : Long.ZERO;
            } else if (other.equals(Long.MIN_VALUE)) {
                return this.isOdd() ? Long.MIN_VALUE : Long.ZERO;
            }

            if (this.isNegative()) {
                if (other.isNegative()) {
                    return this.negate().multiply(other.negate());
                } else {
                    return this.negate().multiply(other).negate();
                }
            } else if (other.isNegative()) {
                return this.multiply(other.negate()).negate();
            }

            // If both longs are small, use float multiplication
            if (this.lessThan(Long.TWO_PWR_24_) &&
                other.lessThan(Long.TWO_PWR_24_)) {
                return Long.fromNumber(this.toNumber() * other.toNumber());
            }

            // Divide each long into 4 chunks of 16 bits, and then add up 4x4 products.
            // We can skip products that would overflow.

            var a48 = this.high_ >>> 16;
            var a32 = this.high_ & 0xFFFF;
            var a16 = this.low_ >>> 16;
            var a00 = this.low_ & 0xFFFF;

            var b48 = other.high_ >>> 16;
            var b32 = other.high_ & 0xFFFF;
            var b16 = other.low_ >>> 16;
            var b00 = other.low_ & 0xFFFF;

            var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
            c00 += a00 * b00;
            c16 += c00 >>> 16;
            c00 &= 0xFFFF;
            c16 += a16 * b00;
            c32 += c16 >>> 16;
            c16 &= 0xFFFF;
            c16 += a00 * b16;
            c32 += c16 >>> 16;
            c16 &= 0xFFFF;
            c32 += a32 * b00;
            c48 += c32 >>> 16;
            c32 &= 0xFFFF;
            c32 += a16 * b16;
            c48 += c32 >>> 16;
            c32 &= 0xFFFF;
            c32 += a00 * b32;
            c48 += c32 >>> 16;
            c32 &= 0xFFFF;
            c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
            c48 &= 0xFFFF;
            return Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
        }


        /**
         * Returns this Long divided by the given one.
         * @param {goog.math.Long} other Long by which to divide.
         * @return {!goog.math.Long} This Long divided by the given one.
         */
        div(other:Long):Long {
            if (other.isZero()) {
                throw Error('division by zero');
            } else if (this.isZero()) {
                return Long.ZERO;
            }

            if (this.equals(Long.MIN_VALUE)) {
                if (other.equals(Long.ONE) ||
                    other.equals(Long.NEG_ONE)) {
                    return Long.MIN_VALUE;  // recall that -MIN_VALUE == MIN_VALUE
                } else if (other.equals(Long.MIN_VALUE)) {
                    return Long.ONE;
                } else {
                    // At this point, we have |other| >= 2, so |this/other| < |MIN_VALUE|.
                    var halfThis = this.shiftRight(1);
                    let approx = halfThis.div(other).shiftLeft(1);
                    if (approx.equals(Long.ZERO)) {
                        return other.isNegative() ? Long.ONE : Long.NEG_ONE;
                    } else {
                        let rem = this.subtract(other.multiply(approx));
                        var result = approx.add(rem.div(other));
                        return result;
                    }
                }
            } else if (other.equals(Long.MIN_VALUE)) {
                return Long.ZERO;
            }

            if (this.isNegative()) {
                if (other.isNegative()) {
                    return this.negate().div(other.negate());
                } else {
                    return this.negate().div(other).negate();
                }
            } else if (other.isNegative()) {
                return this.div(other.negate()).negate();
            }

            // Repeat the following until the remainder is less than other:  find a
            // floating-point that approximates remainder / other *from below*, add this
            // into the result, and subtract it from the remainder.  It is critical that
            // the approximate value is less than or equal to the real value so that the
            // remainder never becomes negative.
            var res = Long.ZERO;
            let rem:Long = this;
            while (rem.greaterThanOrEqual(other)) {
                // Approximate the result of division. This may be a little greater or
                // smaller than the actual value.
                let approx = Math.max(1, Math.floor(rem.toNumber() / other.toNumber()));

                // We will tweak the approximate result by changing it in the 48-th digit or
                // the smallest non-fractional digit, whichever is larger.
                var log2 = Math.ceil(Math.log(approx) / Math.LN2);
                var delta = (log2 <= 48) ? 1 : Math.pow(2, log2 - 48);

                // Decrease the approximation until it is smaller than the remainder.  Note
                // that if it is too large, the product overflows and is negative.
                var approxRes = Long.fromNumber(approx);
                var approxRem = approxRes.multiply(other);
                while (approxRem.isNegative() || approxRem.greaterThan(rem)) {
                    approx -= delta;
                    approxRes = Long.fromNumber(approx);
                    approxRem = approxRes.multiply(other);
                }

                // We know the answer can't be zero... and actually, zero would cause
                // infinite recursion since we would make no progress.
                if (approxRes.isZero()) {
                    approxRes = Long.ONE;
                }

                res = res.add(approxRes);
                rem = rem.subtract(approxRem);
            }
            return res;
        }


        /**
         * Returns this Long modulo the given one.
         * @param {goog.math.Long} other Long by which to mod.
         * @return {!goog.math.Long} This Long modulo the given one.
         */
        modulo(other:Long):Long {
            return this.subtract(this.div(other).multiply(other));
        }


        /** @return {!goog.math.Long} The bitwise-NOT of this value. */
        not():Long {
            return Long.fromBits(~this.low_, ~this.high_);
        }


        /**
         * Returns the bitwise-AND of this Long and the given one.
         * @param {goog.math.Long} other The Long with which to AND.
         * @return {!goog.math.Long} The bitwise-AND of this and the other.
         */
        and(other:Long):Long {
            return Long.fromBits(this.low_ & other.low_,
                this.high_ & other.high_);
        }


        /**
         * Returns the bitwise-OR of this Long and the given one.
         * @param {goog.math.Long} other The Long with which to OR.
         * @return {!goog.math.Long} The bitwise-OR of this and the other.
         */
        or(other:Long):Long {
            return Long.fromBits(this.low_ | other.low_,
                this.high_ | other.high_);
        }


        /**
         * Returns the bitwise-XOR of this Long and the given one.
         * @param {goog.math.Long} other The Long with which to XOR.
         * @return {!goog.math.Long} The bitwise-XOR of this and the other.
         */
        xor(other:Long):Long {
            return Long.fromBits(this.low_ ^ other.low_,
                this.high_ ^ other.high_);
        }


        /**
         * Returns this Long with bits shifted to the left by the given amount.
         * @param {number} numBits The number of bits by which to shift.
         * @return {!goog.math.Long} This shifted to the left by the given amount.
         */
        shiftLeft(numBits:number):Long {
            numBits &= 63;
            if (numBits == 0) {
                return this;
            } else {
                var low = this.low_;
                if (numBits < 32) {
                    var high = this.high_;
                    return Long.fromBits(
                        low << numBits,
                        (high << numBits) | (low >>> (32 - numBits)));
                } else {
                    return Long.fromBits(0, low << (numBits - 32));
                }
            }
        }


        /**
         * Returns this Long with bits shifted to the right by the given amount.
         * @param {number} numBits The number of bits by which to shift.
         * @return {!goog.math.Long} This shifted to the right by the given amount.
         */
        shiftRight(numBits:number):Long {
            numBits &= 63;
            if (numBits == 0) {
                return this;
            } else {
                var high = this.high_;
                if (numBits < 32) {
                    var low = this.low_;
                    return Long.fromBits(
                        (low >>> numBits) | (high << (32 - numBits)),
                        high >> numBits);
                } else {
                    return Long.fromBits(
                        high >> (numBits - 32),
                        high >= 0 ? 0 : -1);
                }
            }
        }


        /**
         * Returns this Long with bits shifted to the right by the given amount, with
         * zeros placed into the new leading bits.
         * @param {number} numBits The number of bits by which to shift.
         * @return {!goog.math.Long} This shifted to the right by the given amount, with
         *     zeros placed into the new leading bits.
         */
        shiftRightUnsigned(numBits:number):Long {
            numBits &= 63;
            if (numBits == 0) {
                return this;
            } else {
                var high = this.high_;
                if (numBits < 32) {
                    var low = this.low_;
                    return Long.fromBits(
                        (low >>> numBits) | (high << (32 - numBits)),
                        high >>> numBits);
                } else if (numBits == 32) {
                    return Long.fromBits(high, 0);
                } else {
                    return Long.fromBits(high >>> (numBits - 32), 0);
                }
            }
        }


        /**
         * Returns a Long representing the given (32-bit) integer value.
         * @param {number} value The 32-bit integer in question.
         * @return {!goog.math.Long} The corresponding Long value.
         */
        static fromInt(value:number):Long {
            if (-128 <= value && value < 128) {
                var cachedObj = Long.IntCache_[value];
                if (cachedObj) {
                    return cachedObj;
                }
            }

            var obj = new Long(value | 0, value < 0 ? -1 : 0);
            if (-128 <= value && value < 128) {
                Long.IntCache_[value] = obj;
            }
            return obj;
        }


        /**
         * Returns a Long representing the given value, provided that it is a finite
         * number.  Otherwise, zero is returned.
         * @param {number} value The number in question.
         * @return {!goog.math.Long} The corresponding Long value.
         */
        static fromNumber(value:number):Long {
            if (isNaN(value) || !isFinite(value)) {
                return Long.ZERO;
            } else if (value <= -Long.TWO_PWR_63_DBL_) {
                return Long.MIN_VALUE;
            } else if (value + 1 >= Long.TWO_PWR_63_DBL_) {
                return Long.MAX_VALUE;
            } else if (value < 0) {
                return Long.fromNumber(-value).negate();
            } else {
                return new Long(
                    (value % Long.TWO_PWR_32_DBL_) | 0,
                    (value / Long.TWO_PWR_32_DBL_) | 0);
            }
        }

        /**
         * Returns a Long representing the 64-bit integer that comes by concatenating
         * the given high and low bits.  Each is assumed to use 32 bits.
         * @param {number} lowBits The low 32-bits.
         * @param {number} highBits The high 32-bits.
         * @return {!goog.math.Long} The corresponding Long value.
         */
        static fromBits(lowBits:number, highBits:number):Long {
            return new Long(lowBits, highBits);
        }

        /**
         * Returns a Long representation of the given string, written using the given
         * radix.
         * @param {string} str The textual representation of the Long.
         * @param {number=} opt_radix The radix in which the text is written.
         * @return {!goog.math.Long} The corresponding Long value.
         */
        static fromString(str:string, opt_radix:number):Long {
            if (str.length == 0) {
                throw Error('number format error: empty string');
            }

            var radix = opt_radix || 10;
            if (radix < 2 || 36 < radix) {
                throw Error('radix out of range: ' + radix);
            }

            if (str.charAt(0) == '-') {
                return Long.fromString(str.substring(1), radix).negate();
            } else if (str.indexOf('-') >= 0) {
                throw Error('number format error: interior "-" character: ' + str);
            }

            // Do several (8) digits each time through the loop, so as to
            // minimize the calls to the very expensive emulated div.
            var radixToPower = Long.fromNumber(Math.pow(radix, 8));

            var result = Long.ZERO;
            for (var i = 0; i < str.length; i += 8) {
                var size = Math.min(8, str.length - i);
                var value = parseInt(str.substring(i, i + size), radix);
                if (size < 8) {
                    var power = Long.fromNumber(Math.pow(radix, size));
                    result = result.multiply(power).add(Long.fromNumber(value));
                } else {
                    result = result.multiply(radixToPower);
                    result = result.add(Long.fromNumber(value));
                }
            }
            return result;
        }

    }
}