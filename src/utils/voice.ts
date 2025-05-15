import { ChannelType, Guild, VoiceChannel } from "discord.js";
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} from "@discordjs/voice";
import { join } from "path";

/**
 * Gets all voice channels in a guild
 */
export function getVoiceChannels(guild: Guild): VoiceChannel[] {
  return guild.channels.cache
    .filter((channel) => channel.type === ChannelType.GuildVoice)
    .map((channel) => channel as VoiceChannel);
}

/**
 * Checks if a voice channel has any members in it
 */
export function hasMembers(channel: VoiceChannel): boolean {
  return channel.members.size > 0;
}

/**
 * Joins a voice channel
 */
export function joinChannel(channel: VoiceChannel) {
  return joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
  });
}

/**
 * Plays an MP3 file in a voice channel
 */
export async function playAudio(channel: VoiceChannel, filename: string) {
  const connection = joinChannel(channel);
  const player = createAudioPlayer();
  const resource = createAudioResource(join(process.cwd(), filename));

  connection.subscribe(player);
  console.log("Subscribed to player");
  player.play(resource);
  console.log("Playing audio");

  return new Promise((resolve) => {
    player.on(AudioPlayerStatus.Idle, () => {
      console.log("Idle");
      connection.destroy();
      resolve(true);
    });
  });
}
