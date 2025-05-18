import { Message, type OmitPartialGroupDMChannel } from "discord.js";
import type { ClientType } from "../types.js";
import { genMistyOutput } from "../lib.js";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(25, "5 h"),
});

async function recursivelyFetchMessage(
  message: Message,
  limit: number
): Promise<Message[]> {
  const messages: Message[] = [message];
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

    messages.push(nextMessage);
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
    const messages = await recursivelyFetchMessage(message, 4);

    const output = await genMistyOutput(messages);
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
