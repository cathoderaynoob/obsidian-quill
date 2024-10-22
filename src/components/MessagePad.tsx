import { useState } from "react";
import { ELEM_CLASSES, ELEM_IDS } from "@/constants";
import { ExecutionOptions } from "@/executeFeature";
import { usePluginContext } from "@/components/PluginContext";
import PromptContent from "@/components/PromptContent";

interface MessagePadProps {
	executeFeature: (options: ExecutionOptions) => void;
}

const MessagePad: React.FC<MessagePadProps> = ({ executeFeature }) => {
	const { isResponding, settings } = usePluginContext();
	const [promptValue, setPromptValue] = useState<string>("");
	const [rows] = useState<number>(1);

	// Setting dynamic height for textarea as number of rows change
	const setTextareaSize = () => {
		setTimeout(() => {
			const textarea = document.querySelector(
				`.${ELEM_CLASSES.promptInput}`
			) as HTMLElement;
			textarea.style.height = "auto";
			if (textarea.textContent) {
				const { borderTopWidth, borderBottomWidth, lineHeight } =
					window.getComputedStyle(textarea);
				const borderWidth =
					parseFloat(borderTopWidth) + parseFloat(borderBottomWidth);
				const rowHeight = parseInt(lineHeight) + borderWidth;
				const maxHeight = rowHeight * 6;
				const newHeight = Math.min(
					textarea.scrollHeight + borderWidth,
					maxHeight
				);
				textarea.style.height = `${newHeight}px`;
			}
		}, 0);
	};

	const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setPromptValue(e.target.value);
		setTextareaSize();
	};

	const handleBlur = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		if (/^\s*$/.test(promptValue)) {
			const trimmedValue = promptValue.trim();
			setPromptValue(trimmedValue);
		}
		setTextareaSize();
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && e.shiftKey) {
			return;
		} else if (e.key === "Enter") {
			e.stopPropagation();
			e.preventDefault();
			if (!isResponding) handleSend();
		}
	};

	const handleSend = () => {
		const trimmedValue = promptValue.trim();
		setPromptValue(trimmedValue);
		executeFeature({
			id: "newPrompt",
			inputText: trimmedValue,
		});
		setPromptValue("");
		setTextareaSize();
	};

	return (
		<div id={ELEM_IDS.messagePad}>
			<PromptContent
				value={promptValue}
				rows={rows}
				model={settings.openaiModel}
				handleBlur={handleBlur}
				handleInput={handleInput}
				handleKeyPress={handleKeyPress}
				handleSend={handleSend}
				disabled={isResponding}
			/>
		</div>
	);
};

export default MessagePad;
