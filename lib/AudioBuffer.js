// @ts-check

class AudioBuffer {
	/**
	 * @param {number} numberOfChannels
	 * @param {number} length
	 * @param {number} sampleRate
	 * @param {boolean} [partial]
	 */
	constructor(numberOfChannels, length, sampleRate, partial = false) {
		if (sampleRate < 0) {
			throw new Error('invalid sample rate : ' + sampleRate);
		}

		if (length < 0) {
			throw new Error('invalid length : ' + length);
		}

		if (numberOfChannels < 0) {
			throw new Error('invalid numberOfChannels : ' + numberOfChannels);
		}

		this._data = [];

		// Just a hack to be able to create a partially initialized AudioBuffer
		if (partial) {
			for (let channel = 0; channel < numberOfChannels; channel++) {
				this._data.push(new Float32Array(length));
			}
		}

		this.sampleRate = sampleRate;
		this.length = length;
		this.duration = length / sampleRate;
		this.numberOfChannels = numberOfChannels;
	}

	/**
	 * Gets the data of a channel
	 * @param {number} channel
	 */
	getChannelData(channel) {
		if (channel >= this.numberOfChannels) {
			throw new Error('invalid channel');
		}

		return this._data[channel];
	}

	/**
	 * Slices the underlying data. Similar to Float32Array.slice
	 * @param {number} [start]
	 * @param {number} [end]
	 */
	slice(start, end) {
		const array = this._data.map((chArray) => chArray.subarray.apply(chArray, [start, end]));

		return AudioBuffer.fromArray(array, this.sampleRate);
	}

	/**
	 * Concatenates two AudioBuffers
	 * @param {AudioBuffer} buffer
	 */
	concat(buffer) {
		if (buffer.sampleRate !== this.sampleRate) {
			throw new Error('Sample Rate does not match');
		}

		if (buffer.numberOfChannels !== this.numberOfChannels) {
			throw new Error('Number of Channels does not match');
		}

		const newLength = buffer.length + this.length;

		const newArray = this._data.map((chArray, ch) => {
			const newChArray = new Float32Array(newLength);

			newChArray.set(chArray);
			newChArray.set(buffer._data[ch], chArray.length);

			return newChArray;
		});

		return AudioBuffer.fromArray(newArray, this.sampleRate);
	}

	/**
	 * Inserts an AudioBuffer at an offset into the current AudioBuffer
	 * @param {AudioBuffer} buffer
	 * @param {number} [offset]
	 */
	set(buffer, offset) {
		if (buffer.sampleRate !== this.sampleRate) {
			throw new Error('Sample Rate does not match');
		}

		if (buffer.numberOfChannels !== this.numberOfChannels) {
			throw new Error('Number of Channels does not match');
		}

		this._data.forEach((chArray, ch) => chArray.set(buffer.getChannelData(ch), offset));
	}

	/**
	 * Creates a new AudioBuffer and fills it with a number
	 * @param {number} val
	 * @param {number} numberOfChannels
	 * @param {number} length
	 * @param {number} sampleRate
	 */
	static fillWithVal(val, numberOfChannels, length, sampleRate) {
		const audioBuffer = new AudioBuffer(numberOfChannels, length, sampleRate);

		for (let ch = 0; ch < numberOfChannels; ch++) {
			const chData = audioBuffer._data[ch];

			for (let i = 0; i < length; i++) {
				chData[i] = val;
			}
		}

		return audioBuffer;
	}

	/**
	 * Converts an array of Float32Array into an AudioBuffer
	 * @param {Float32Array[]} array
	 * @param {number} sampleRate
	 */
	static fromArray(array, sampleRate) {
		const audioBuffer = new AudioBuffer(array.length, array[0].length, sampleRate);

		array.forEach((chArray) => audioBuffer._data.push(chArray));

		return audioBuffer;
	}
}

module.exports = AudioBuffer;
