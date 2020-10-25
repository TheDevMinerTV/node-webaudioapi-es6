// @ts-check

const { sortedIndex, reject, contains } = require('underscore');
const { EventEmitter } = require('events');

class DspObject extends EventEmitter {
	/** @protected */
	_frame = 0;

	/**
	 * @protected
	 * @type {any[]}
	 */
	_scheduled = [];

	/**
	 * @param {import('./AudioContext')} context
	 */
	constructor(context) {
		super();

		/** @protected */
		this.context = context;
	}

	_tick() {
		this._frame++;

		const eventsToExecute = [];
		let event = this._scheduled.shift();
		let eventsSameTime;
		let previousTime;

		// Gather all events that need to be executed at this tick
		while (event && event.time <= this.context.currentTime) {
			previousTime = event.time;
			eventsSameTime = [];

			// Gather all the events with same time
			while (event && event.time === previousTime) {
				// Add the event only if there isn't already events with same type
				if (eventsSameTime.every((other) => event.type !== other.type)) {
					eventsSameTime.push(event);
				}

				event = this._scheduled.shift();
			}

			eventsSameTime.forEach((event) => eventsToExecute.push(event));
		}

		if (event) {
			this._scheduled.unshift(event);
		}

		// And execute
		eventsToExecute.reverse().forEach((event) => event.func && event.func());
	}

	/**
	 * @param {string} type
	 * @param {number} time
	 * @param {any} func
	 * @param {number[]} [args]
	 * @protected
	 */
	_schedule(type, time, func, args) {
		const event = {
			time,
			func,
			type
		};

		const ind = sortedIndex(this._scheduled, event, (e) => e.time);

		if (args) {
			event.args = args;
		}

		this._scheduled.splice(ind, 0, event);
	}

	/**
	 * @param {string} types
	 * @protected
	 */
	_unscheduleTypes(types) {
		this._scheduled = reject(this._scheduled, (event) => contains(types, event.types));
	}
}

module.exports = DspObject;
