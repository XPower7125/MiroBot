import { channel } from "diagnostics_channel";
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { posthogClient, eventTypes } from "../../analytics.js";
import type { ClientType } from "~/types.js";
export default {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pauses music"),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const client = interaction.client as ClientType;
    const guild = interaction.guild;
    if (!guild) return;
    const player = client.players.get(interaction.guild.id);
    if (!player) return await interaction.followUp("No music playing!");
    player.pause();
    posthogClient.capture({
      event: eventTypes.songStop,
      distinctId: interaction.user.id,
      properties: {
        $set: {
          name: interaction.user.username,
          displayName: interaction.user.displayName,
          avatar: interaction.user.avatarURL(),
          userId: interaction.user.id,
        },
        channel: channel.name,
      },
    });
    await interaction.followUp("Music paused!");
  },
};
