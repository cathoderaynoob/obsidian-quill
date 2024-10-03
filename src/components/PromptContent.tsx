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
	disabled: boolean;
}

const PromptContent: React.FC<PromptContentProps> = ({
	value,
	rows,
	model,
	handleInput,
	handleKeyPress,
	handleSend,
	handleBlur,
	disabled = false,
}) => {
	const promptContentRef = useRef<HTMLDivElement>(null);
	const textareaClass = "oq-prompt-input";
	const buttonClass = "oq-prompt-send";

	useEffect(() => {
		setTimeout(() => {
			if (promptContentRef?.current) {
				(
					promptContentRef.current.querySelector(
						`textarea.${textareaClass}`
					) as HTMLElement
				)?.focus();
				setIcon(
					promptContentRef.current.querySelector(
						`button.${buttonClass}`
					) as HTMLElement,
					APP_PROPS.sendIcon
				);
			}
		}, 0);
	}, []);

	return (
		<div className="oq-prompt-container" ref={promptContentRef}>
			<textarea
				className={textareaClass}
				placeholder="» return to send / shift+return for new line"
				rows={rows}
				value={value}
				onBlur={handleBlur}
				onInput={handleInput}
				onKeyDown={handleKeyPress}
			/>
			<button
				className={buttonClass}
				onClick={handleSend}
				disabled={disabled}
			/>
			<div className="oq-prompt-model">{model}</div>
		</div>
	);
};

export default PromptContent;
