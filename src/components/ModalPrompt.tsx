import { App, Modal } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import { QuillPluginSettings } from "@/settings";
import { getFeatureProperties } from "@/featuresRegistry";
import emitter from "@/customEmitter";
import PromptContent from "@/components/PromptContent";

interface ModalPromptParams {
	app: App;
	settings: QuillPluginSettings;
	onSend: (prompt: string) => void;
	featureId?: string;
}

// GET PROMPT FROM USER MODAL =================================================
class ModalPrompt extends Modal {
	private modalRoot: Root | null = null;
	private promptValue: string;
	private settings: QuillPluginSettings;
	private onSend: (prompt: string) => void;
	private featureId?: string | null;
	private rows = 6;
	private disabled = false;

	constructor({ app, settings, onSend, featureId }: ModalPromptParams) {
		super(app);
		this.settings = settings;
		this.onSend = onSend;
		this.featureId = featureId;
		this.handleStreamEnd = this.handleStreamEnd.bind(this);
		emitter.on("modalStreamEnd", this.handleStreamEnd);
	}

	handleStreamEnd = () => {
		// console.log("Stream ended");
		this.enableSend();
	};

	enableSend = (): void => {
		this.disabled = false;
	};

	onOpen() {
		const feature = this.featureId
			? getFeatureProperties(this.app, this.featureId)
			: null;
		const model = feature?.model || this.settings.openaiModel;

		const disableSend = (): void => {
			this.disabled = true;
		};

		const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
			this.promptValue = e.target.value;
		};

		const handleBlur = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
			e.target.value = e.target.value.trim();
		};

		const handleSend = () => {
			if (this.disabled) return;
			this.close();
			this.onSend(this.promptValue.trim());
			disableSend();
		};

		const handleKeyPress = (e: React.KeyboardEvent) => {
			if (this.disabled) disableSend();
			if (e.key === "Enter" && e.shiftKey) {
				return;
			} else if (e.key === "Enter") {
				e.stopPropagation();
				e.preventDefault();
				this.close();
				handleSend();
			}
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
					handleBlur={handleBlur}
					disabled={this.disabled} // Update this to disable sending
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

export default ModalPrompt;
