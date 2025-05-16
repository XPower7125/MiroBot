import { Message, type OmitPartialGroupDMChannel } from "discord.js";
import type { ClientType } from "../types.js";
import { genMistyOutput } from "../lib.js";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(25, "5 h"),
});

interface MyMessageType {
  content: string;
  author: {
    id: string;
    username: string;
    discriminator: string;
    bot: boolean;
    system: boolean;
  };
  isLatest: boolean;
  reference?: { messageId: string | null };
  attachments: { size: number }[];
  cleanContent: string;
}

async function recursivelyFetchMessage(
  message: Message,
  limit: number
): Promise<MyMessageType[]> {
  const messages: MyMessageType[] = [
    {
      isLatest: true,
      attachments: message.attachments.map((attachment) => ({
        size: attachment.size,
      })),
      cleanContent: message.cleanContent,
      author: {
        id: message.author.id,
        username: message.author.username,
        discriminator: message.author.discriminator,
        bot: message.author.bot,
        system: message.author.system,
      },
      reference: { messageId: message.reference?.messageId ?? null },
      content: message.content,
    },
  ];
  let currentMessage = message;
  let count = 0;

  while (currentMessage.reference?.messageId && count < limit) {
    const nextMessage = await currentMessage.channel.messages.fetch(
      currentMessage.reference.messageId
    );
    if (
      nextMessage.content.length === 0 &&
      nextMessage.attachments.size >= 1 &&
      nextMessage.author.id == process.env.BOT_CLIENT_ID
    )
      nextMessage.content =
        "{{MYSELF}} - Already responded. You do NOT need to send {{MYSELF}} again.";

    messages.push({
      isLatest: true,
      attachments: nextMessage.attachments.map((attachment) => ({
        size: attachment.size,
      })),
      cleanContent: nextMessage.cleanContent,
      author: {
        id: nextMessage.author.id,
        username: nextMessage.author.username,
        discriminator: nextMessage.author.discriminator,
        bot: nextMessage.author.bot,
        system: nextMessage.author.system,
      },
      reference: { messageId: nextMessage.reference?.messageId ?? null },
      content: nextMessage.content,
    });
    currentMessage = nextMessage;
    count++;
  }
  console.log(messages);

  return messages;
}

export default {
  eventType: "messageCreate",
  async execute(
    client: ClientType,
    message: OmitPartialGroupDMChannel<Message<boolean>>
  ) {
    if (message.author.bot) return;
    const completeMessageReference = message.reference?.messageId
      ? await message.channel.messages.fetch(message.reference?.messageId)
      : null;

    if (
      !message.content.includes(`<@${client.user?.id}>`) &&
      completeMessageReference?.author.id !== client.user?.id
    )
      return;
    const { success } = await ratelimit.limit(message.author.id);
    if (!success) {
      return;
    }
    await message.channel.sendTyping();
    const fullMessage = await recursivelyFetchMessage(message, 4);

    console.log(JSON.stringify(fullMessage));
    const output = await genMistyOutput(JSON.stringify(fullMessage));
    console.log(output);
    if (output?.includes("{{MYSELF}}")) {
      const imageResponse = await fetch("https://starnumber.lol/misty");
      const imageData = Buffer.from(await imageResponse.arrayBuffer());
      await message.reply({ files: [imageData] });
      return;
    }
    if (!output) return;
    await message.reply(output);
  },
};
