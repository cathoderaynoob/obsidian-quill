import { App, Modal } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import PromptModalContent from "@/PromptModalContent";

// =============================================================================
// GET PROMPT FROM USER MODAL ==================================================
// =============================================================================
export class GptPromptModal extends Modal {
	private modalRoot: Root | null = null;
	private promptValue: string;
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
		this.setTitle(
			this.selectedText
				? "How can I help you with your highlighted text?"
				: "How can I help?"
		);

		const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
			const target = e.target as HTMLTextAreaElement;
			this.promptValue = target.value.trim();
		};

		const handleKeyPress = (e: React.KeyboardEvent) => {
			if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				this.close();
				handleSend();
			}
		};

		const handleSend = () => {
			let prompt = `User Prompt:\n\n${this.promptValue}`;
			if (this.selectedText) {
				prompt += `\n\nUser Selected Text:\n\n${this.selectedText}`;
			}
			this.close();
			this.onSend(prompt);
		};

		this.modalRoot = createRoot(this.contentEl);

		this.modalRoot.render(
			<PromptModalContent
				handleInput={handleInput}
				handleKeyPress={handleKeyPress}
				handleSend={handleSend}
			/>
		);
	}

	onClose() {
		this.modalRoot?.unmount();
		const { contentEl } = this;
		contentEl.empty();
	}
}

// =============================================================================
// SIMPLE TEXT OUTPUT MODAL ====================================================
// =============================================================================
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
