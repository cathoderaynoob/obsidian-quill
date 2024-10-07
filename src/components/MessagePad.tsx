import { useState } from "react";
import { ELEM_IDS } from "@/constants";
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

	const setTextareaSize = (textarea: HTMLTextAreaElement) => {
		textarea.style.height = "auto";
		const { borderTopWidth, borderBottomWidth, lineHeight } =
			window.getComputedStyle(textarea);
		const borderWidth =
			parseFloat(borderTopWidth) + parseFloat(borderBottomWidth);
		const rowHeight = parseInt(lineHeight) + borderWidth;
		const maxHeight = rowHeight * 6;
		const newHeight = Math.min(textarea.scrollHeight + borderWidth, maxHeight);
		textarea.style.height = `${newHeight}px`;
	};

	const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const textarea = e.target;
		setTextareaSize(textarea);
		setPromptValue(e.target.value);
	};

	const handleBlur = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const textarea = e.target;
		if (/^\s*$/.test(promptValue)) {
			const trimmedValue = promptValue.trim();
			setPromptValue(trimmedValue);
		}
		setTextareaSize(textarea);
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
