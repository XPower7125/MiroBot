import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const fastfoodTable = sqliteTable("fastfood", {
  id: int().primaryKey({ autoIncrement: true }),
  restaurant: text(),
  date: int({ mode: "timestamp_ms" }),
  channelId: text(),
  messageId: text(),
});
