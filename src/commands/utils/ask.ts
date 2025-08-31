import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { askLimit } from "../../utils/redis.js";
import { getMistyAskOutput } from "~/lib.js";

export default {
  data: new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask LuxPlanes for something")
    .addStringOption((option) =>
        option
            .setName("request")
            .setDescription("What do you want LuxPlanes to do?")
            .setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const { success } = await askLimit.limit(
      interaction.user.id
    );
    if (!success) {
        await interaction.reply({
            content: "You have already requested a reset today.",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }
    await interaction.deferReply();
    const request = interaction.options.getString("request");
    if (!request) {
      await interaction.reply({
        content: "You must provide a request.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const output = await getMistyAskOutput(request, interaction.user);
    const luxplanes = await interaction.client.users.fetch(
      process.env.LUXPLANES_ID ?? ""
    );
    await luxplanes.send(output)
    await interaction.followUp({
      content: "I've sent LuxPlanes your request. :)",
      flags: MessageFlags.Ephemeral,
    });
  },
};
