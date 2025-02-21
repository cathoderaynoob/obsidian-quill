import { setIcon } from "obsidian";
import React, { useEffect, useRef } from "react";
import { APP_PROPS, ELEM_CLASSES_IDS } from "@/constants";

interface PromptContentProps {
  value: string;
  rows: number;
  model: string;
  handleInput: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleBlur: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyPress: (e: React.KeyboardEvent) => void;
  handleSend: () => void;
  disabled: boolean;
  target?: string;
}

const PromptContent: React.FC<PromptContentProps> = ({
  value,
  rows,
  model,
  target,
  handleInput,
  handleKeyPress,
  handleSend,
  handleBlur,
  disabled = false,
}) => {
  const promptContentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const textareaClass = ELEM_CLASSES_IDS.promptInput;
  const buttonClass = ELEM_CLASSES_IDS.promptSend;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
    if (buttonRef.current) {
      setIcon(buttonRef.current, APP_PROPS.sendIcon);
    }
  }, []);

  return (
    <div id="oq-prompt-container" ref={promptContentRef}>
      <textarea
        ref={textareaRef}
        className={textareaClass}
        placeholder="» return to send / shift+return for new line"
        rows={rows}
        value={value}
        onBlur={handleBlur}
        onInput={handleInput}
        onKeyDown={handleKeyPress}
      />
      <button
        ref={buttonRef}
        className={buttonClass}
        onClick={handleSend}
        disabled={disabled}
      />
      <div id="oq-prompt-footer">{model}</div>
    </div>
  );
};

export default PromptContent;
