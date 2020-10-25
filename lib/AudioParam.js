// @ts-check

const DspObject = require('./DspObject');
const { AudioInput } = require('./audioports');
const AudioBuffer = require('./AudioBuffer');
const { BLOCK_SIZE } = require('./constants');

class AudioParam extends DspObject {
	/**
	 * @param {import('./AudioContext')} context
	 * @param {number} defaultValue
	 * @param {'k' | 'a'} rate
	 */
	constructor(context, defaultValue, rate = 'k') {
		super(context);

		if (typeof defaultValue !== 'number') {
			throw new Error('defaultValue must be a number');
		}

		if (rate !== 'a' && rate !== 'k') {
			throw new Error('invalid rate, must be a or k');
		}

		/** @private */
		this._rate = rate;

		/** @readonly */
		this.defaultValue = defaultValue;

		/** @private */
		this._instrinsicValue = defaultValue;

		this._toConstant();

		// Using AudioNodes as inputs for AudioParam :
		// we have to set same channel attributes as for AudioNodes,
		// so the input knows how to do the mixing
		this.channelInterpretation = 'discrete';
		this.channelCount = 1;
		this.channelCountMode = 'explicit';

		/** @private */
		this._input = new AudioInput(this.context, this, 0);
	}

	get value() {
		return this._instrinsicValue;
	}

	set value(newValue) {
		this._instrinsicValue = newValue;
		this._toConstant();

		this._scheduled = [];
	}

	/**
	 * @param {number} value
	 * @param {number} startTime
	 */
	setValueAtTime(value, startTime) {
		this._schedule('SetValue', startTime, () => {
			this._instrinsicValue = value;
			this._nextEvent();
		});
	}

	/**
	 * @param {number} value
	 * @param {number} endTime
	 */
	linearRampToValueAtTime(value, endTime) {
		this._schedule(
			'LinearRampToValue',
			endTime,
			() => {
				this._instrinsicValue = value;
				this._nextEvent();
			},
			[value]
		);

		this._nextEvent();
	}

	/**
	 * @param {number} value
	 * @param {number} endTime
	 */
	exponentialRampToValueAtTime(value, endTime) {
		if (this._instrinsicValue <= 0 || value <= 0) {
			throw new Error('cannot create exponential ramp with value <= 0');
		}

		this._schedule(
			'ExponentialRampToValue',
			endTime,
			() => {
				this._instrinsicValue = value;
				this._nextEvent();
			},
			[value]
		);

		this._nextEvent();
	}

	/**
	 * @param {number} target
	 * @param {number} startTime
	 * @param {number} timeConstant
	 */
	setTargetAtTime(target, startTime, timeConstant) {
		this._schedule('SetTarget', startTime, () => {
			this['_to_' + this._rate + 'Rate_setTarget'](target, timeConstant, () => {
				this._instrinsicValue = target;

				this._nextEvent();
			});
		});
	}

	/**
	 * @param {number[]} values
	 * @param {number} startTime
	 * @param {number} duration
	 */
	setValueCurveAtTime(values, startTime, duration) {
		this._schedule('SetValueCurve', startTime, () => {
			this['_to_' + this._rate + 'Rate_SetValueCurve'](values, startTime, duration, () => {
				this._instrinsicValue = values[values.length - 1];

				this._nextEvent();
			});
		});
	}

	_nextEvent() {
		const event = this._scheduled[0];

		if (event) {
			if (event.type === 'LinearRampToValue') {
				this['_to_' + this._rate + 'Rate_linearRamp'](event.args[0], event.time);
			} else if (event.type === 'ExponentialRampToValue') {
				this['_to_' + this._rate + 'Rate_exponentialRamp'](event.args[0], event.time);
			} else {
				this._toConstant();
			}
		} else {
			this._toConstant();
		}
	}

	_tick() {
		super._tick();

		const buffer = new AudioBuffer(1, BLOCK_SIZE, this.context.sampleRate);

		this._dsp(buffer.getChannelData(0));

		return buffer;
	}

	/**
	 * This method calculates intrinsic values
	 * @param {Float32Array} array
	 */
	_dsp(array) {}

	// -------------------- DSP methods -------------------- //
	_toConstant() {
		var value = this._instrinsicValue,
			i;

		this._dsp = (array) => {
			for (i = 0; i < BLOCK_SIZE; i++) {
				array[i] = value;
			}
		};
	}

	/**
	 * @param {number} target
	 * @param {number} endTime
	 * @protected
	 */
	_to_aRate_linearRamp(target, endTime) {
		var U0 = this._instrinsicValue,
			Un = U0,
			startTime = this.context.currentTime,
			step = (((target - U0) / (endTime - startTime)) * 1) / this.context.sampleRate,
			next = this._arithmeticSeries(U0, step),
			clip = step > 0 ? Math.min : Math.max,
			i;

		this._dsp = (array) => {
			for (i = 0; i < BLOCK_SIZE; i++) {
				array[i] = clip(Un, target);
				Un = next();
			}

			this._instrinsicValue = array[BLOCK_SIZE - 1];
		};
	}

