export interface Prompt {
  inputText?: string;
  selectedText?: string;
  formattingGuidance?: string;
}

export const buildPrompt = ({ inputText, selectedText, formattingGuidance }: Prompt): string => {
  let prompt = "";
  if (selectedText) {
    prompt += `${selectedText}\n\n`;
  }
  if (inputText) {
    prompt += `${inputText}\n\n`;
  }
  if (formattingGuidance) {
    prompt += formattingGuidance;
  }
  return prompt;
}