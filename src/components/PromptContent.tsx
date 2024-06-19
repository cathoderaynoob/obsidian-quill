import { setIcon } from "obsidian";
import React, { useEffect, useRef } from "react";
import { APP_PROPS } from "@/constants";

interface PromptContentProps {
	value: string;
	rows: number;
	handleInput: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
	handleKeyPress: (e: React.KeyboardEvent) => void;
	handleSend: () => void;
}

const PromptContent: React.FC<PromptContentProps> = ({
	value,
	rows,
	handleInput,
	handleKeyPress,
	handleSend,
}) => {
	const promptContentRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setTimeout(() => {
			if (promptContentRef?.current) {
				promptContentRef.current.querySelector("textarea")?.focus();
				setIcon(
					promptContentRef.current.querySelector("button") as HTMLElement,
					APP_PROPS.sendIcon
				);
			}
		}, 0);
	}, []);

	return (
		<div className="gpt-prompt-container" ref={promptContentRef}>
			<textarea
				className="gpt-prompt-input"
				placeholder="» press return to send / shift+return for a new line"
				rows={rows}
				value={value}
				onInput={handleInput}
				onKeyDown={handleKeyPress}
			/>
			{/* TODO: Disable unless text entered */}
			<button className="gpt-prompt-send" onClick={handleSend} />
		</div>
	);
};

export default PromptContent;
