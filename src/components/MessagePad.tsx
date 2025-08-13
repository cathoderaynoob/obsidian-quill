import { useEffect, useState } from "react";
import { ELEM_CLASSES_IDS } from "@/constants";
import { ExecutionOptions } from "@/executeFeature";
import { usePluginContext } from "@/components/PluginContext";
import DefaultFolderUtils from "@/DefaultFolderUtils";
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
  const [showConvosFolderBtn, setShowConvosFolderBtn] = useState(false);
  const [promptValue, setPromptValue] = useState<string>("");
  const [rows] = useState<number>(1);

  const { hasValidDefaultFolder } = DefaultFolderUtils.getInstance(
    pluginServices,
    settings
  );

  useEffect(() => {
    hasValidDefaultFolder("conversations").then(setShowConvosFolderBtn);
  }, []);

  const modelDesc =
    pluginServices.getModelById(settings.openaiModelId)?.name ||
    settings.openaiModelId;

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPromptValue(e.target.value);
  };

  const handleBlur = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (/^\s*$/.test(promptValue)) {
      const trimmedValue = promptValue.trim();
      setPromptValue(trimmedValue);
    }
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
    const success = await executeFeature({
      featureId: "openPrompt",
      inputText: trimmedValue,
    });
    if (!success) {
      // ...but restore it if the response fails
      setPromptValue(trimmedValue);
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
        showConvosFolderBtn={showConvosFolderBtn}
        isConvoActive={isConvoActive}
        isConvoSaved={isConvoSaved}
        disabled={isResponding}
      />
    </div>
  );
};

export default MessagePad;
