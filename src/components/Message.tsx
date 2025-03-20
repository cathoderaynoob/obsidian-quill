import { Notice, setIcon, setTooltip } from "obsidian";
import ReactMarkdown from "react-markdown";
import { useEffect, useRef } from "react";
import { APP_PROPS } from "@/constants";
import { Role } from "@/interfaces";
import { usePluginContext } from "@/components/PluginContext";
import { ELEM_CLASSES_IDS } from "@/constants";

export interface MessageType {
  conversationId: string | null;
  msgIdx: number;
  id: string;
  role: Role;
  content: string;
  model: string;
  selectedText?: string;
  error?: string;
}

interface MessageProps extends MessageType {
  handleOnCollapse: (index: number) => void;
}

const Message: React.FC<MessageProps> = ({
  msgIdx,
  id,
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
  const clickableIconClass = APP_PROPS.clickableIcon;

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
    if (!event.target.checked) handleOnCollapse(msgIdx);
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
          data-conv-idx={msgIdx}
        >
          {role === "user" && <p className="oq-message-user-icon"></p>}
          <div
            className={`oq-message-content ${
              role === "assistant" ? ELEM_CLASSES_IDS.msgStreaming : ""
            }`}
          >
            {error ? (
              <div className="oq-message-error">{error}</div>
            ) : (
              <ReactMarkdown>{message}</ReactMarkdown>
            )}
            {selectedText && (
              <div className="oq-message-selectedtext">
                <label className="oq-message-selectedtext-content" htmlFor={id}>
                  <ReactMarkdown>{selectedText}</ReactMarkdown>
                </label>
                <input
                  type="checkbox"
                  id={id}
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
