import {
  ActionRowBuilder,
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  MessageContextMenuCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import type { ClientType } from "~/types.js";

export default {
  data: new ContextMenuCommandBuilder()
    .setName("LuxPlanes ate at a fast food")
    .setType(ApplicationCommandType.Message),
  async execute(interaction: MessageContextMenuCommandInteraction) {
    if (!interaction.memberPermissions?.has("Administrator"))
      return await interaction.reply({
        content: "You don't have permission to use this command.",
        ephemeral: true,
      });
    const modal = await interaction.showModal(
      new ModalBuilder()
        .setTitle("Add more information on where LuxPlanes ate")
        .setCustomId("fastfood")
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId("restaurant")
              .setLabel("Restaurant")
              .setPlaceholder("Enter the restaurant name")
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        ),
      { withResponse: true }
    );
    console.log(modal);
    (interaction.client as ClientType).modalsMessageState.set(
      `fastfood-${interaction.channelId}-${interaction.user.id}`,
      interaction.targetMessage
    );
  },
};
