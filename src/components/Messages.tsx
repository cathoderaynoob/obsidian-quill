import { Notice } from "obsidian";
import { useEffect, useRef, useState } from "react";
import { usePluginContext } from "@/components/PluginContext";
import { Role } from "@/interfaces";
import {
  ELEM_CLASSES_IDS,
  ERROR_MESSAGES,
  SCROLL_CHARS_LIMIT,
} from "@/constants";
import { ExecutionOptions } from "@/executeFeature";
import DefaultFolderUtils from "@/DefaultFolderUtils";
import Message, { ConvoMessageType } from "@/components/Message";
import emitter from "@/customEmitter";
import PayloadUtils from "@/PayloadMessages";
import MessagePad from "@/components/MessagePad";

interface MessagesProps {
  executeFeature: (options: ExecutionOptions) => Promise<boolean>;
}

const Messages: React.FC<MessagesProps> = ({ executeFeature }) => {
  const { settings, apiService, pluginServices, vaultUtils, setIsResponding } =
    usePluginContext();
  const [messages, setMessages] = useState<ConvoMessageType[]>([]);
  const [showSaveConvoBtn, setShowSaveConvoBtn] = useState(false);
  const [, setCurrentIndex] = useState(0);
  const latestMessageRef = useRef<ConvoMessageType | null>(null);
  const prevContentLengthRef = useRef<number>(0);
  const prevScrollTop = useRef<number>(0);
  const stopScrolling = useRef<boolean>(false);
  const payloadMessages = PayloadUtils.getViewInstance();
  const clsMessageHighlight = ELEM_CLASSES_IDS.msgHighlight;

  const { getDefaultFolderPath } = DefaultFolderUtils.getInstance(
    pluginServices,
    settings,
    vaultUtils
  );

  const getContainerElem = (): HTMLElement | null => {
    return document.getElementById(ELEM_CLASSES_IDS.messages);
  };

  const getMessageElem = (index: number): HTMLElement | null => {
    return document.querySelector(`[data-msg-idx="${index}"]`);
  };

  const focusPrompt = (): void => {
    const promptInput = document.querySelector(
      `.${ELEM_CLASSES_IDS.promptInput}`
    ) as HTMLElement;
    promptInput.focus();
  };
  const clearMessages = (): void => {
    setMessages([]);
    payloadMessages.clearAll();
    if (latestMessageRef.current) latestMessageRef.current.conversationId = "";
  };

  // Unique ID used for each conversation and message
  const generateUniqueId = () => {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  };

  // NEW CONVERSATION =========================================================
  const newConversation = async (event?: React.MouseEvent<HTMLElement>) => {
    apiService.cancelStream(); // When new convo started during a response
    clearMessages();
    focusPrompt();
  };

  const getConversationId = (): string => {
    const conversationId =
      latestMessageRef.current?.conversationId || vaultUtils.getDateTime();
    return conversationId;
  };

  useEffect(() => {
    setShowSaveConvoBtn(() => {
      if (!settings.autoSaveConvos) {
        return true;
      }
      return false;
    });
  }, [settings.autoSaveConvos, messages.length]);

  const saveConversationManually = async (): Promise<boolean> => {
    // Filename is based on conversation ID
    const convoId = getConversationId();
    const filename = convoId + ".md";
    // Get the conversations folder path
    const folderPath = await getDefaultFolderPath("conversations", true);
    if (folderPath === "") return false;
    // Construct the full file path
    const filePath = `${folderPath}/${filename}`;
    // See if the convo has been saved previously
    const savedFile = vaultUtils.getFileByPath(filePath, true);
    if (savedFile) {
      // If so, clear note of previous messages first
      const success = await vaultUtils.emptyFileContent(savedFile);
      if (!success) {
        new Notice("Unable to clear file content. Please check the console.");
        return false;
      }
    }
    // Now save messages to file
    for (const message of messages) {
      // if return is false, stop saving messages and show error
      if (!(await saveMessageToConversation(message, folderPath))) {
        new Notice(ERROR_MESSAGES.saveError);
        return false;
      }
    }
    new Notice(`${convoId}\n\n  saved to folder\n\n${folderPath}`, 5000);
    return true;
  };
  // Make this available to vaultUtils
  vaultUtils.saveConversationManually = saveConversationManually;

  const saveMessageToConversation = async (
    updatedMessage: ConvoMessageType,
    folderPath: string
  ): Promise<boolean> => {
    if (updatedMessage) {
      // setTimeout prevents Obsidian indexing error
      return new Promise((resolve) => {
        setTimeout(
          async () => {
            const filename = await vaultUtils.appendLatestMessageToConvFile(
              getConversationId(),
              updatedMessage,
              folderPath
            );
            if (!filename) {
              resolve(false);
            } else {
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
  // Adds a new message to the conversation, but
  // Does not include content of message (see `updateResponseMessage`)
  useEffect(() => {
    const containerElem = getContainerElem();
    if (!containerElem) return;

    const handleNewConvoMessage = async (
      role: Role,
      model: string,
      inputText: string,
      selectedText: string,
      commandName?: string
    ): Promise<void> => {
      // If custom command, preface the user message with the command name
      const content = commandName
        ? `*${commandName}*\n\n${inputText || ""}`
        : inputText || "";
      const newMsgIndex = messages.length + 1;
      const newMessage: ConvoMessageType = {
        conversationId: getConversationId(),
        msgIndex: newMsgIndex,
        msgId: generateUniqueId(),
        role: role,
        model: model,
        content: content,
        selectedText: selectedText,
      };
      latestMessageRef.current = newMessage;
      prevContentLengthRef.current = 0;
      stopScrolling.current = false;

      setMessages((prevMessages) => {
        return [...prevMessages, newMessage];
      });
      prevScrollTop.current = containerElem.scrollTop;
      if (role === "assistant") {
        // Immediately scroll to the new message, regardless of the length
        scrollToMessage(newMsgIndex);
        setIsResponding(true);
      }
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
      if (latestMessageRef.current) {
        const latestMsg = latestMessageRef.current;
        latestMsg.content += response;
        setMessages((prevMessages) => {
          const updatedMessages = [...prevMessages];
          updatedMessages[updatedMessages.length - 1] = {
            ...(latestMsg as ConvoMessageType),
          };
          return updatedMessages;
        });

        // Scroll after a sufficient number of chars have been added
        const contentLength = latestMsg.content.length;
        if (
          contentLength >=
          prevContentLengthRef.current + SCROLL_CHARS_LIMIT
        ) {
          await scrollToMessage(latestMsg.msgIndex);
          prevContentLengthRef.current = contentLength;
        }
      }
    };
    emitter.on("updateResponseMessage", handleResponseMessage);
    return () => {
      emitter.off("updateResponseMessage", handleResponseMessage);
    };
  }, [messages]);

  // RESPONSE END ===============================================================
  useEffect(() => {
    const handleResponseEnd = async () => {
      setIsResponding(false);
      clearHighlights(ELEM_CLASSES_IDS.msgStreaming);
      // Scroll to the last message when the stream ends,
      // even if the requisite chars haven't been added
      scrollToMessage(messages.length - 1);
      // Don't save now if saving convos manually
      if (!settings.autoSaveConvos) return;
      // Autosave
      const folderPath = await getDefaultFolderPath("conversations", true);
      if (folderPath !== "") {
        // TODO: Refactor to save only the last message. THIS ISN'T A GOOD APPROACH
        // Get the last two messages (i.e. user and assistant) and save them
        for (const message of messages.slice(-2)) {
          // If return is false, stop saving messages and show error
          if (!(await saveMessageToConversation(message, folderPath))) {
            return;
          }
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
    const containerElem = getContainerElem();
    if (stopScrolling.current || !containerElem) return;

    const handleScroll = () => {
      // Stop scrolling if the user scrolls up
      const isScrollingUp = containerElem.scrollTop < prevScrollTop.current;
      if (isScrollingUp) {
        stopScrolling.current = true;
        return;
      }
      prevScrollTop.current = containerElem.scrollTop;
    };
    containerElem.addEventListener("scroll", handleScroll);

    return () => {
      containerElem.removeEventListener("scroll", handleScroll);
    };
  }, []);

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
      scrollToMessage(newIndex, true);
      clearHighlights(clsMessageHighlight);
      highlightMessage(newIndex);
      return newIndex;
    });
  };

  // Keyboard navigation for messages
  const handleMessagesKeypress = (event: KeyboardEvent) => {
    const promptElem = document.querySelector(
      `.${ELEM_CLASSES_IDS.promptInput}`
    ) as HTMLElement;
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
  }, [apiService, pluginServices, messages.length]);

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
    if (!isMsgNav && stopScrolling.current) return;

    const containerElem = getContainerElem();
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
    const containerElem = getContainerElem();
    containerElem?.scrollTo({
      top: containerElem.scrollHeight,
      behavior: "smooth",
    });
  };

  const handleCollapseSelectedText = (index: number) => {
    const containerElem = getContainerElem();
    const message = getMessageElem(index);
    if (!(message && containerElem)) return;
    if (
      message.offsetHeight > containerElem.offsetHeight ||
      containerElem.scrollTop > message.offsetTop
    ) {
      scrollToMessage(index, true);
    }
  };

  // Utility functions for highlighting messages ==============================
  const highlightMessage = (index: number) => {
    const messageElement = getMessageElem(index);
    messageElement?.classList.add(clsMessageHighlight);
    setTimeout(() => {
      clearHighlights(clsMessageHighlight);
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
  return (
    <>
      <div id={ELEM_CLASSES_IDS.messages} tabIndex={0}>
        {messages.map((message, index) => (
          <Message
            key={message.msgId}
            {...message}
            msgIndex={index}
            handleOnCollapse={handleCollapseSelectedText}
          />
        ))}
      </div>
      <MessagePad
        executeFeature={executeFeature}
        newConversation={newConversation}
        manuallySaveConv={
          showSaveConvoBtn ? saveConversationManually : undefined
        }
        isConversationActive={messages.length > 0}
      />
    </>
  );
};

export default Messages;
