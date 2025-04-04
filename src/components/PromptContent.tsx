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
  newConversation?: (event: React.MouseEvent<HTMLElement>) => void;
  manuallySaveConv?: (event: React.MouseEvent<HTMLElement>) => void;
  isConversationActive?: boolean;
  disabled: boolean;
}

const PromptContent: React.FC<PromptContentProps> = ({
  value,
  rows,
  model,
  handleInput,
  handleBlur,
  handleKeyPress,
  handleSend,
  handleOpenSettings,
  newConversation,
  manuallySaveConv: manuallySaveConv,
  isConversationActive: isConversationActive,
  disabled = false,
}) => {
  const promptContentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendButtonRef = useRef<HTMLButtonElement>(null);
  const newConversationButtonRef = useRef<HTMLButtonElement>(null);
  const saveConversationButtonRef = useRef<HTMLButtonElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const clickableIconClass = ELEM_CLASSES_IDS.clickableIcon;
  const textareaClass = ELEM_CLASSES_IDS.promptInput;
  const sendButtonClass = ELEM_CLASSES_IDS.promptSend;

  useEffect(() => {
    // Text Field
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
    // Send Button
    if (sendButtonRef.current)
      setIcon(sendButtonRef.current, APP_PROPS.sendIcon);

    // New Conversation Button
    if (newConversationButtonRef.current) {
      setIcon(newConversationButtonRef.current, APP_PROPS.appIcon);
      setTooltip(newConversationButtonRef.current, "New conversation", {
        placement: "top",
      });
    }
    // Open Quill Settings Button
    if (settingsButtonRef.current) {
      setIcon(settingsButtonRef.current, APP_PROPS.openSettingsIcon);
      setTooltip(settingsButtonRef.current, "Open Quill Settings", {
        placement: "top",
      });
    }
  }, []);

  useEffect(() => {
    // Save Conversation Manually Button
    if (manuallySaveConv) {
      const saveConvElem = saveConversationButtonRef.current;
      if (saveConvElem) {
        saveConvElem.className = ELEM_CLASSES_IDS.clickableIcon;
        setIcon(
          saveConvElem,
          isConversationActive
            ? APP_PROPS.saveConversationIcon
            : APP_PROPS.noConvToSaveIcon
        );
        saveConvElem.toggleClass(
          ELEM_CLASSES_IDS.disabled,
          !isConversationActive
        );
        const tooltipText = isConversationActive
          ? "Save conversation"
          : "No conversation to save";
        setTooltip(saveConvElem, tooltipText, {
          placement: "top",
        });
      }
    }
  }, [manuallySaveConv]);

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
      <div id={ELEM_CLASSES_IDS.promptFooter}>
        {newConversation && (
          <button
            ref={newConversationButtonRef}
            id={ELEM_CLASSES_IDS.newConversation}
            className={clickableIconClass}
            onClick={newConversation}
          />
        )}
        <span>{model}</span>
        {manuallySaveConv && (
          <button
            ref={saveConversationButtonRef}
            id={ELEM_CLASSES_IDS.saveConversation}
            onClick={isConversationActive ? manuallySaveConv : undefined}
            disabled={!isConversationActive}
          />
        )}
        <button
          ref={settingsButtonRef}
          className={clickableIconClass}
          onClick={handleOpenSettings}
        />
      </div>
    </div>
  );
};

export default PromptContent;
