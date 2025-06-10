import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { db } from "../../db/index.js";
import { fastfoodTable } from "../../db/schema.js";

export default {
  data: new SlashCommandBuilder()
    .setName("fastfood")
    .setDescription("Shows data about LuxPlanes' fast-food eating habits")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("by_restaurant")
        .setDescription(
          "Gets the data about LuxPlanes' fast-food eating habits, sorted by restaurant"
        )
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const fastFoodData = await db.select().from(fastfoodTable).all();
    console.log(fastFoodData);
    switch (interaction.options.getSubcommand()) {
      case "by_restaurant": {
        const restaurantData = fastFoodData.reduce((acc, entry) => {
          if (!entry.restaurant) return acc;
          if (!acc[entry.restaurant]) {
            acc[entry.restaurant] = [];
          }
          acc[entry.restaurant].push(entry);
          return acc;
        }, {} as Record<string, typeof fastFoodData>);
        console.log(restaurantData);
        const embed = new EmbedBuilder()
          .setTitle("Fast Food Eating Habits by Restaurant")
          .setDescription(
            Object.entries(restaurantData)
              .map(
                ([restaurant, entries]) =>
                  `**${restaurant}**: ${entries.length} visits`
              )
              .join("\n")
          )
          .setColor("#FF6B6B")
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }
      default:
        await interaction.reply("Invalid subcommand");
        break;
    }
  },
};
