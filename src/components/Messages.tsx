import { Notice, setIcon } from "obsidian";
import { useEffect, useRef, useState } from "react";
import { usePluginContext } from "@/components/PluginContext";
import { Command, Role } from "@/interfaces";
import {
  ELEM_CLASSES_IDS,
  ERROR_MESSAGES,
  SCROLL_CHARS_LIMIT,
} from "@/constants";
import { ExecutionOptions } from "@/executeFeature";
import DefaultFolderUtils from "@/DefaultFolderUtils";
import MessageUtils from "@/MessageUtils";
import Message, { ConvoMessageType } from "@/components/Message";
import emitter from "@/customEmitter";
import PayloadUtils from "@/PayloadMessages";
import MessagePad from "@/components/MessagePad";

export interface MessagesApi {
  startNewConvo: () => Promise<void>;
}

interface MessagesProps {
  executeFeature: (options: ExecutionOptions) => Promise<boolean>;
  messagesApi?: (api: MessagesApi) => void;
}

const Messages: React.FC<MessagesProps> = ({ executeFeature, messagesApi }) => {
  const {
    settings,
    apiService,
    pluginServices,
    vaultUtils,
    setIsResponding,
    isResponding,
  } = usePluginContext();
  const [messages, setMessages] = useState<ConvoMessageType[]>([]);
  const [showSaveConvoBtn, setShowSaveConvoBtn] = useState(false);
  const [, setCurrentIndex] = useState(0);
  const [isConvoSaved, setIsConvoSaved] = useState<boolean>(false);
  const containerElemRef = useRef<HTMLDivElement | null>(null);
  const latestMessageRef = useRef<ConvoMessageType | null>(null);
  const prevContentLengthRef = useRef<number>(0);
  const prevScrollTop = useRef<number>(0);
  const [stopScrolling, setStopScrolling] = useState(false);
  const payloadMessages = PayloadUtils.getViewInstance();
  const {
    iconEl: iconElClass,
    message: messageElemId,
    messages: messagesElemId,
    msgContent,
    msgLoader,
    msgHighlight,
    msgStreaming,
    promptInput,
    textEl: textElClass,
  } = ELEM_CLASSES_IDS;
  const { getDefaultFolderPath } = DefaultFolderUtils.getInstance(
    pluginServices,
    settings
  );
  const { appendLatestMessageToConvFile } = MessageUtils.getInstance(
    pluginServices,
    settings,
    vaultUtils
  );
  // Expose to other classes and components
  useEffect(() => {
    if (messagesApi) {
      messagesApi({
        startNewConvo,
      });
    }
  }, [messagesApi]);
  const getLoaderElem = (): HTMLElement | null => {
    return document.querySelector(`.${msgLoader}`) as HTMLElement;
  };
  const getMessageElem = (index: number): HTMLElement | null => {
    return document.querySelector(`[data-msg-idx="${index}"]`);
  };
  const focusPrompt = (): void => {
    const promptElem = document.querySelector(`.${promptInput}`) as HTMLElement;
    promptElem.focus();
  };
  const clearMessages = (): void => {
    setMessages([]);
    payloadMessages.clearAll();
    if (latestMessageRef.current) latestMessageRef.current.convoId = "";
  };

  // Unique ID used for each conversation and message
  const generateUniqueId = () => {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  };

  // NEW CONVERSATION =========================================================
  const startNewConvo = async (event?: React.MouseEvent<HTMLElement>) => {
    apiService.cancelStream(); // When new convo started during a response
    clearMessages();
    setIsConvoSaved(false);
    focusPrompt();
  };

  const getConvoId = (): string => {
    const convoId =
      latestMessageRef.current?.convoId || vaultUtils.getDateTime();
    return convoId;
  };

  const handleOpenConvoNote = async () => {
    try {
      const filename = getConvoId() + ".md";
      const folderPath = await getDefaultFolderPath("conversations");
      const filePath = vaultUtils.getNormalizedFilepath(folderPath, filename);
      vaultUtils.openFile(filePath, true);
    } catch (e) {
      new Notice("Unable to open conversation file.");
      console.log(e);
    }
  };

  const removeLastMessage = async (): Promise<void> => {
    if (messages.length > 0)
      setMessages((prevMessages) => {
        const updatedMessages = [...prevMessages];
        updatedMessages.pop();
        return updatedMessages;
      });
  };

  useEffect(() => {
    setShowSaveConvoBtn(() => {
      if (!settings.autoSaveConvos) {
        return true;
      }
      return false;
    });
  }, [settings.autoSaveConvos, messages.length]);

  const saveConvoManually = async (): Promise<boolean> => {
    // Filename is based on conversation ID
    const convoId = getConvoId();
    const filename = vaultUtils.getValidFilename(convoId);
    // Get the conversations folder path
    const folderPath = await getDefaultFolderPath("conversations", true);
    if (folderPath === "") return false;
    // Construct the full file path
    const filePath = vaultUtils.getNormalizedFilepath(folderPath, filename);
    // See if the convo has been saved previously
    const savedFile = vaultUtils.getFileByPath(filePath, true);
    if (savedFile) {
      // If so, clear note of previous messages first
      const success = await vaultUtils.emptyFileContent(savedFile);
      if (!success) {
        new Notice("Unable to clear note content. Please check the console.");
        return false;
      }
    }
    // Now save messages to file
    for (const message of messages) {
      // if return is false, stop saving messages and show error
      const saved = await saveMessageToConvo(message, folderPath);
      if (!saved) {
        new Notice(ERROR_MESSAGES.saveError);
        return false;
      }
    }
    new Notice(`"${convoId}"\n  saved to folder\n"${folderPath}"`, 5000);
    return true;
  };

  const saveMessageToConvo = async (
    updatedMessage: ConvoMessageType,
    folderPath: string
  ): Promise<boolean> => {
    if (updatedMessage) {
      return new Promise((resolve) => {
        // setTimeout prevents Obsidian indexing error
        setTimeout(
          async () => {
            const filename = await appendLatestMessageToConvFile(
              getConvoId(),
              updatedMessage,
              folderPath
            );
            if (!filename) {
              setIsConvoSaved(false);
              resolve(false);
            } else {
              setIsConvoSaved(true);
              resolve(true);
            }
          },
          // When auto-saving, the save can disrupt scrolling of messages, so
          // delay to make time for it to complete
          settings.autoSaveConvos ? 1500 : 0
        );
      });
    } else {
      return false;
    }
  };

  // NEW MESSAGE ==============================================================
  // Adds a new message container to the conversation.
  // Content added in `updateResponseMessage`.
  useEffect(() => {
    const containerElem = containerElemRef.current;
    if (!containerElem) return;

    const handleNewConvoMessage = async (
      role: Role,
      modelId: string,
      inputText: string,
      selectedText: string,
      command?: Command
    ): Promise<void> => {
      // Clear any previous loader error messages
      const loader = getLoaderElem();
      if (loader) loader.removeClass("error");

      // If custom command, preface the user message with the command name
      const content =
        command && role === "user"
          ? `*${command.name}*\n\n${inputText || ""}`
          : inputText || "";
      const newMsgIndex = messages.length + 1;
      const newMessage: ConvoMessageType = {
        convoId: getConvoId(),
        msgIndex: newMsgIndex,
        msgId: generateUniqueId(),
        role,
        content,
        modelId,
        command,
        selectedText,
      };
      latestMessageRef.current = newMessage;
      prevContentLengthRef.current = 0;
      setStopScrolling(false);
      if (role === "assistant") setIsResponding(true);
      setMessages((prevMessages) => {
        return [...prevMessages, newMessage];
      });
      prevScrollTop.current = containerElem.scrollTop;
      scrollToBottom();
    };

    emitter.on("newConvoMessage", handleNewConvoMessage);
    return () => {
      emitter.off("newConvoMessage", handleNewConvoMessage);
    };
  }, [messages]);

  // UPDATE MESSAGE ===========================================================
  // Update the most recent message with streaming content from the API.
  useEffect(() => {
    const handleResponseMessage = async (response: string) => {
      if (!latestMessageRef.current) return;

      const latestMsg = latestMessageRef.current;
      latestMsg.content += response;
      setMessages((prevMessages) => {
        const updatedMessages = [...prevMessages];
        updatedMessages[updatedMessages.length - 1] = {
          ...(latestMsg as ConvoMessageType),
          isStreaming: true,
        };
        return updatedMessages;
      });

      // Scroll after a sufficient number of chars have been added
      const contentLength = latestMsg.content.length;
      if (contentLength >= prevContentLengthRef.current + SCROLL_CHARS_LIMIT) {
        await scrollToMessage(latestMsg.msgIndex - 1);
        prevContentLengthRef.current = contentLength;
      }
    };

    emitter.on("updateResponseMessage", handleResponseMessage);
    return () => {
      emitter.off("updateResponseMessage", handleResponseMessage);
    };
  }, [messages]);

  // RESPONSE END =============================================================
  useEffect(() => {
    const handleResponseEnd = async (errorMsg?: string) => {
      // Error handling
      if (errorMsg) {
        const loader = getLoaderElem();
        if (loader) {
          loader.addClass("error");
          const iconEl = loader.querySelector(`.${iconElClass}`) as HTMLElement;
          if (iconEl) setIcon(iconEl, "circle-alert");
          const textEl = loader.querySelector(`.${textElClass}`) as HTMLElement;
          if (textEl) textEl.textContent = errorMsg;
        }
        // Remove the failed message
        removeLastMessage();
      }
      setIsResponding(false);
      clearHighlights(msgStreaming);
      await scrollToMessage(messages.length - 1);
      // Don't save now if saving convos manually
      if (!settings.autoSaveConvos) return;
      // Autosave
      const folderPath = await getDefaultFolderPath("conversations", true);
      if (folderPath === "") return;
      // Get the last two messages (i.e. user and assistant) and save them
      for (const message of messages.slice(-2)) {
        const saved = await saveMessageToConvo(message, folderPath);
        if (!saved) {
          new Notice(ERROR_MESSAGES.saveError);
          return;
        }
      }
    };
    emitter.on("responseEnd", handleResponseEnd);
    return () => {
      emitter.off("responseEnd", handleResponseEnd);
    };
  }, [messages]);

  // SCROLL HANDLING ==========================================================
  useEffect(() => {
    const containerElem = containerElemRef.current;
    if (!containerElem) return;

    const handleScroll = () => {
      // Disable auto-scrolling if the user scrolls up during the response
      const isScrollingUp = containerElem.scrollTop < prevScrollTop.current;
      if (isScrollingUp) {
        setStopScrolling(true);
        return;
      }
      prevScrollTop.current = containerElem.scrollTop;
    };
    containerElem.addEventListener("scroll", handleScroll);

    return () => {
      containerElem.removeEventListener("scroll", handleScroll);
    };
  }, [stopScrolling]);

  // Control the message navigation
  const goToMessage = (nav: "next" | "prev" | "first" | "last") => {
    setCurrentIndex((prevIndex) => {
      let newIndex = prevIndex;
      switch (nav) {
        case "next":
          newIndex = Math.min(messages.length - 1, prevIndex + 1);
          break;
        case "prev":
          newIndex = Math.max(0, prevIndex - 1);
          break;
        case "first":
          newIndex = 0;
          break;
        case "last":
          newIndex = messages.length - 1;
          break;
      }
      (async () => await scrollToMessage(newIndex, true))();
      clearHighlights(msgHighlight);
      highlightMessage(newIndex);
      return newIndex;
    });
  };

  // Keyboard navigation for messages
  const handleMessagesKeypress = (event: KeyboardEvent) => {
    const promptElem = document.querySelector(`.${promptInput}`) as HTMLElement;
    if (document.activeElement !== promptElem) {
      switch (event.key) {
        case "j":
          event.preventDefault();
          goToMessage("next");
          break;
        case "k":
          event.preventDefault();
          goToMessage("prev");
          break;
        case "f":
          event.preventDefault();
          goToMessage("first");
          break;
        case "l":
          event.preventDefault();
          goToMessage("last");
          break;
        case "b":
          event.preventDefault();
          scrollToBottom();
      }
    }
    // Cancel the stream if the user presses the "Escape" key
    if (event.key === "Escape") {
      event.preventDefault();
      apiService.cancelStream();
      focusPrompt();
    }
  };

  // Add event listener for keyboard navigation
  useEffect(() => {
    const activeViewElem = pluginServices.getViewElem();
    activeViewElem?.addEventListener("keydown", handleMessagesKeypress);
    return () => {
      activeViewElem?.removeEventListener("keydown", handleMessagesKeypress);
    };
  }, [messages.length]);

  const getMessagePos = (
    containerElem: HTMLElement,
    message: HTMLElement
  ): number => {
    let messagePos = 0;
    if (!containerElem) return messagePos;
    const containerRect = containerElem.getBoundingClientRect();
    const messageRect = message.getBoundingClientRect();

    messagePos = messageRect.top - containerRect.top + containerElem.scrollTop;
    return messagePos;
  };

  // Scroll to a specific message
  const scrollToMessage = async (
    index: number,
    isMsgNav?: boolean
  ): Promise<void> => {
    if (!isMsgNav && stopScrolling) return;

    const containerElem = containerElemRef.current;
    const message = getMessageElem(index);
    if (!containerElem || !message) return;

    // If the response is taller than the viewable area,
    // scroll the message to the top of the view port
    if (message.offsetHeight >= containerElem.offsetHeight) {
      const messagePos = getMessagePos(containerElem, message);
      const scrollToPosition = messagePos - 16;
      containerElem.scrollTo({
        top: scrollToPosition,
        behavior: "smooth",
      });
      setStopScrolling(true);
    }
    // Otherwise, scroll the message into view, centered
    else {
      message.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }
  };

  const scrollToBottom = () => {
    const containerElem = containerElemRef.current;
    containerElem?.scrollTo({
      top: containerElem.scrollHeight,
      behavior: "smooth",
    });
  };

  const handleCollapseSelectedText = async (index: number) => {
    const containerElem = containerElemRef.current;
    const message = getMessageElem(index);
    if (!(message && containerElem)) return;
    if (
      message.offsetHeight > containerElem.offsetHeight ||
      containerElem.scrollTop > message.offsetTop
    ) {
      await scrollToMessage(index, true);
    }
  };

  // Utility functions for highlighting messages ==============================
  const highlightMessage = (index: number) => {
    const messageElement = getMessageElem(index);
    messageElement?.classList.add(msgHighlight);
    setTimeout(() => {
      clearHighlights(msgHighlight);
    }, 100);
  };

  const clearHighlights = (msgClassName: string) => {
    const classSelector = `.${msgClassName}`;
    const highlightedMessages = document.querySelectorAll(classSelector);
    highlightedMessages.forEach((message) => {
      message.classList.remove(msgClassName);
    });
  };

  // Render the messages
  const msgLoaderJsx = (
    <div className={`${messageElemId} ${msgLoader}`}>
      <div className={msgContent}>
        <div className="oq-loader-error">
          <div className={iconElClass}></div>
          <div className={textElClass}></div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div id={messagesElemId} tabIndex={0} ref={containerElemRef}>
        {messages.map((message, index) => (
          <Message
            key={message.msgId}
            {...message}
            msgIndex={index}
            handleOnCollapse={handleCollapseSelectedText}
            isStreaming={isResponding}
          />
        ))}
        {msgLoaderJsx}
      </div>
      <MessagePad
        executeFeature={executeFeature}
        startNewConvo={startNewConvo}
        manuallySaveConvo={showSaveConvoBtn ? saveConvoManually : undefined}
        handleOpenConvoNote={handleOpenConvoNote}
        isConvoActive={messages.length > 0}
        isConvoSaved={isConvoSaved}
      />
    </>
  );
};

export default Messages;
