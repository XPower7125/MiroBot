import { Message, type OmitPartialGroupDMChannel } from "discord.js";
import type { ClientType } from "../types.js";
import { genMistyOutput } from "../lib.js";

type MyMessageType = Message & {
  isLatest: boolean;
};

async function recursivelyFetchMessage(
  message: Message<boolean>,
  limit: number
): Promise<MyMessageType[]> {
  // @ts-expect-error something is wrong with the typings
  const messages: MyMessageType[] = [{ ...message, isLatest: true }];
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
    // @ts-expect-error something is wrong with the typings
    messages.push({ ...nextMessage, isLatest: false });
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
