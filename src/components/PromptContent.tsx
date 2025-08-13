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
  handleOpenSettings: () => void;
  handleOpenConvoNote?: () => void;
  handleOpenTemplate?: () => void;
  handleEditCommand?: () => void;
  startNewConvo?: (event: React.MouseEvent<HTMLElement>) => void;
  manuallySaveConvo?: (event: React.MouseEvent<HTMLElement>) => void;
  showConvosFolderBtn: boolean;
  isConvoActive?: boolean;
  isConvoSaved?: boolean;
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
  handleOpenSettings,
  handleOpenConvoNote,
  handleOpenTemplate,
  handleEditCommand,
  startNewConvo,
  manuallySaveConvo,
  showConvosFolderBtn,
  isConvoActive,
  isConvoSaved,
  disabled = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendButtonRef = useRef<HTMLButtonElement>(null);
  const startNewConvoButtonRef = useRef<HTMLButtonElement>(null);
  const openConvoFolderButtonRef = useRef<HTMLButtonElement>(null);
  const saveConvoButtonRef = useRef<HTMLButtonElement>(null);
  const openTemplateButtonRef = useRef<HTMLButtonElement>(null);
  const editCommandButtonRef = useRef<HTMLButtonElement>(null);
  const openConvoButtonRef = useRef<HTMLButtonElement>(null);
  const openSettingsButtonRef = useRef<HTMLButtonElement>(null);
  const {
    disabled: disabledClass,
    promptSend: sendButtonClass,
    promptInput: textareaClass,
    clickableIcon: clickableIconClass,
    saveConvo: saveConvoId,
    startNewConvo: startNewConvoId,
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
    if (startNewConvoButtonRef.current) {
      setIcon(startNewConvoButtonRef.current, APP_PROPS.appIcon);
      setTooltip(startNewConvoButtonRef.current, "New conversation", {
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
    if (openSettingsButtonRef.current) {
      setIcon(openSettingsButtonRef.current, APP_PROPS.openSettingsIcon);
      setTooltip(openSettingsButtonRef.current, "Open Quill Settings", {
        placement: "top",
      });
    }
  }, []);

  // In PromptContent
  useEffect(() => {
    if (showConvosFolderBtn && openConvoFolderButtonRef.current) {
      setIcon(openConvoFolderButtonRef.current, APP_PROPS.folderOpenIcon);
      setTooltip(
        openConvoFolderButtonRef.current,
        "Open my conversations folder",
        { placement: "top" }
      );
    }
  }, [showConvosFolderBtn]); // ✅ add dependency so it runs when the boolean changes

  useEffect(() => {
    // Save Conversation Manually Button
    if (manuallySaveConvo) {
      const saveConvoElem = saveConvoButtonRef.current;
      if (saveConvoElem) {
        saveConvoElem.className = clickableIconClass;
        setIcon(
          saveConvoElem,
          isConvoActive
            ? APP_PROPS.saveConvoIcon
            : APP_PROPS.saveConvoDisabledIcon
        );
        const tooltipText = isConvoActive
          ? "Save conversation"
          : "Save conversation\n(no active conversation to save)";
        setTooltip(saveConvoElem, tooltipText, {
          placement: "top",
        });
        saveConvoElem.toggleClass(disabledClass, !isConvoActive);
      }
    }
  }, [manuallySaveConvo]);

  useEffect(() => {
    // Open Saved Conversation Button
    const openConvoElem = openConvoButtonRef.current;
    if (openConvoElem) {
      setIcon(
        openConvoElem,
        isConvoSaved ? APP_PROPS.openConvoIcon : APP_PROPS.openConvoDisabledIcon
      );
      const tooltipText = isConvoSaved
        ? "Open saved conversation"
        : "Open saved conversation\n(not yet saved)";
      setTooltip(openConvoElem, tooltipText, {
        placement: "top",
      });
      openConvoElem.toggleClass(disabledClass, !isConvoActive);
    }
  }, [isConvoSaved]);

  return (
    <div id="oq-prompt-container">
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
        {startNewConvo && (
          <button
            ref={startNewConvoButtonRef}
            id={startNewConvoId}
            className={clickableIconClass}
            onClick={startNewConvo}
          />
        )}
        <span>
          {modelDesc}
          {targetName && ` » ${targetName}`}
        </span>
        {showConvosFolderBtn && (
          <button
            ref={openConvoFolderButtonRef}
            className={clickableIconClass}
            onClick={isConvoActive ? manuallySaveConvo : undefined}
          />
        )}
        {manuallySaveConvo && (
          <button
            ref={saveConvoButtonRef}
            id={saveConvoId}
            onClick={isConvoActive ? manuallySaveConvo : undefined}
            disabled={!isConvoActive}
          />
        )}
        {handleOpenConvoNote && (
          <button
            ref={openConvoButtonRef}
            className={clickableIconClass}
            onClick={handleOpenConvoNote}
            disabled={!isConvoSaved}
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
          ref={openSettingsButtonRef}
          className={clickableIconClass}
          onClick={handleOpenSettings}
        />
      </div>
    </div>
  );
};

export default PromptContent;
