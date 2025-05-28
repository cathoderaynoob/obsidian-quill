import { Notice, setIcon, setTooltip } from "obsidian";
import React, { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import * as os from "os";
import MessageUtils from "@/MessageUtils";
import { APP_PROPS, ELEM_CLASSES_IDS } from "@/constants";
import { Command, Role } from "@/interfaces";
import { usePluginContext } from "@/components/PluginContext";

export interface ConvoMessageType {
  convoId: string;
  msgIndex: number;
  msgId: string;
  role: Role;
  content: string;
  modelId: string;
  command?: Command;
  selectedText?: string;
  error?: string;
  isStreaming?: boolean;
}

interface ConvoMessageProps extends ConvoMessageType {
  handleOnCollapse: (index: number) => void;
}

interface CodeBlockProps {
  className?: string;
  children: React.ReactNode;
  copyBlockToClipboard: (code: string) => void;
  isStreaming: boolean;
  command?: Command;
}

const CodeBlock: React.FC<CodeBlockProps> = ({
  className = "",
  children,
  copyBlockToClipboard,
  isStreaming,
  command,
}) => {
  const { pluginServices, settings, vaultUtils } = usePluginContext();
  const messageUtils = MessageUtils.getInstance(
    pluginServices,
    settings,
    vaultUtils
  );

  const copyBlockButtonRef = useRef<HTMLButtonElement>(null);
  const saveBlockAsButtonRef = useRef<HTMLButtonElement>(null);

  const saveBlockAs = async (blockString: string): Promise<void> => {
    messageUtils.promptSaveMessageAs(blockString, command?.saveMsgFolder);
  };

  // Extract language from className, e.g., "language-js"
  // If markdown or plaintext is specified, strip
  const language = (() => {
    const lang = className.match(/language-(\w+)/)?.[1] ?? "";
    return lang === "markdown" || lang === "plaintext" ? "" : lang;
  })();

  // Normalize children to a string
  let blockString = "";
  if (Array.isArray(children)) {
    blockString = children.join("");
  } else if (typeof children === "string") {
    blockString = children;
  } else if (children) {
    blockString = String(children);
  }

  // Usability convenience for code vs markdown/text
  // If a language is specified, copy the entire code block
  // If no language, copy just the content
  const wrappedBlock = language.length
    ? `\`\`\`${language}\n${blockString}\`\`\`\n`
    : `${blockString}\n`;
  const isMac = os.platform() === "darwin";
  const modifierKey = isMac ? "option" : "alt";
  const hasLanguage = language.length > 0;
  const copyTooltip = hasLanguage
    ? `Copy block to clipboard\n(${modifierKey}-click for content only)`
    : "Copy content to clipboard";

  useEffect(() => {
    const copyBlockButton = copyBlockButtonRef.current;
    if (copyBlockButton) {
      setIcon(copyBlockButton, APP_PROPS.copyIcon);
      setTooltip(copyBlockButton, copyTooltip, { placement: "top" });
    }
    const saveBlockAsButton = saveBlockAsButtonRef.current;
    if (saveBlockAsButton) {
      setIcon(saveBlockAsButton, APP_PROPS.newFileIcon);
      setTooltip(saveBlockAsButton, `Save to new note`, {
        placement: "top",
      });
    }
  }, []);

  return (
    <div className="oq-message-codeblock">
      {!isStreaming && (
        <>
          <button
            ref={copyBlockButtonRef}
            onClick={(e: React.MouseEvent) => {
              copyBlockToClipboard(e.altKey ? blockString : wrappedBlock);
            }}
            className={ELEM_CLASSES_IDS.clickableIcon}
            type="button"
          />
          <button
            ref={saveBlockAsButtonRef}
            onClick={() => saveBlockAs(wrappedBlock)}
            className={ELEM_CLASSES_IDS.clickableIcon}
            type="button"
          />
        </>
      )}
      <pre>
        <code className={className}>{blockString}</code>
      </pre>
    </div>
  );
};

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
  isStreaming,
}) => {
  const { pluginServices, settings, vaultUtils } = usePluginContext();
  const messageUtils = MessageUtils.getInstance(
    pluginServices,
    settings,
    vaultUtils
  );

  const clickableIconClass = ELEM_CLASSES_IDS.clickableIcon;
  const copyMessageButtonRef = useRef<HTMLButtonElement>(null);
  const saveMessageButtonRef = useRef<HTMLButtonElement>(null);

  const saveMessageAs = async (): Promise<void> => {
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

  useEffect(() => {
    // Copy Message Button
    const copyMessageButton = copyMessageButtonRef.current;
    if (copyMessageButton) {
      setIcon(copyMessageButton, APP_PROPS.copyIcon);
      setTooltip(copyMessageButton, "Copy message to clipboard", {
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
  const handleCollapseSelectedText = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!event.target.checked) handleOnCollapse(msgIndex);
  };
  const copyBlockToClipboard = (blockString: string) => {
    try {
      navigator.clipboard.writeText(blockString);
      new Notice("Copied to clipboard");
    } catch (e) {
      console.log(e);
      new Notice("Failed to copy to clipboard");
    }
  };

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
            {!error ? (
              <ReactMarkdown
                components={{
                  code: ({ className, children, ...props }) => (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  ),
                  pre: ({ children, ...props }) => {
                    if (!React.isValidElement(children)) {
                      return <pre {...props}>{children}</pre>;
                    }
                    const codeElem = children as React.ReactElement<{
                      className?: string;
                      children?: React.ReactNode;
                    }>;
                    return (
                      <CodeBlock
                        className={codeElem.props.className}
                        copyBlockToClipboard={copyBlockToClipboard}
                        isStreaming={isStreaming || false}
                        command={command}
                        {...props}
                      >
                        {codeElem.props.children}
                      </CodeBlock>
                    );
                  },
                }}
              >
                {content}
              </ReactMarkdown>
            ) : (
              //  Display error
              <div className="oq-loader-error">{error}</div>
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
                  {saveMessageButtonRef && (
                    <button
                      ref={saveMessageButtonRef}
                      onClick={saveMessageAs}
                      className={clickableIconClass}
                    />
                  )}
                  {copyMessageButtonRef && (
                    <button
                      ref={copyMessageButtonRef}
                      onClick={copyMessageToClipboard}
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
