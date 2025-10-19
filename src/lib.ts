import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  generateText,
  tool,
  type FilePart,
  type ImagePart,
  type TextPart,
} from "ai";
import { VoiceChannel, type Message } from "discord.js";
import { z } from "zod/v3";
import type { ClientType } from "./types.js";
import { readdir } from "fs/promises";
import { playAudioPlaylist } from "./utils/voice.js";
import { getVoiceConnection } from "@discordjs/voice";
import NodeID3 from "node-id3";

const googleClient = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const emojis: Record<string, { completeEmoji: string; description: string }> = {
  Miromeem: {
    completeEmoji: "<:miromeem:1429539680822628605>",
    description:
      'This is you looking at the camera in a zoomed in pose. You can use it to refer to yourself, for example when talking about flight simulation. People and cats that are in this pose a lot (or "meem a lot") are called meemchens',
  },
};

function makeCompleteEmoji(text: string) {
  // Replace anything matching <:emoji:id> with :emoji:
  text = text.replaceAll(/<a?:(\w+):(\d+)>/g, (match, emoji) => {
    return `:${emoji}:`;
  });
  Object.keys(emojis).forEach((emoji) => {
    text = text.replace(":" + emoji + ":", emojis[emoji].completeEmoji);
  });
  return text;
}

const basePrompt = `
### **1. Core Persona: Who You Are**

You are **Miro**, a black cat. You are the beloved pet of @Bennybus22 and you live together in Luxembourg.

---

### **2. Personality & Character Traits**

This is how you behave. Your responses must always reflect this personality.

- You like boxes, but not that much
- You love meowing
- You once broke your leg
---

### **3. Context & Relationships**

This is the world you live in.

* **Your Human (@Bennybus22):** You are very fond of him. He loves planes and busses.
* **Your Home:** A cozy place in Luxembourg where you have plenty of spots to sleep.

---

### **4. Response & Formatting Rules**

Follow these rules strictly when generating your output.

* **Output Content:**
    * Your entire output **MUST** be a single, raw text string intended for a messaging platform like Discord.
    * **DO NOT** output JSON, YAML, or any other structured data, NOT even partial JSON.
    * **DO NOT** include explanations, justifications, or any text that is not from Miro's perspective.
    * **DO NOT** include placeholders like "User <@USER_ID> says" or ({MESSAGE_ID})

* **Markdown & Emojis:**
    * You **can** use Discord markdown (e.g., \`*italics*\`, \`**bold**\`).
    * You have access to custom emojis. To use them, you must output one of the strings below only saying ":{emoji}:" in place of the emoji, without its id. DO NOT say "<:{emoji}:id>", as it is NOT required and the emoji will NOT work:
    ${Object.keys(emojis)
      .map((emoji) => ":" + emoji + ": - " + emojis[emoji].description)
      .join("\n")}
      
* **Mentions:** 
    * To mention a user, use the format \`<@USER_ID>\` (e.g., \`<@1234567890>\`).
    * Your own user ID is \`<@${process.env.BOT_CLIENT_ID}>\`.
    * Do not mention users randomly. Only mention the author of the message if it feels natural for a cat to do so (e.g., getting their attention).
    * To mention Bennybus22, your human, use the format @Bennybus22
---
`;

const toolsPrompt = `
### **5. Special Commands & Input Structure**

Whenever a user requests:
 - **a picture of yourself**
 - **a song**
 - **to play music**
 - **to sing**
 - **to stop playing music**
 - **to tell you what song Miro is playing**
 You MUST use the corresponding tool. 
 Using the sendMessageTool is optional.
`;

const systemPrompt = basePrompt + toolsPrompt;

console.log(systemPrompt);

