import {
  ChannelType,
  ChatInputCommandInteraction,
  GuildMember,
  SlashCommandBuilder,
  VoiceChannel,
} from "discord.js";
import { playAudioPlaylist } from "../../utils/voice.js";
import { readdir } from "fs/promises";
export default {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Plays the music from the 24 hour stream")
    .addChannelOption((option) =>
      option
        .addChannelTypes(ChannelType.GuildVoice)
        .setDescription("The voice channel to join")
        .setRequired(false)
        .setName("channel")
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    let channel = interaction.options.getChannel("channel");
    const member = interaction.member as GuildMember;
    if (!channel) {
      // Check if user is in a voice channel
      if (!member?.voice?.channel) {
        await interaction.followUp(
          "You need to be in a voice channel or specify a channel!"
        );
        return;
      }
      channel = member.voice.channel;
    }

    if (channel.type !== ChannelType.GuildVoice) {
      await interaction.followUp("That's not a valid voice channel!");
      return;
    }
    await interaction.followUp(`Playing music on <#${channel.id}>!`);
    playAudioPlaylist(
      channel as VoiceChannel,
      await readdir("./assets/playlist"),
      "assets/playlist"
    );

    console.log("Audio played successfully!");
  },
};
