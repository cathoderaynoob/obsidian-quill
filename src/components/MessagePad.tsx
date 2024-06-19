import { useState } from "react";
import PromptContent from "@/components/PromptContent";
import { ExecutionOptions } from "@/executeFeature";

interface MessagePadProps {
	executeFeature: (options: ExecutionOptions) => void;
}

const MessagePad: React.FC<MessagePadProps> = ({ executeFeature }) => {
	const [promptValue, setPromptValue] = useState<string>("");
	const [rows, setRows] = useState<number>(1);

	const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setRows(Math.min(e.target.value.split("\n").length, 6));
		setPromptValue(e.target.value);
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

	const handleSend = () => {
		setPromptValue(promptValue.trim());
		executeFeature({
			id: "newPrompt",
			inputText: promptValue.trim(),
		});
		setPromptValue("");
		setRows(1);
	};

	return (
		<div id="gpt-message-pad">
			<PromptContent
				value={promptValue}
				rows={rows}
				handleInput={handleInput}
				handleKeyPress={handleKeyPress}
				handleSend={handleSend}
			/>
		</div>
	);
};

export default MessagePad;
