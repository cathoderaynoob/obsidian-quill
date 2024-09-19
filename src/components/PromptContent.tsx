import { setIcon } from "obsidian";
import React, { useEffect, useRef } from "react";
import { APP_PROPS } from "@/constants";

interface PromptContentProps {
	value: string;
	rows: number;
	model: string;
	handleInput: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
	handleBlur: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
	handleKeyPress: (e: React.KeyboardEvent) => void;
	handleSend: () => void;
}

const PromptContent: React.FC<PromptContentProps> = ({
	value,
	rows,
	model,
	handleInput,
	handleKeyPress,
	handleSend,
	handleBlur,
}) => {
	const promptContentRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setTimeout(() => {
			if (promptContentRef?.current) {
				(
					promptContentRef.current.querySelector(
						"#oq-prompt-input"
					) as HTMLElement
				)?.focus();
				setIcon(
					promptContentRef.current.querySelector(
						"button#oq-prompt-send"
					) as HTMLElement,
					APP_PROPS.sendIcon
				);
			}
		}, 0);
	}, []);

	return (
		<div className="oq-prompt-container" ref={promptContentRef}>
			<textarea
				id="oq-prompt-input"
				placeholder="» return to send / shift+return for new line"
				rows={rows}
				value={value}
				onInput={handleInput}
				onKeyDown={handleKeyPress}
				onBlur={handleBlur}
			/>
			{/* TODO: Disable unless text entered */}
			<button id="oq-prompt-send" onClick={handleSend} />
			<div className="oq-prompt-model">{model}</div>
		</div>
	);
};

export default PromptContent;
