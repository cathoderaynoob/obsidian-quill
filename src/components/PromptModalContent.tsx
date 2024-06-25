import React, { useEffect, useRef } from "react";

interface PromptModalContentProps {
	handleInput: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
	handleKeyPress: (e: React.KeyboardEvent) => void;
	handleSend: () => void;
}

const PromptModalContent: React.FC<PromptModalContentProps> = ({
	handleInput,
	handleKeyPress,
	handleSend,
}) => {
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		setTimeout(() => {
			textareaRef?.current?.focus();
		}, 0);
	});

	return (
		<div id="oq-prompt-modal">
			<textarea
				ref={textareaRef}
				className="oq-prompt-input"
				placeholder="Cmd-return to send"
				rows={6}
				onInput={handleInput}
				onKeyDown={handleKeyPress}
			/>
			<button className="oq-prompt-send" onClick={handleSend}>
				Send
			</button>
		</div>
	);
};

export default PromptModalContent;
