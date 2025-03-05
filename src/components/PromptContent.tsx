import { setIcon, setTooltip } from "obsidian";
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
  handleOpenSettings: () => void;
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
  handleOpenSettings,
  handleBlur,
  disabled = false,
}) => {
  const promptContentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendButtonRef = useRef<HTMLButtonElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const textareaClass = ELEM_CLASSES_IDS.promptInput;
  const sendButtonClass = ELEM_CLASSES_IDS.promptSend;
  const settingsButtonClass = ELEM_CLASSES_IDS.settingsButton;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
    if (sendButtonRef.current) {
      setIcon(sendButtonRef.current, APP_PROPS.sendIcon);
    }
    if (settingsButtonRef.current) {
      setIcon(settingsButtonRef.current, APP_PROPS.openSettingsIcon);
      setTooltip(settingsButtonRef.current, "Open Quill Settings", {
        placement: "left",
      });
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
        ref={sendButtonRef}
        className={sendButtonClass}
        onClick={handleSend}
        disabled={disabled}
      />
      <div id="oq-prompt-footer">
        <span>{model}</span>
        <button
          ref={settingsButtonRef}
          className={settingsButtonClass}
          onClick={handleOpenSettings}
        />
      </div>
    </div>
  );
};

export default PromptContent;
