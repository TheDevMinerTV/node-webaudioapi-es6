// @ts-check

const _ = require('underscore');
const async = require('async');
const { EventEmitter } = require('events');
const pcmUtils = require('pcm-boilerplate');
const utils = require('./utils');
const { BLOCK_SIZE } = require('./constants');
const AudioBuffer = require('./AudioBuffer');
const AudioDestinationNode = require('./AudioDestinationNode');
const AudioBufferSourceNode = require('./AudioBufferSourceNode');
const GainNode = require('./GainNode');
const ScriptProcessorNode = require('./ScriptProcessorNode');

class AudioContext extends EventEmitter {
	/**
	 * @param {{ bufferSize?: number; numBuffers?: number; }} opts
	 */
	constructor(opts) {
		super();

		this.destination = new AudioDestinationNode(this);

		this.currentTime = 0;
		this.sampleRate = 44100;
		this.numberOfChannels = 2;
		this.bitDepth = 16;

		this.format = {
			numberOfChannels: 2,
			bitDepth: 16,
			sampleRate: this.sampleRate
		};

		opts = opts || {};

		if (opts.bufferSize) {
			this.format.bufferSize = opts.bufferSize;
		}

		if (opts.numBuffers) {
			this.format.numBuffers = opts.numBuffers;
		}

		this.outStream = null;
		this._encoder = pcmUtils.BufferEncoder(this.format);
		this._frame = 0;
		this._playing = true;
		this._audioOutLoopRunning = false;

		// When a new connection is established, start to pull audio
		this.destination._inputs[0].on('connection', () => {
			if (this._audioOutLoopRunning) {
				return;
			}

			if (!this.outStream) {
				throw new Error('Out stream not set');
			}

			this._audioOutLoopRunning = true;

			async.whilst(
				() => {
					return this._playing;
				},
				(next) => {
					const outBuff = this.destination._tick();

					// If there is space in the output stream's buffers, we write,
					// otherwise we wait for 'drain'
					this._frame += BLOCK_SIZE;
					this.currentTime = (this._frame * 1) / this.sampleRate;

					// TODO setImmediate here is for cases where the outStream won't get
					// full and we end up with call stack max size reached.
					// But is it optimal?

					if (this.outStream.write(this._encoder(outBuff._data))) {
						setImmediate(next);
					} else {
						this.outStream.once('drain', next);
					}
				},
				(err) => {
					this._audioOutLoopRunning = false;

					if (err) {
						return this.emit('error', err);
					}
				}
			);
		});
	}

	/**
	 * Creates a new AudioBuffer
	 * @param {number} numberOfChannels
	 * @param {number} length
	 * @param {number} sampleRate
	 */
	createBuffer(numberOfChannels, length, sampleRate) {
		return new AudioBuffer(numberOfChannels, length, sampleRate);
	}

	/**
	 * Decodes a Buffer
	 * @param {Buffer} audioData
	 * @param {(buffer: import("./AudioBuffer")) => void} successCallback
	 * @param {(error: Error) => void} errorCallback
	 */
	decodeAudioData(audioData, successCallback, errorCallback) {
		utils.decodeAudioData(audioData, function (err, audioBuffer) {
			if (err) errorCallback(err);
			else successCallback(audioBuffer);
		});
	}

	/**
	 * Returns a Promise that resolve when the Buffer is decoded
	 * @param {Buffer} audioData
	 */
	decodeAudioDataAsync(audioData) {
		return utils.decodeAudioDataAsync(audioData);
	}

	/**
	 * Creates a new BufferSource
	 */
	createBufferSource() {
		return new AudioBufferSourceNode(this);
	}

	/**
	 * Creates a new GainNode
	 */
	createGain() {
		return new GainNode(this);
	}

	/**
	 * @param {number} bufferSize
	 * @param {number} numberOfInputChannels
	 * @param {number} numberOfOutputChannels
	 */
	createScriptProcessor(bufferSize, numberOfInputChannels, numberOfOutputChannels) {
		return new ScriptProcessorNode(this, bufferSize, numberOfInputChannels, numberOfOutputChannels);
	}

	/*
		Unimplemented Functions:

		readonly attribute AudioDestinationNode destination
		readonly attribute float sampleRate
		readonly attribute double currentTime
		readonly attribute AudioListener listener

		MediaElementAudioSourceNode createMediaElementSource(HTMLMediaElement mediaElement)

		MediaStreamAudioSourceNode createMediaStreamSource(MediaStream mediaStream)
		MediaStreamAudioDestinationNode createMediaStreamDestination()

		AnalyserNode createAnalyser()
		DelayNode createDelay(optional double maxDelayTime = 1.0)
		BiquadFilterNode createBiquadFilter()
		WaveShaperNode createWaveShaper()
		PannerNode createPanner()
		ConvolverNode createConvolver()

		ChannelSplitterNode createChannelSplitter(optional unsigned long numberOfOutputs = 6)
		ChannelMergerNode createChannelMerger(optional unsigned long numberOfInputs = 6)

		DynamicsCompressorNode createDynamicsCompressor()

		OscillatorNode createOscillator()
		PeriodicWave createPeriodicWave(Float32Array real, Float32Array imag)
	*/

	/** @protected */
	_kill() {
		this._playing = false;

		if (this.outStream) {
			if (this.outStream.close) {
				this.outStream.close();
			} else {
				this.outStream.end();
			}
		}
	}

	/**
	 * @param {import("./AudioDestinationNode")} node
	 * @param {import("./AudioNode")[]} allNodes
	 */
	collectNodes(node, allNodes) {
		allNodes = allNodes || [];
		node = node || this.destination;

		_.chain(node._inputs)
			.pluck('sources')
			.reduce((all, sources) => all.concat(sources), [])
			.pluck('node')
			.value()
			.filter((n) => !_.contains(allNodes, n))
			.forEach((upstreamNode) => {
				allNodes.push(upstreamNode);
				this.collectNodes(upstreamNode, allNodes);
			});

		return allNodes;
	}
}

module.exports = AudioContext;
