import { App, Modal } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import { IPluginServices } from "@/interfaces";
import { GptFeatures } from "@/features";

// GET PROMPT FROM USER MODAL ==================================================
export class GptGetPromptModal extends Modal {
	selectedText: string;
	promptValue: string;
	pluginServices: IPluginServices;
	features: GptFeatures;
	private root: Root | null = null;

	constructor(app: App, selectedText: string, features: GptFeatures) {
		super(app);
		this.selectedText = selectedText;
		this.features = features;

		this.pluginServices = features.apiService.pluginServices;
	}

	onOpen() {
		this.setTitle("How can I help you with your highlighted text?");

		const handleKeyPress = (e: React.KeyboardEvent) => {
			if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				this.handleSendSelectedWithPrompt();
			}
		};

		const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
			const target = e.target as HTMLTextAreaElement;
			this.promptValue = target.value.trim();
		};

		const root = createRoot(this.contentEl);

		root.render(
			<div id="gpt-prompt-modal">
				<textarea
					className="gpt-prompt-input"
					placeholder="Cmd-Return to send"
					rows={6}
					onInput={handleInput}
					onKeyDown={handleKeyPress}
				/>
				<button onClick={this.handleSendSelectedWithPrompt}>Send</button>
			</div>
		);
	}

	onClose() {
		if (this.root) {
			this.root.unmount();
		}
		const { contentEl } = this;
		contentEl.empty();
	}

	handleSendSelectedWithPrompt = async () => {
		const promptWithSelectedText =
			`Prompt:\n\n${this.promptValue}\n` +
			`___\n\n` +
			`Selected Text:\n\n${this.selectedText}`;
		console.log(promptWithSelectedText);
		
		this.close();

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
	};
}

// SIMPLE TEXT OUTPUT MODAL ====================================================
export class GptTextOutputModal extends Modal {
	gptText: string;
	root: Root | null = null;

	constructor(app: App, gptText: string) {
		super(app);
		this.gptText = gptText;
	}

	onOpen() {
		const root = createRoot(this.contentEl);
		root.render(<div id="gpt-output-modal">{this.gptText}</div>);
	}

	onClose() {
		this.contentEl.empty();
	}
}
