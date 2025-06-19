import { PostHog } from "posthog-node";
import { env } from "process";
import { config } from "dotenv";
config();
if (!env.POSTHOG_API_KEY) throw new Error("POSTHOG_API_KEY not set");
export const posthogClient = new PostHog(env.POSTHOG_API_KEY, {
  host: "https://eu.i.posthog.com",
});

export const eventTypes = {
  commandExecute: "Command Executed",
  interactionError: "Interaction Errored",
  modalOpen: "Modal Opened",
  eventHandled: "Event Handled",
  aiMessage: "AI Message Handled",
  songPlay: "Song Played",
  songStop: "Song Stopped",
  meow: "Meow",
};
