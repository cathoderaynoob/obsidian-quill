import { App, Modal } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import { QuillPluginSettings } from "@/settings";
import { getFeatureProperties } from "@/featuresRegistry";
import PromptContent from "@/components/PromptContent";

interface PromptModalParams {
	app: App;
	settings: QuillPluginSettings;
	onSend: (prompt: string) => void;
	featureId?: string;
}

// GET PROMPT FROM USER MODAL ==================================================
export class PromptModal extends Modal {
	private modalRoot: Root | null = null;
	private promptValue: string;
	private settings: QuillPluginSettings;
	private onSend: (prompt: string) => void;
	private featureId?: string | null;
	private rows = 6;

	constructor({ app, settings, onSend, featureId }: PromptModalParams) {
		super(app);
		this.settings = settings;
		this.onSend = onSend;
		this.featureId = featureId;
	}

	onOpen() {
		const feature = this.featureId
			? getFeatureProperties(this.app, this.featureId)
			: null;
		const model = feature?.model || this.settings.openaiModel;

		const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
			this.promptValue = e.target.value;
		};

		const handleKeyPress = (e: React.KeyboardEvent) => {
			if (e.key === "Enter" && e.shiftKey) {
				return;
			} else if (e.key === "Enter") {
				e.stopPropagation();
				e.preventDefault();
				this.close();
				handleSend();
			}
		};

		const handleSend = () => {
			this.close();
			this.onSend(this.promptValue.trim());
		};

		this.modalRoot = createRoot(this.contentEl);
		this.modalRoot.render(
			<div id="oq-prompt-modal">
				<PromptContent
					value={this.promptValue}
					rows={this.rows}
					model={model}
					handleInput={handleInput}
					handleKeyPress={handleKeyPress}
					handleSend={handleSend}
				/>
			</div>
		);
	}

	onClose() {
		this.modalRoot?.unmount();
		const { contentEl } = this;
		contentEl.empty();
	}
}

// SIMPLE TEXT OUTPUT MODAL ====================================================
export class TextOutputModal extends Modal {
	textOutput: string;
	modalRoot: Root | null = null;

	constructor(app: App, textOutput: string) {
		super(app);
		this.textOutput = textOutput;
	}

	onOpen() {
		this.modalRoot = createRoot(this.contentEl);
		this.modalRoot.render(<div id="oq-output-modal">{this.textOutput}</div>);
	}

	onClose() {
		this.modalRoot?.unmount();
		this.contentEl.empty();
	}
}
