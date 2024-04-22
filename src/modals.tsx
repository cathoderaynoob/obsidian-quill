import { App, Modal } from "obsidian";
import { h, render } from "preact";
import ApiService from "@/apiService";

export class GptTextOutputModal extends Modal {
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
	selectedText: string;
	promptValue: string;
	apiService: ApiService;

	constructor(app: App, selectedText: string, apiService: ApiService) {
		super(app);
		this.selectedText = selectedText;
		this.apiService = apiService;
	}
	
	onOpen() {
		this.setTitle("How can I help you with your highlighted text?");

		render(
			<div id="gpt-prompt-modal">
				<textarea
					className="gpt-prompt-input"
					placeholder="Questions? Instructions?"
					rows={6}
					onInput={(e: Event) => this.handleInput(e)}
				/>
				<button onClick={this.handleSendPrompt}>Send</button>
			</div>,
			this.contentEl
		);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	handleInput = (e: Event) => {
		const target = e.target as HTMLTextAreaElement;
		this.promptValue = target.value.trim();
	};

	handleSendPrompt = () => {
		const promptAndSelectedText =
			`Prompt:\n\n${this.promptValue}\n` +
			`___\n\n` +
			`Selected Text:\n\n${this.selectedText}`;
		console.log(promptAndSelectedText);
		this.apiService.sendPromptWithSelectedText(promptAndSelectedText);
		this.close();
	};
}