	/**
	 * @param {number} target
	 * @param {number} endTime
	 * @protected
	 */
	_to_kRate_linearRamp(target, endTime) {
		var U0 = this._instrinsicValue,
			Un = U0,
			startTime = this.context.currentTime,
			step = (((target - U0) / (endTime - startTime)) * BLOCK_SIZE) / this.context.sampleRate,
			next = this._arithmeticSeries(U0, step),
			i;

		this._dsp = (array) => {
			for (i = 0; i < BLOCK_SIZE; i++) {
				array[i] = Un;
			}

			Un = next();

			this._instrinsicValue = array[BLOCK_SIZE - 1];
		};
	}

	/**
	 * @param {number} target
	 * @param {number} timeEnd
	 * @protected
	 */
	_to_aRate_exponentialRamp(target, timeEnd) {
		var timeStart = this.context.currentTime,
			U0 = this._instrinsicValue,
			Un = U0,
			ratio = Math.pow(target / U0, 1 / (this.context.sampleRate * (timeEnd - timeStart))),
			next = this._geometricSeries(U0, ratio),
			clip = ratio > 1 ? Math.min : Math.max,
			i;

		this._dsp = (array) => {
			for (i = 0; i < BLOCK_SIZE; i++) {
				array[i] = clip(target, Un);
				Un = next();
			}

			this._instrinsicValue = array[BLOCK_SIZE - 1];
		};
	}

	/**
	 * @param {number} target
	 * @param {number} timeEnd
	 * @protected
	 */
	_to_kRate_exponentialRamp(target, timeEnd) {
		var timeStart = this.context.currentTime,
			U0 = this._instrinsicValue,
			Un = U0,
			ratio = Math.pow(target / U0, BLOCK_SIZE / (this.context.sampleRate * (timeEnd - timeStart))),
			next = this._geometricSeries(U0, ratio),
			i;

		this._dsp = (array) => {
			for (i = 0; i < BLOCK_SIZE; i++) {
				array[i] = Un;
			}

			Un = next();

			this._instrinsicValue = array[BLOCK_SIZE - 1];
		};
	}

	/**
	 * @param {number} target
	 * @param {number} Tc
	 * @param {() => void} onended
	 * @protected
	 */
	_to_aRate_setTarget(target, Tc, onended) {
		var U0 = this._instrinsicValue - target,
			Un = target + U0,
			ratio = Math.exp(-(1 / this.context.sampleRate) / Tc),
			next = this._geometricSeries(U0, ratio),
			clip = U0 > 0 ? Math.max : Math.min,
			i;

		this._dsp = (array) => {
			for (i = 0; i < BLOCK_SIZE; i++) {
				array[i] = clip(Un, target);
				Un = target + next();
			}

			this._instrinsicValue = array[BLOCK_SIZE - 1];

			if (array[BLOCK_SIZE - 1] === target) {
				onended();
			}
		};
	}

	/**
	 * @param {number} target
	 * @param {number} Tc
	 * @param {() => void} onended
	 * @protected
	 */
	_to_kRate_setTarget(target, Tc, onended) {
		var U0 = this._instrinsicValue - target,
			Un = target + U0,
			ratio = Math.exp(-(BLOCK_SIZE / this.context.sampleRate) / Tc),
			next = this._geometricSeries(U0, ratio),
			i;

		this._dsp = (array) => {
			for (i = 0; i < BLOCK_SIZE; i++) {
				array[i] = Un;
			}

			Un = target + next();

			this._instrinsicValue = array[BLOCK_SIZE - 1];
		};
	}

	/**
	 * @param {string | any[]} values
	 * @param {number} startTime
	 * @param {number} duration
	 * @param {() => void} onended
	 * @protected
	 */
	_to_aRate_SetValueCurve(values, startTime, duration, onended) {
		var valuesLength = values.length,
			coeff = valuesLength / duration,
			Ts = 1 / this.context.sampleRate,
			i,
			t;

		/**
		 * @param {Float32Array} array
		 */
		this._dsp = (array) => {
			t = this.context.currentTime;

			for (i = 0; i < BLOCK_SIZE; i++) {
				array[i] = values[Math.min(Math.round(coeff * (t - startTime)), valuesLength - 1)];
				t += Ts;
			}

			this._instrinsicValue = array[BLOCK_SIZE - 1];

			if (t - startTime >= duration) {
				onended();
			}
		};
	}

	/**
	 * @param {any[]} values
	 * @param {number} startTime
	 * @param {number} duration
	 * @protected
	 */
	_to_kRate_SetValueCurve(values, startTime, duration) {
		var valuesLength = values.length,
			coeff = valuesLength / duration,
			i,
			val;

		/**
		 * @param {Float32Array} array
		 */
		this._dsp = (array) => {
			val = values[Math.min(Math.round(coeff * (this.context.currentTime - startTime)), valuesLength - 1)];

			for (i = 0; i < BLOCK_SIZE; i++) {
				array[i] = val;
			}

			this._instrinsicValue = array[BLOCK_SIZE - 1];
		};
	}

	/**
	 * @param {number} U0
	 * @param {number} ratio
	 * @protected
	 */
	_geometricSeries(U0, ratio) {
		var Un = U0;

		return function () {
			return (Un *= ratio);
		};
	}

	/**
	 * @param {number} U0
	 * @param {number} step
	 * @protected
	 */
	_arithmeticSeries(U0, step) {
		let Un = U0;

		return function () {
			return (Un += step);
		};
	}

	cancelScheduledValues() {
		throw new Error('not implemented');
	}
}

module.exports = AudioParam;
