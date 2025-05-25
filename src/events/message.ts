import { Message, type OmitPartialGroupDMChannel } from "discord.js";
import type { ClientType } from "../types.js";
import { genMistyOutput } from "../lib.js";
import { ratelimit } from "../utils/ratelimit.js";

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
    const { success, reset } = await ratelimit.limit(message.author.id);
    if (!success) {
      return await message.reply(
        `You ran out of messages! Retry <t:${Math.floor(reset / 1000)}:R>`
      );
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
    try {
      const loadedJson = JSON.parse(output);
      if (loadedJson.content) {
        await message.reply(loadedJson.content);
        return;
      }
      if (loadedJson.cleanContent) {
        await message.reply(loadedJson.cleanContent);
        return;
      }
      return await message.reply(output);
    } catch {
      if (output.includes('"avatar')) {
        // Temp fix?
        const formattedText = output.split('"avatar')[0];
        if (!formattedText) return;
        await message.reply(formattedText);
        return;
      }
    }

    await message.reply(output);
  },
};
