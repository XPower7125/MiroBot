import {
  ChannelType,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { FlightRadar24API } from "flightradarapi";
import type { ClientType } from "~/types.js";

interface Aircraft {
  registration: string;
  imageUrl: string;
  icao: string;
}

const frApi = new FlightRadar24API();

interface Image {
  src: string;
  link: string;
  copyright: string;
  source: string;
}

interface AircraftData {
  images: {
    thumbnails: Image[];
    medium: Image[];
    large: Image[];
  };
}

function getAircraftImage(images: AircraftData): Image {
  console.log(images);
  // If large exists, use it
  if (images.images.large.length > 0) {
    const randomIndex = Math.floor(Math.random() * images.images.large.length);
    console.log("LARGE");
    return images.images.large[randomIndex];
  }
  // If medium exists, use it
  if (images.images.medium.length > 0) {
    const randomIndex = Math.floor(Math.random() * images.images.medium.length);
    console.log("MEDIUM");
    return images.images.medium[randomIndex];
  }
  // If thumbnails exists, use it
  console.log("THUMBNAILS");
  const randomIndex = Math.floor(
    Math.random() * images.images.thumbnails.length
  );
  return images.images.thumbnails[randomIndex];
}

async function findRandomAircraft(): Promise<Aircraft | null> {
  const flights = await frApi.getFlights();
  console.log(flights.length);
  const randomFlight = flights[Math.floor(Math.random() * flights.length)];
  const flightDetails = await frApi.getFlightDetails(randomFlight);
  const aircraftImage = getAircraftImage(
    (flightDetails as { aircraft: AircraftData }).aircraft
  );
  return {
    registration: randomFlight.registration,
    imageUrl: aircraftImage.src,
    icao: randomFlight.aircraftCode,
  };
}

export default {
  data: new SlashCommandBuilder()
    .setName("guess")
    .setDescription('Starts a game of "guess the aircraft"'),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const aircraft = await findRandomAircraft();
    if (!aircraft) {
      await interaction.followUp("No aircraft found!");
      return;
    }
    const { registration, imageUrl, icao } = aircraft;

    const message = await interaction.followUp({
      files: [imageUrl],
      content: `## Guess the aircraft!\n<@${interaction.user.id}> has started a game of "guess the aircraft"`,
    });
    if (!interaction.channel || interaction.channel.type === ChannelType.DM)
      return await interaction.followUp("This cannot be used in DMs");
    const thread = await message.startThread({
      name: `Guess the aircraft`,
      autoArchiveDuration: 60,
      reason: "Guess the aircraft game",
    });
    await thread.send(
      `Send here your guesses! Remember, you have to send the exact ICAO code!`
    );
    (interaction.client as ClientType).guessGames.set(thread.id, {
      imageUrl,
      registration,
      guesses: [],
      icaoCode: icao,
    });
  },
};
