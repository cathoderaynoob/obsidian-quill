import { App, Modal } from "obsidian";
import { Root, createRoot } from "react-dom/client";

// =============================================================================
// GET PROMPT FROM USER MODAL ==================================================
// =============================================================================
export class GptGetPromptModal extends Modal {
	private selectedText: string;
	private promptValue: string;
	private onSend: (promptWithSelectedText: string) => void;
	private modalRoot: Root | null = null;

	constructor(
		app: App,
		selectedText: string,
		onSend: (promptWithSelectedText: string) => void
	) {
		super(app);
		this.selectedText = selectedText;
		this.onSend = onSend;
	}

	onOpen() {
		this.setTitle("How can I help you with your highlighted text?");

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
			const promptWithSelectedText =
				`User Prompt:\n\n${this.promptValue}\n\n` +
				`User Selected Text:\n\n${this.selectedText}`;
			this.close();
			this.onSend(promptWithSelectedText);
		};

		this.modalRoot = createRoot(this.contentEl);

		this.modalRoot.render(
			<div id="gpt-prompt-modal">
				<textarea
					className="gpt-prompt-input"
					placeholder="Cmd-Return to send"
					rows={6}
					onInput={handleInput}
					onKeyDown={handleKeyPress}
				/>
				<button onClick={handleSend}>Send</button>
			</div>
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
