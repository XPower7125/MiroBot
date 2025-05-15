import { SlashCommandBuilder } from "discord.js";

// Types

export interface CommandType {
  data: SlashCommandBuilder;
  execute: (Interaction) => void;
}
