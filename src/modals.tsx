import { App, Modal } from "obsidian";
import { h, render } from "preact";

export class GptModal extends Modal {
	gptText: string;

	constructor(app: App, gptText: string) {
		super(app);
		this.gptText = gptText;
	}

	onOpen() {
		render(<div>{this.gptText}</div>, this.contentEl);
	}

	onClose() {
		this.contentEl.empty();
	}
}

export class GptGetPromptModal extends Modal {
	prompt: string;

	constructor(app: App, prompt: string) {
		super(app);
		this.prompt = prompt;
	}

	onOpen() {
		render(
			<div>
				<h3>How can I help you with your highlighted text?</h3>
				<textarea
					className="prompt-input"
					placeholder="Questions? Instructions?"
				/>
				<button>Submit</button>
			</div>,
			this.contentEl
		);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
	