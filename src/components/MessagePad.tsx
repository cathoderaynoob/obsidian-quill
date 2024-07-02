import { useState } from "react";
import { ExecutionOptions } from "@/executeFeature";
// import { FeatureProperties } from "@/featureRegistry";
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
		const trimmedValue = promptValue.trim();
		setPromptValue(trimmedValue);
		executeFeature({
			id: "newPrompt",
			inputText: trimmedValue,
		});
		setPromptValue("");
		setRows(1);
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
			/>
		</div>
	);
};

export default MessagePad;