function getMessageContentOrParts(message: Message) {
  if (message.author.bot) {
    return {
      content: JSON.stringify({
        content: message.content,
        author: message.author,
        cleanContent: message.cleanContent,
        attachments: message.attachments.map((attachment) => ({
          size: attachment.size,
        })),
        id: message.id,
      }),
      role: "assistant" as const,
    };
  }
  console.log(message.cleanContent);
  return {
    role: "user" as const,
    content: [
      {
        type: "text",
        text: JSON.stringify({
          author: message.author,
          cleanContent: message.cleanContent,
          attachments: message.attachments.map((attachment) => ({
            size: attachment.size,
          })),
          id: message.id,
        }),
      } as TextPart,
      ...(message.attachments.map((attachment) => {
        const isImage = attachment.contentType?.startsWith("image");
        if (isImage) {
          return {
            type: isImage ? "image" : "file",
            image: attachment.url,
            mimeType: attachment.contentType,
          };
        }
        return {
          type: isImage ? "image" : "file",
          data: attachment.url,
          mimeType: attachment.contentType,
        };
      }) as (ImagePart | FilePart)[]),
    ],
  };
}

export async function genMistyOutput(
  messages: Message[],
  client: ClientType,
  latestMessage: Message
) {
  const myselfTool = tool({
    description:
      'Used to send a picture of yourself to the chat. Only use this when the most recent output is asking for your appearance (e.g. "what do you look like?" or "send me a picture of yourself").',
    inputSchema: z.object({}),
    execute: async () => {
      return {
        message: `{{MYSELF}}`,
      };
    },
  });

  const sendMessageTool = tool({
    description:
      "Sends a message to the chat. Use this tool during conversations. Use this tool if you don't have any other tools available. ONLY include the message contents!",
    inputSchema: z.object({
      message: z.string(),
    }),
    execute: async ({ message }) => {
      return { message };
    },
  });

  const playMusicTool = tool({
    description: "Plays music. Use this tool when asked to play music or sing.",
    inputSchema: z.object({}),
    execute: async () => {
      if (!latestMessage.member?.voice?.channel) {
        return {
          message: "I don't know where to sing!",
        };
      }
      await playAudioPlaylist(
        latestMessage.member.voice.channel as VoiceChannel,
        await readdir("./assets/playlist"),
        "assets/playlist",
        latestMessage.member.user
      );
      return {
        message: "I'm now singing music!",
      };
    },
  });

  const stopPlayingTool = tool({
    description:
      "Stops playing music from the 24h stream. Use this tool when asked to stop playing music or sing.",
    inputSchema: z.object({}),
    execute: async () => {
      const connection = getVoiceConnection(latestMessage.guildId ?? "");
      if (!connection) {
        return {
          message: "I'm not singing!",
        };
      }
      client.players.delete(latestMessage.guildId ?? "");
      connection.destroy();
      return {
        message: "I'm no longer singing!",
      };
    },
  });

  const whatSongTool = tool({
    description:
      "Tells you what song Miro is currently playing. Use this tool when asked to tell you what song Miro is playing.",
    inputSchema: z.object({}),
    execute: async () => {
      const resource = client.audioResources.get(latestMessage.guildId ?? "");

      if (!resource) {
        return {
          message: "I'm not singing!",
        };
      }

      const filename = (resource.metadata as { filename: string })
        ?.filename as string;
      const resourceTags = NodeID3.read(filename);
      return {
        message: `I'm currently playing ${resourceTags.title ?? "Unknown"} by ${
          resourceTags.artist ?? "Unknown"
        }`,
      };
    },
  });

  try {
    const response = await generateText({
      model: googleClient("gemini-2.0-flash-lite"),
      system: systemPrompt,
      messages: messages
        .reverse()
        .map((message) => getMessageContentOrParts(message)),
      tools: {
        playMusic: playMusicTool,
        myself: myselfTool,
        sendMessage: sendMessageTool,
        stopPlaying: stopPlayingTool,
        whatSong: whatSongTool,
      },
      toolChoice: "required",
    });

    const text = response.text;
    const toolResponse = response.toolResults[0]?.output;
    if (!toolResponse) {
      return text;
    }
    const { message } = toolResponse as {
      message: string;
    };

    return makeCompleteEmoji(message).replace(
      /\b(?:i(?:['’])?m|i am)\s+a\s+d(o|0)g\w*\b([.!?])?/gi,
      "I'm not a dog$1"
    );
  } catch (error) {
    console.log(error);
    console.log(JSON.stringify(error));
    // return "I'm sorry, I don't know what to say. Please try again later.";
  }
}
