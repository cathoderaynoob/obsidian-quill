import { Notice, setIcon, setTooltip } from "obsidian";
import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { APP_PROPS, ELEM_CLASSES_IDS } from "@/constants";
import { Role } from "@/interfaces";
import { usePluginContext } from "@/components/PluginContext";

export interface ConvoMessageType {
  conversationId: string;
  msgIndex: number;
  msgId: string;
  role: Role;
  content: string;
  model: string;
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
  content: message,
  model,
  selectedText,
  error,
  handleOnCollapse,
}) => {
  const { vaultUtils } = usePluginContext();
  const copyMessageButtonRef = useRef<HTMLButtonElement>(null);
  const saveMessageButtonRef = useRef<HTMLButtonElement>(null);
  const clickableIconClass = ELEM_CLASSES_IDS.clickableIcon;

  const saveMessageAs = async () => {
    vaultUtils.saveMessageAs(message);
  };

  const copyMessageToClipboard = () => {
    try {
      navigator.clipboard.writeText(message);
      new Notice("Message copied to clipboard");
    } catch (e) {
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
  }, [message]);

  return (
    <>
      {message ? (
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
              <ReactMarkdown>{message}</ReactMarkdown>
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
                <div className="oq-message-model">{model}</div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
};

export default Message;
