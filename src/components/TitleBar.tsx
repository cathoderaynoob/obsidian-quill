import { setIcon, setTooltip } from "obsidian";
import { useEffect } from "react";
import { APP_PROPS, ELEM_CLASSES_IDS } from "@/constants";

interface TitleBarProps {
  newConversation: (event: React.MouseEvent<HTMLElement>) => void;
  manuallySaveConv?: (event: React.MouseEvent<HTMLElement>) => void;
  isConversationActive: boolean;
}

const TitleBar: React.FC<TitleBarProps> = ({
  newConversation,
  manuallySaveConv: manuallySaveConv,
  isConversationActive: isConversationActive,
}) => {
  useEffect(() => {
    if (manuallySaveConv) {
      const saveConvElem = document.getElementById(
        ELEM_CLASSES_IDS.saveConversation
      );
      if (saveConvElem) {
        setIcon(saveConvElem, APP_PROPS.saveToFileIcon);
        saveConvElem.className = isConversationActive ? "" : "oq-disabled";
        const tooltipText = isConversationActive
          ? "Save conversation to note"
          : "No conversation to save";
        setTooltip(saveConvElem, tooltipText, {
          placement: "left",
        });
      }
    }
  }, [manuallySaveConv]);
  return (
    <div id="oq-view-title">
      <div id={ELEM_CLASSES_IDS.newConversation} onClick={newConversation} />
      {manuallySaveConv && (
        <div
          id={ELEM_CLASSES_IDS.saveConversation}
          onClick={isConversationActive ? manuallySaveConv : undefined}
        />
      )}
    </div>
  );
};

export default TitleBar;
