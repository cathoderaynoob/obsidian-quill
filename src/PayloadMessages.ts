import { PayloadMessagesType } from "@/interfaces";
import { IPluginServices } from "@/interfaces";
import { QuillPluginSettings } from "@/settings";

class PayloadUtils {
  public static instance: PayloadUtils;
  payloadMessages: PayloadMessagesType[];
  pluginServices: IPluginServices;
  settings: QuillPluginSettings;

  constructor() {
    this.payloadMessages = [];
  }

  private static viewInstance: PayloadUtils;
  static getViewInstance(): PayloadUtils {
    if (!PayloadUtils.viewInstance) {
      PayloadUtils.viewInstance = new PayloadUtils();
    }
    return PayloadUtils.viewInstance;
  }

  static getEditorInstance(): PayloadUtils {
    return new PayloadUtils();
  }

  getAll(includeSys?: boolean): PayloadMessagesType[] {
    if (includeSys) {
      return [...this.payloadMessages];
    } else {
      return this.payloadMessages.filter(
        (message) => message.role !== "system"
      );
    }
  }

  get(): PayloadMessagesType[] {
    return [...this.payloadMessages];
  }

  getLatestMessage(): PayloadMessagesType | null {
    if (this.payloadMessages.length === 0) return null;
    return { ...this.payloadMessages[this.payloadMessages.length - 1] };
  }

  addMessage(message: PayloadMessagesType): PayloadMessagesType[] {
    this.payloadMessages.push(message);
    return this.payloadMessages;
  }

  clearAll(): void {
    this.payloadMessages = [];
  }
}

export default PayloadUtils;
