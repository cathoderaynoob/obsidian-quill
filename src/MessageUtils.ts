import { Notice, TFile } from "obsidian";
import { IPluginServices } from "@/interfaces";
import { QuillPluginSettings } from "@/settings";
import { ConvoMessageType } from "@/components/Message";
import ModalSaveMessageAs from "@/components/ModalSaveMessageAs";
import VaultUtils from "@/VaultUtils";

class MessageUtils {
  private static instance: MessageUtils;
  private pluginServices: IPluginServices;
  private settings: QuillPluginSettings;
  private vaultUtils: VaultUtils;

  constructor(
    pluginServices: IPluginServices,
    settings: QuillPluginSettings,
    vaultUtils: VaultUtils
  ) {
    this.pluginServices = pluginServices;
    this.settings = settings;
    this.vaultUtils = VaultUtils.getInstance(pluginServices, settings);
  }

  public static getInstance(
    pluginServices: IPluginServices,
    settings: QuillPluginSettings,
    vaultUtils: VaultUtils
  ): MessageUtils {
    if (!MessageUtils.instance) {
      MessageUtils.instance = new MessageUtils(
        pluginServices,
        settings,
        vaultUtils
      );
    }
    return MessageUtils.instance;
  }

  private formatLatestMessageForFile = async (
    msg: ConvoMessageType,
    file: TFile
  ): Promise<string> => {
    const fileContent = await this.vaultUtils.getFileContent(file);
    const messageCount = fileContent.match(/\[Message \d+\]/g)?.length || 0;
    const messageNum = messageCount + 1;
    let header = msg.role === "user" ? `# [Message ${messageNum}]\n` : "";
    const separator = `\n___\n`;
    const modelDisplay =
      this.pluginServices.getModelById(msg.modelId)?.name || msg.modelId;
    switch (msg.role) {
      case "user":
        header += `#### [» Prompt]`;
        break;
      case "assistant":
        header += `#### [« Response]\n\`${modelDisplay}\``;
        break;
    }
    let fileText = `${header}\n\n${msg.content}\n`;
    if (msg.selectedText) {
      fileText += "\n```\n" + msg.selectedText + "\n```\n";
    }
    fileText += separator;

    return fileText;
  };

  appendLatestMessageToConvFile = async (
    convoId: string,
    latestMessage: ConvoMessageType,
    folderPath: string
  ): Promise<string | null> => {
    const {
      getNormalizedFilepath,
      getFileByPath,
      createFile,
      appendToFile,
      validateFilename,
    } = this.vaultUtils;
    try {
      // Find the conversation file, or create it
      const filename = validateFilename(convoId);
      const filePath = getNormalizedFilepath(folderPath, filename);
      let file = getFileByPath(filePath, true);
      if (!file) file = await createFile(filePath, "");
      if (latestMessage.content.length) {
        const messageText = await this.formatLatestMessageForFile(
          latestMessage,
          file
        );
        // Append the latest message
        await appendToFile(file, messageText);
      }
      return filename;
    } catch (e) {
      console.log(e);
      return null;
    }
  };

  // SAVE A MESSAGE TO A FILE AS...
  promptSaveMessageAs = async (
    content: string,
    commandFolderPath?: string
  ): Promise<{ filename: string; path: string } | null> => {
    const { getNormalizedFilepath, createFile, openFile } = this.vaultUtils;
    const fileText = content;

    return new Promise((resolve) => {
      const modal = new ModalSaveMessageAs(
        this.pluginServices.app,
        this.settings,
        content,
        async (filename, folderPath, openFileAfterSave, saveAsNewDefault) => {
          filename = this.vaultUtils.validateFilename(filename);
          const filePath = getNormalizedFilepath(folderPath, filename);
          try {
            await createFile(filePath, fileText);
            new Notice(`${filename}\n\n  saved to\n\n${folderPath}`);
            modal.close();
            this.settings.openAfterSave = openFileAfterSave;
            if (openFileAfterSave) await openFile(filePath, true);
            // If default was missing, user wants to set a new one
            if (saveAsNewDefault) {
              this.settings.pathMessages = folderPath;
              await this.pluginServices.saveSettings();
            }
            resolve({ filename, path: folderPath });
          } catch (e) {
            new Notice(e);
            console.log(e);
          }
        },
        commandFolderPath
      );
      modal.open();
    });
  };
}
export default MessageUtils;
