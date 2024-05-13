import { App, Modal } from "obsidian";
import { h, render } from "preact";
import { IPluginServices } from "@/interfaces";
import { GptFeatures } from "@/features";

// GET PROMPT FROM USER MODAL ==================================================
export class GptGetPromptModal extends Modal {
	selectedText: string;
	promptValue: string;
	pluginServices: IPluginServices;
	features: GptFeatures;

	constructor(app: App, selectedText: string, features: GptFeatures) {
		super(app);
		this.selectedText = selectedText;
		this.features = features;

		this.pluginServices = features.apiService.pluginServices;
	}

	onOpen() {
		this.setTitle("How can I help you with your highlighted text?");

		const handleKeyPress = (e: KeyboardEvent) => {
			if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				this.handleSendSelectedWithPrompt();
			}
		};

		render(
			<div id="gpt-prompt-modal">
				<textarea
					className="gpt-prompt-input"
					placeholder="Cmd-Return to send"
					rows={6}
					onInput={(e: Event) => this.handleInput(e)}
					onKeyDown={(e: KeyboardEvent) => handleKeyPress(e)}
				/>
				<button onClick={this.handleSendSelectedWithPrompt}>Send</button>
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

	handleSendSelectedWithPrompt = async () => {
		const promptWithSelectedText =
			`Prompt:\n\n${this.promptValue}\n` +
			`___\n\n` +
			`Selected Text:\n\n${this.selectedText}`;
		console.log(promptWithSelectedText);

		const leaf = await this.pluginServices.activateView();
		if (leaf) {
			try {
				const container = leaf.view.containerEl.children[1].createEl("div", {
					cls: "gpt-msg-container",
				});
				await this.features.executeFeature(
					"sendPromptWithSelectedText",
					promptWithSelectedText,
					container
				);
			} catch (error) {
				this.pluginServices.notifyError(
					"Error sending prompt with selected text."
				);
			}
		}
		this.close();
	};
}

// SIMPLE TEXT OUTPUT MODAL ====================================================
export class GptTextOutputModal extends Modal {
	gptText: string;

	constructor(app: App, gptText: string) {
		super(app);
		this.gptText = gptText;
	}

	onOpen() {
		render(<div id="gpt-output-modal">{this.gptText}</div>, this.contentEl);
	}

	onClose() {
		this.contentEl.empty();
	}
}
