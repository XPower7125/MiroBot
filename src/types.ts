import { Client, Collection, SlashCommandBuilder } from "discord.js";

// Types

export interface CommandType {
  data: SlashCommandBuilder;
  execute: (Interaction) => void;
}

export type ClientType = Client<boolean> & {
  commands: Collection<string, CommandType>;
  events: Collection<string, EventType>;
};

export interface EventType {
  eventType: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: (client: ClientType, ...args: any[]) => unknown;
}
