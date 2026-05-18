export interface FilterResult {
  blocked: boolean;
  warning: string | null;
  cleanContent: string;
}

export function filterMessage(content: string): FilterResult {
  // Block URLs/links
  const urlPattern = /(https?:\/\/|www\.)[\w\-]+(\.[\w\-]+)+[^\s]*/gi;
  if (urlPattern.test(content)) {
    return { blocked: true, warning: "Link sharing is not allowed for your safety.", cleanContent: content };
  }
  
  // Block email addresses
  const emailPattern = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  if (emailPattern.test(content)) {
    return { blocked: true, warning: "Sharing email addresses is not allowed. Use the chat to communicate.", cleanContent: content };
  }
  
  // Block phone numbers (various formats)
  const phonePattern = /(\+?\d[\s\-.]?){7,15}\d/g;
  if (phonePattern.test(content)) {
    return { blocked: true, warning: "Sharing phone numbers is not allowed for your safety.", cleanContent: content };
  }
  
  // Block credit card numbers
  const cardPattern = /\b(?:\d[\s\-]?){13,19}\b/g;
  if (cardPattern.test(content)) {
    return { blocked: true, warning: "Sharing card numbers is not allowed.", cleanContent: content };
  }
  
  // Block emoji + number combos (attempt to obfuscate phone/credentials)
  const emojiNumberPattern = /[\u{1F4F1}\u{1F4E7}\u{260E}\u{1F4DE}\u{1F4F2}\u{1F4AC}][\s]*[\d]/u;
  if (emojiNumberPattern.test(content)) {
    return { blocked: true, warning: "Sharing contact information is not allowed.", cleanContent: content };
  }
  
  return { blocked: false, warning: null, cleanContent: content };
}