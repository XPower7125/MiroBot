import type { ModalSubmitInteraction } from "discord.js";
import { db } from "~/db/index.js";
import { fastfoodTable } from "~/db/schema.js";
import type { ClientType } from "~/types.js";

export default {
  modalId: "fastfood",
  async execute(client: ClientType, interaction: ModalSubmitInteraction) {
    console.log(interaction);
    const { fields } = interaction;
    await interaction.deferReply();
    const message = client.modalsMessageState.get(
      `fastfood-${interaction.channelId}-${interaction.user.id}`
    );
    console.log(client.modalsMessageState);
    if (!message)
      return await interaction.followUp({
        content: "Something went wrong, and I don't know what.",
        ephemeral: true,
      });
    client.modalsMessageState.delete(
      `fastfood-${interaction.channelId}-${interaction.user.id}`
    );
    const restaurant = fields.getTextInputValue("restaurant");
    console.log("MSG");
    console.log(message);

    console.log(message);
    await db.insert(fastfoodTable).values({
      restaurant,
      date: new Date(message?.createdTimestamp ?? Date.now()),
      channelId: message?.channelId ?? "",
      messageId: message?.id ?? "",
    });
    await interaction.followUp({
      content: "Successfully added the information to the database!",
      ephemeral: true,
    });
  },
};
