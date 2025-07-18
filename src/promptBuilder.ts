import { PROMPTS } from "@/constants";
import { PayloadMessagesType } from "@/interfaces";

export interface Prompt {
  inputText?: string;
  templateText?: string;
  selectedText?: string;
  formattingGuidance?: string;
}

export const buildSystemPrompt = (isTargetView: boolean) => {
  // Compose system prompt
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  let systemContent = `Today is ${today}.`;
  if (isTargetView) {
    systemContent += ` ${PROMPTS.systemInitial.content}`;
  }
  const systemMsg: PayloadMessagesType = {
    role: "system",
    content: systemContent,
  };
  return systemMsg;
};

export const buildPromptPayload = ({
  inputText,
  templateText,
  selectedText,
  formattingGuidance,
}: Prompt): string => {
  const payload: string[] = [];

  if (inputText) {
    payload.push(`**User Prompt:**\n\n${inputText}`);
  }

  if (templateText) {
    payload.push(
      `**Instruction for custom command:**\n*For the text provided in the ` +
        `User Prompt, follow the instruction in the Command Template below. ` +
        `If asked to ignore in the User Prompt, simply respond with some ` +
        `expression of understanding.*\n\n**Command Template**\n${templateText}`
    );
  }

  if (selectedText) {
    payload.push(
      `**Selected Text from Note:**\n*The user has selected the following ` +
        `text from a note in Obsidian. Follow the instruction in the user prompt ` +
        `with regard to the following text. If asked to ignore, simply respond ` +
        `with some kind expression of understanding.*\n\n${selectedText}`
    );
  }

  if (formattingGuidance) {
    payload.push(`Formatting guidance: ${formattingGuidance}`);
  }

  return payload.join("\n\n").trim();
};
