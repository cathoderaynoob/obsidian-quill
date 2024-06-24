import { App, Modal } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import PromptContent from "@/components/PromptContent";

// GET PROMPT FROM USER MODAL ==================================================
export class GptPromptModal extends Modal {
	private modalRoot: Root | null = null;
	private promptValue: string;
	private rows = 6;
	private selectedText?: string;
	private onSend: (promptWithSelectedText: string) => void;

	constructor(
		app: App,
		onSend: (promptWithSelectedText: string) => void,
		selectedText?: string
	) {
		super(app);
		this.selectedText = selectedText;
		this.onSend = onSend;
	}

	onOpen() {
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
			<div id="gpt-prompt-modal">
				<PromptContent
					value={this.promptValue}
					rows={this.rows}
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
export class GptTextOutputModal extends Modal {
	gptText: string;
	modalRoot: Root | null = null;

	constructor(app: App, gptText: string) {
		super(app);
		this.gptText = gptText;
	}

	onOpen() {
		this.modalRoot = createRoot(this.contentEl);
		this.modalRoot.render(<div id="gpt-output-modal">{this.gptText}</div>);
	}

	onClose() {
		this.modalRoot?.unmount();
		this.contentEl.empty();
	}
}
