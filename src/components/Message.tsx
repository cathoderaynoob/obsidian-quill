import { Notice, setIcon, setTooltip } from "obsidian";
import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { APP_PROPS, ELEM_CLASSES_IDS } from "@/constants";
import { Command, Role } from "@/interfaces";
import { usePluginContext } from "@/components/PluginContext";
import MessageUtils from "@/MessageUtils";

export interface ConvoMessageType {
  conversationId: string;
  msgIndex: number;
  msgId: string;
  role: Role;
  content: string;
  modelId: string;
  command?: Command;
  selectedText?: string;
  error?: string;
}

interface ConvoMessageProps extends ConvoMessageType {
  handleOnCollapse: (index: number) => void;
}

const Message: React.FC<ConvoMessageProps> = ({
  msgIndex,
  msgId,
  role,
  content,
  modelId,
  command,
  selectedText,
  error,
  handleOnCollapse,
}) => {
  const { pluginServices, settings, vaultUtils } = usePluginContext();
  const messageUtils = MessageUtils.getInstance(
    pluginServices,
    settings,
    vaultUtils
  );
  const copyMessageButtonRef = useRef<HTMLButtonElement>(null);
  const saveMessageButtonRef = useRef<HTMLButtonElement>(null);
  const clickableIconClass = ELEM_CLASSES_IDS.clickableIcon;

  const saveMessageAs = async () => {
    messageUtils.promptSaveMessageAs(content, command?.saveMsgFolder);
  };

  const copyMessageToClipboard = () => {
    try {
      navigator.clipboard.writeText(content);
      new Notice("Message copied to clipboard");
    } catch (e) {
      console.log(e);
      new Notice("Failed to copy message to clipboard");
    }
  };

  const handleCollapseSelectedText = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!event.target.checked) handleOnCollapse(msgIndex);
  };

  useEffect(() => {
    // Copy Message Button
    const copyButton = copyMessageButtonRef.current;
    if (copyButton) {
      setIcon(copyButton, APP_PROPS.copyIcon);
      setTooltip(copyButton, "Copy message to clipboard", {
        placement: "top",
      });
    }
    // Save Message Button
    const saveButton = saveMessageButtonRef.current;
    if (saveButton) {
      setIcon(saveButton, APP_PROPS.newFileIcon);
      setTooltip(saveButton, "Save message to new note", {
        placement: "top",
      });
    }
  }, [content]);

  const modelDisplay = pluginServices.getModelById(modelId)?.name || modelId;

  return (
    <>
      {content ? (
        <div
          className={`${ELEM_CLASSES_IDS.message} oq-message-${role}`}
          data-msg-idx={msgIndex}
        >
          {role === "user" && <p className="oq-message-user-icon"></p>}
          <div
            className={`${ELEM_CLASSES_IDS.msgContent} ${
              role === "assistant" ? ELEM_CLASSES_IDS.msgStreaming : ""
            }`}
          >
            {error ? (
              <div className="oq-loader-error">{error}</div>
            ) : (
              <ReactMarkdown>{content}</ReactMarkdown>
            )}
            {selectedText && (
              <div className="oq-message-selectedtext">
                <label
                  className="oq-message-selectedtext-content"
                  htmlFor={msgId}
                >
                  <ReactMarkdown>{selectedText}</ReactMarkdown>
                </label>
                <input
                  type="checkbox"
                  id={msgId}
                  className="oq-message-selectedtext-checkbox"
                  onChange={handleCollapseSelectedText}
                />
              </div>
            )}
            {role === "assistant" && (
              <div className="oq-message-footer">
                <div className="oq-message-actions">
                  {copyMessageButtonRef && (
                    <button
                      ref={copyMessageButtonRef}
                      onClick={copyMessageToClipboard}
                      className={clickableIconClass}
                    />
                  )}
                  {saveMessageButtonRef && (
                    <button
                      ref={saveMessageButtonRef}
                      onClick={saveMessageAs}
                      className={clickableIconClass}
                    />
                  )}
                </div>
                <div className="oq-message-model">{modelDisplay}</div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
};

export default Message;
