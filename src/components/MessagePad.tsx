import { useState } from "react";
import { ELEM_CLASSES_IDS } from "@/constants";
import { ExecutionOptions } from "@/executeFeature";
import { usePluginContext } from "@/components/PluginContext";
import PromptContent from "@/components/PromptContent";

interface MessagePadProps {
  executeFeature: (options: ExecutionOptions) => Promise<boolean>;
  startNewConvo: (event: React.MouseEvent<HTMLElement>) => void;
  manuallySaveConvo?: (event: React.MouseEvent<HTMLElement>) => void;
  handleOpenConvoNote?: () => void;
  isConvoActive: boolean;
  isConvoSaved: boolean;
}

const MessagePad: React.FC<MessagePadProps> = ({
  executeFeature,
  startNewConvo,
  manuallySaveConvo,
  handleOpenConvoNote,
  isConvoActive,
  isConvoSaved,
}) => {
  const { isResponding, pluginServices, settings } = usePluginContext();
  const [promptValue, setPromptValue] = useState<string>("");
  const [rows] = useState<number>(1);

  const modelDesc =
    pluginServices.getModelById(settings.openaiModelId)?.name ||
    settings.openaiModelId;

  // Setting dynamic height for textarea as number of rows change
  const setTextareaSize = () => {
    setTimeout(() => {
      const textarea = document.querySelector(
        `.${ELEM_CLASSES_IDS.promptInput}`
      ) as HTMLElement;
      textarea.style.height = "auto";
      if (textarea.textContent) {
        const { borderTopWidth, borderBottomWidth, lineHeight } =
          window.getComputedStyle(textarea);
        const borderWidth =
          parseFloat(borderTopWidth) + parseFloat(borderBottomWidth);
        const rowHeight = parseInt(lineHeight) + borderWidth;
        const maxHeight = rowHeight * 6;
        const newHeight = Math.min(
          textarea.scrollHeight + borderWidth,
          maxHeight
        );
        textarea.style.height = `${newHeight}px`;
      }
    }, 0);
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPromptValue(e.target.value);
    setTextareaSize();
  };

  const handleBlur = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (/^\s*$/.test(promptValue)) {
      const trimmedValue = promptValue.trim();
      setPromptValue(trimmedValue);
    }
    setTextareaSize();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.shiftKey) {
      return;
    } else if (e.key === "Enter") {
      e.stopPropagation();
      e.preventDefault();
      if (!isResponding) handleSend();
    }
  };

  const handleSend = async () => {
    const trimmedValue = promptValue.trim();
    // Clear the prompt field...
    setPromptValue("");
    setTextareaSize();
    const success = await executeFeature({
      featureId: "openPrompt",
      inputText: trimmedValue,
    });
    if (!success) {
      // ...but restore it if the response fails
      setPromptValue(trimmedValue);
      setTextareaSize();
    }
  };

  const handleOpenSettings = () => {
    pluginServices.openPluginSettings();
  };

  return (
    <div id={ELEM_CLASSES_IDS.messagePad}>
      <PromptContent
        value={promptValue}
        rows={rows}
        modelDesc={modelDesc}
        handleBlur={handleBlur}
        handleInput={handleInput}
        handleKeyPress={handleKeyPress}
        handleSend={handleSend}
        handleOpenSettings={handleOpenSettings}
        handleOpenConvoNote={handleOpenConvoNote}
        startNewConvo={startNewConvo}
        manuallySaveConvo={manuallySaveConvo}
        isConvoActive={isConvoActive}
        isConvoSaved={isConvoSaved}
        disabled={isResponding}
      />
    </div>
  );
};

export default MessagePad;
