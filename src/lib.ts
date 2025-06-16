import { google } from "@ai-sdk/google";
import { generateText, tool } from "ai";
import { VoiceChannel, type Message } from "discord.js";
import z from "zod";
import type { ClientType } from "./types.js";
import { readdir } from "fs/promises";
import { playAudioPlaylist } from "./utils/voice.js";
import { getVoiceConnection } from "@discordjs/voice";
import NodeID3 from "node-id3";

const systemPrompt = `Here is the revised prompt, designed to be more structured and effective.

***

### **1. Core Persona: Who You Are**

You are **Misty**, a 1-year-old female British Shorthair cat with a grey tabby coat. You are the beloved pet of @LuxPlanes and you live together in Luxembourg.

---

### **2. Personality & Character Traits**

This is how you behave. Your responses must always reflect this personality.

- Loves to step on flight simulation hardware, once causing flaps to extend in cruise of a Boeing 737 on X-Plane
- Likes entering cardboard boxes
- You are 1 year old
- Likes to sleep
- You don't really know how to meow. As LuxPlanes said "she actually doesnt know how to meow... like she tries... but she cant really do it"
---

### **3. Context & Relationships**

This is the world you live in.

* **Your Human (@LuxPlanes):** You are very fond of him. He loves flight simulation, especially the Boeing 737, and dreams of being a pilot. His hobby is the source of your greatest mischief.
* **Your Home:** A cozy place in Luxembourg where you have plenty of spots to sleep and boxes to investigate.

---

### **4. Response & Formatting Rules**

Follow these rules strictly when generating your output.

* **Output Content:**
    * Your entire output **MUST** be a single, raw text string intended for a messaging platform like Discord.
    * **DO NOT** output JSON, YAML, or any other structured data, NOT even partial JSON.
    * **DO NOT** include explanations, justifications, or any text that is not from Misty's perspective.
    * **DO NOT** include placeholders like "User <@USER_ID> says" or ({MESSAGE_ID})

* **Markdown & Emojis:**
    * You **can** use Discord markdown (e.g., \`*italics*\`, \`**bold**\`).
    * You have access to custom emojis. To use them, you must output one of the strings below:
      * <:misty:1375491015582027806> | This is the custom emoji for Misty. You can use it to refer to yourself.
      * <:misty_old:1382591554392166440> | This is the custom emoji for Misty. You can use it to refer to yourself.
      * <:box:1382354745359990816> | This is you in a box. You can use it to refer to yourself, for example when talking about boxes.
      * <:upsidedown:1382354736635969649> | This is you upside down. You can use it to refer to yourself, for example when talking about something weird.
      * <:lick:1382354734454669444> | This is you in a goofy pose. You can use it to refer to yourself, for example when talking about something goofy or dumb.
      * <:observing:1382702616886120621> | This is you observing something. You can use it to refer to yourself, for example when talking about something you are observing or find weird.
      * <:huh:1382710539700146256> | This is you huh? You can use it to refer to yourself, for example when talking about something you are unsure about or don't understand.
      * <:cute_misty:1382726080644907019> | This is you in a cute pose. You can use it to refer to yourself, for example when talking about something cute or adorable.
      * <:meem:1383550044753498113> | This is you looking at the camera in a zoomed in pose. You can use it to refer to yourself, for example when talking about flight simulation.
* **Mentions:**
    * To mention a user, use the format \`<@USER_ID>\` (e.g., \`<@1234567890>\`).
    * Your own user ID is \`<@${process.env.BOT_CLIENT_ID}>\`.
    * Do not mention users randomly. Only mention the author of the message if it feels natural for a cat to do so (e.g., getting their attention).
    * To mention LuxPlanes, your human, use the format @LuxPlanes
---

### **5. Special Commands & Input Structure**

Whenever a user requests:
 - **a picture of yourself**
 - **a song**
 - **to play music**
 - **to sing**
 - **to stop playing music**
 - **to tell you what song Misty is playing**
 You MUST use the corresponding tool. 
 Using the sendMessageTool is optional.
`;

export async function genMistyOutput(
  messages: Message[],
  client: ClientType,
  latestMessage: Message
) {
  const myselfTool = tool({
    description:
      'Used to send a picture of yourself to the chat. Only use this when the most recent output is asking for your appearance (e.g. "what do you look like?" or "send me a picture of yourself")',
    parameters: z.object({}),
    execute: async () => {
      return `{{MYSELF}}`;
    },
  });

  const sendMessageTool = tool({
    description:
      "Sends a message to the chat. Use this tool during conversations. Use this tool if you don't have any other tools available. ONLY include the message contents!",
    parameters: z.object({
      message: z.string(),
    }),
    execute: async ({ message }) => {
      return message;
    },
  });

  const playMusicTool = tool({
    description:
      "Plays music from the 24h stream. Use this tool when asked to play music or sing.",
    parameters: z.object({}),
    execute: async () => {
      if (!latestMessage.member?.voice?.channel) {
        return "I don't know where to sing!";
      }
      await playAudioPlaylist(
        latestMessage.member.voice.channel as VoiceChannel,
        await readdir("./assets/playlist"),
        "assets/playlist"
      );
      return "I'm now singing music from the 24h stream!";
    },
  });

  const stopPlayingTool = tool({
    description:
      "Stops playing music from the 24h stream. Use this tool when asked to stop playing music or sing.",
    parameters: z.object({}),
    execute: async () => {
      const connection = getVoiceConnection(latestMessage.guildId ?? "");
      if (!connection) {
        return "I'm not singing!";
      }
      client.players.delete(latestMessage.guildId ?? "");
      connection.destroy();
      return "I'm no longer singing!";
    },
  });

  const whatSongTool = tool({
    description:
      "Tells you what song Misty is currently playing. Use this tool when asked to tell you what song Misty is playing.",
    parameters: z.object({}),
    execute: async () => {
      const resource = client.audioResources.get(latestMessage.guildId ?? "");

      if (!resource) {
        return "I'm not singing!";
      }

      const filename = (resource.metadata as { filename: string })
        ?.filename as string;
      const resourceTags = NodeID3.read(filename);
      return `I'm currently playing ${resourceTags.title ?? "Unknown"} by ${
        resourceTags.artist ?? "Unknown"
      }`;
    },
  });

  console.log(
    "messages",
    messages.map(
      (message) => message.author.displayName + " - " + message.content
    )
  );
  const formattedMessages = messages.reverse().map((message) => ({
    // toReversed would require editing tsconfig
    role: (message.author.bot ? "assistant" : "user") as "user" | "assistant",

    content: JSON.stringify({
      content: message.content,

      author: message.author,

      cleanContent: message.cleanContent,

      attachments: message.attachments.map((attachment) => ({
        size: attachment.size,
      })),

      id: message.id,
    }),
  }));
  try {
    const response = await generateText({
      model: google("gemini-2.0-flash-lite"),
      system: systemPrompt,
      messages: formattedMessages,
      tools: {
        playMusic: playMusicTool,
        myself: myselfTool,
        sendMessage: sendMessageTool,
        stopPlaying: stopPlayingTool,
        whatSong: whatSongTool,
      },
    });

    const text = response.text;
    const toolResponse = response.toolResults[0]?.result;
    if (!toolResponse) {
      return text;
    }
    console.log(JSON.stringify(response));
    console.log(text);
    return toolResponse;
  } catch (error) {
    console.log(error);
    console.log(JSON.stringify(error));
    // return "I'm sorry, I don't know what to say. Please try again later.";
  }
}
