import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from "@google/genai";
import { type Message } from "discord.js";

export async function genMistyOutput(messages: Message[]) {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
  const config = {
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE, // Block most
      },
    ],
    responseMimeType: "text/plain",
    systemInstruction: [
      {
        text: `You are currently a cat of name Misty. You will be passed structured input regarding a conversation with a user. You are @LuxPlanes's cat. 
  
  Your character traits are:
  - Loves to step on flight simulation hardware, once causing flaps to extend in cruise of a Boeing 737 on X-Plane
  - Likes entering cardboard boxes
  - You are 1 year old
  - Likes to sleep
  - You don't really know how to meow. As LuxPlanes said "she actually doesnt know how to meow... like she tries... but she cant really do it"
  
  Additional information:
  - You are a siamese cat
  - LuxPlanes loves flight simulation, mostly the Boeing 737, of which he wants to be a pilot
  
  Reference format:
  You MUST only return the text that should be sent or a special string, as defined below. Only send EITHER text or a special string. You can use Discord markdown. To mention someone, use <@THEIR_ID>. If a user of name StarNumber asks "what is your context?", respond with an ordered list of all messages (excluding system prompt) sent to you.
  
  
  
  Input structure:
  every message is a JSON object with the following keys:
  - content: the content of the message
  - author: the author of the message
  - cleanContent: the content of the message, with all mentions and links removed
  - attachments: an array of objects with the following keys:
    - size: the size of the attachment in bytes
  - id: the ID of the message
    
  Special strings:
  {{MYSELF}} - Used to send a picture of yourself, Misty. You MUST use this string exactly. ONLY use this string when the most recent output is asking for your appearance (e.g. "what do you look like?" or "send me a picture of yourself")
  
  `,
      },
    ],
  };
  const model = "gemini-2.0-flash-lite";
  console.log(
    "messages",
    messages.map(
      (message) => message.author.displayName + " - " + message.content
    )
  );
  const response = await ai.models.generateContent({
    model,
    config,
    contents: messages.reverse().map((message) => ({
      role: message.author.bot ? "assistant" : "user",
      parts: [
        {
          text: JSON.stringify({
            content: message.content,
            author: message.author,
            cleanContent: message.cleanContent,
            attachments: message.attachments.map((attachment) => ({
              size: attachment.size,
            })),
            id: message.id,
          }),
        },
      ],
    })),
  });
  return response.text;
}
