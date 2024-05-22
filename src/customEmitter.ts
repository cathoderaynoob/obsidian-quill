import { EventEmitter } from "events";

class CustomEmitter extends EventEmitter {
	id: string;

	constructor() {
		super();
		this.id = Math.random().toString(36).substring(2, 15); // Generate a unique ID
	}
}

const emitter = new CustomEmitter();

export default emitter;
