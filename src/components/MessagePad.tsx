import { useState } from "react";
import { ExecutionOptions } from "@/executeFeature";
import PromptContent from "@/components/PromptContent";
import { usePluginContext } from "@/components/PluginContext";

interface MessagePadProps {
	executeFeature: (options: ExecutionOptions) => void;
}

const MessagePad: React.FC<MessagePadProps> = ({ executeFeature }) => {
	const { settings } = usePluginContext();
	const [promptValue, setPromptValue] = useState<string>("");
	const [rows, setRows] = useState<number>(1);

	const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const textarea = e.target;
		setTextareaSize(textarea);
		setPromptValue(e.target.value);
	};

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

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && e.shiftKey) {
			return;
		} else if (e.key === "Enter") {
			e.stopPropagation();
			e.preventDefault();
			handleSend();
		}
	};

	const handleBlur = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const textarea = e.target;
		if (/^\s*$/.test(promptValue)) {
			const trimmedValue = promptValue.trim();
			setPromptValue(trimmedValue);
		}
		setTextareaSize(textarea);
	};

	const handleSend = () => {
		const trimmedValue = promptValue.trim();
		setPromptValue(trimmedValue);
		executeFeature({
			id: "newPrompt",
			inputText: trimmedValue,
		});
		setPromptValue("");
		// setRows(1);
	};

	return (
		<div id="oq-message-pad">
			<PromptContent
				value={promptValue}
				rows={rows}
				model={settings.openaiModel}
				handleInput={handleInput}
				handleKeyPress={handleKeyPress}
				handleSend={handleSend}
				handleBlur={handleBlur}
			/>
		</div>
	);
};

export default MessagePad;
