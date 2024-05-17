import { EventEmitter } from "events";

class CustomEmitter extends EventEmitter {
	id: string;

	constructor() {
		super();
		this.id = Math.random().toString(36).substring(2, 15); // Generate a unique ID

		const today = new Date();
		const formattedDate = `${String(today.getHours()).padStart(
			2,
			"0"
		)}:${String(today.getMinutes()).padStart(2, "0")}:${String(
			today.getSeconds()
		).padStart(2, "0")} ${today.getFullYear()}.${String(
			today.getMonth() + 1
		).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;

		console.log(
			`${formattedDate} – CustomEmitter initialized with ID: ${this.id}`
		);
	}
}

const emitter = new CustomEmitter();

export default emitter;
