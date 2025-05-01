import { setIcon, setTooltip } from "obsidian";
import React, { useEffect, useRef } from "react";
import { APP_PROPS, ELEM_CLASSES_IDS } from "@/constants";

interface PromptContentProps {
  value: string;
  rows: number;
  modelDesc: string;
  outputTarget?: string;
  handleInput: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleBlur: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyPress: (e: React.KeyboardEvent) => void;
  handleSend: () => void;
  handleOpenTemplate?: () => void;
  handleEditCommand?: () => void;
  handleOpenSettings: () => void;
  newConversation?: (event: React.MouseEvent<HTMLElement>) => void;
  manuallySaveConv?: (event: React.MouseEvent<HTMLElement>) => void;
  isConversationActive?: boolean;
  disabled: boolean;
}

const PromptContent: React.FC<PromptContentProps> = ({
  value,
  rows,
  modelDesc,
  outputTarget,
  handleInput,
  handleBlur,
  handleKeyPress,
  handleSend,
  handleOpenTemplate,
  handleEditCommand,
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
  const openTemplateButtonRef = useRef<HTMLButtonElement>(null);
  const editCommandButtonRef = useRef<HTMLButtonElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const {
    disabled: disabledClass,
    promptSend: sendButtonClass,
    promptInput: textareaClass,
    clickableIcon: clickableIconClass,
    saveConversation: saveConversationId,
    newConversation: newConversationId,
    promptFooter,
  } = ELEM_CLASSES_IDS;

  let targetName = "";
  if (outputTarget)
    targetName = outputTarget === "view" ? "Conversation" : "Note";

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
    // Open Command Template Button
    if (openTemplateButtonRef.current) {
      setIcon(openTemplateButtonRef.current, APP_PROPS.fileIcon);
      setTooltip(openTemplateButtonRef.current, "Open template", {
        placement: "top",
      });
    }
    // Open Edit Command Button
    if (editCommandButtonRef.current) {
      setIcon(editCommandButtonRef.current, APP_PROPS.editIcon);
      setTooltip(editCommandButtonRef.current, "Edit command", {
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
        saveConvElem.className = clickableIconClass;
        setIcon(
          saveConvElem,
          isConversationActive
            ? APP_PROPS.saveConversationIcon
            : APP_PROPS.noConvToSaveIcon
        );
        saveConvElem.toggleClass(disabledClass, !isConversationActive);
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
      <div id={promptFooter}>
        {newConversation && (
          <button
            ref={newConversationButtonRef}
            id={newConversationId}
            className={clickableIconClass}
            onClick={newConversation}
          />
        )}
        <span>
          {modelDesc}
          {targetName && ` » ${targetName}`}
        </span>
        {manuallySaveConv && (
          <button
            ref={saveConversationButtonRef}
            id={saveConversationId}
            onClick={isConversationActive ? manuallySaveConv : undefined}
            disabled={!isConversationActive}
          />
        )}
        {handleOpenTemplate && (
          <button
            ref={openTemplateButtonRef}
            className={clickableIconClass}
            onClick={handleOpenTemplate}
          />
        )}
        {handleEditCommand && (
          <button
            ref={editCommandButtonRef}
            className={clickableIconClass}
            onClick={handleEditCommand}
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
