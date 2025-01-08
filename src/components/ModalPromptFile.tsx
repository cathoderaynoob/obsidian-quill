import ModalPrompt, { ModalPromptFileParams } from "@/components/ModalPrompt";
import PromptContent from "@/components/PromptContent";
import { getFeatureProperties } from "@/featuresRegistry";

class ModalPromptFile extends ModalPrompt {
	filePath: string;
	override onSend: (prompt: string, filePath?: string) => void;

	constructor(params: ModalPromptFileParams) {
		super(params);
		this.featureId = params.featureId;
		console.log(this.featureId);
		this.filePath = "test.md";
	}

	handleSend = () => {
		if (this.disabled) return;
		this.close();
		this.onSend(this.promptValue.trim(), this.filePath);
		this.disabled = true;
	};

	handleKeyPress = (e: React.KeyboardEvent) => {
		if (this.disabled) {
			this.disabled = true;
			return;
		}
		if (e.key === "Enter" && e.shiftKey) {
			return;
		} else if (e.key === "Enter") {
			e.stopPropagation();
			e.preventDefault();
			this.close();
			this.handleSend();
		}
	};

	onOpen() {
		super.onOpen();

		const feature = this.featureId
			? getFeatureProperties(this.app, this.featureId)
			: null;
		const model = feature?.model || this.settings.openaiModel;

		this.modalRoot?.render(
			<div id="oq-usetemplate-modal">
				<PromptContent
					value={this.promptValue}
					rows={this.rows}
					model={model}
					handleInput={this.handleInput}
					handleKeyPress={this.handleKeyPress}
					handleSend={this.handleSend}
					handleBlur={this.handleBlur}
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

export default ModalPromptFile;
