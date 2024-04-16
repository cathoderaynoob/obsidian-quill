import { App, Modal } from "obsidian";
import { h, render } from "preact";

export class GptModal extends Modal {
	gptText: string;

	constructor(app: App, gptText: string) {
		super(app);
		this.gptText = gptText;
	}

	onOpen() {
    render(
      <div>
        {this.gptText}
      </div>,
      this.contentEl
    );
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

export class GptGetPromptModal extends Modal {
	prompt: string;

	constructor(app: App, prompt: string) {
		super(app);
		this.prompt = prompt;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("h2", {
			text: "How can I help with your highlighted text?",
		});
		contentEl.createEl("textarea", {
			cls: "prompt-input",
			placeholder: "Questions? Instructions?",
		});
		contentEl.createEl("button", { text: "Submit" });
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
