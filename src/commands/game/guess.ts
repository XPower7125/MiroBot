import {
  AutocompleteInteraction,
  ChannelType,
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { FlightRadar24API } from "flightradarapi";
import { readdir, readFile } from "node:fs/promises";
import { env } from "node:process";
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
    .setDescription('Starts a game of "guess the aircraft"')
    .addStringOption((option) =>
      option
        .setName("dataset")
        .setDescription(
          "Optional dataset to use instead of the default flightradar24 dataset"
        )
        .setRequired(false)
        .setAutocomplete(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const dataset = interaction.options.getString("dataset");
    if (dataset) {
      const datasets = await readdir(env.DATASETS_PATH ?? "");
      if (!datasets.includes(dataset)) {
        await interaction.followUp({
          content: "Invalid dataset",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      const datasetAircraft = await readdir(env.DATASETS_PATH + "/" + dataset);
      // Pick a random aircraft from the dataset
      const aircraftRandomIndex = Math.floor(
        Math.random() * datasetAircraft.length
      );
      const aircraft = datasetAircraft[aircraftRandomIndex];
      // For that aircraft, get a random registration
      const registrations = await readdir(
        env.DATASETS_PATH + "/" + dataset + "/" + aircraft
      );
      const registrationRandomIndex = Math.floor(
        Math.random() * registrations.length
      );
      const registration = registrations[registrationRandomIndex].replace(
        ".jpg",
        ""
      );
      // Get the image for that aircraft
      const image = await readFile(
        env.DATASETS_PATH +
          "/" +
          dataset +
          "/" +
          aircraft +
          "/" +
          registration +
          ".jpg"
      );
      const message = await interaction.followUp({
        files: [image],
        content: `## Guess the aircraft!\n<@${interaction.user.id}> has started a game of "guess the aircraft"`,
      });
      const thread = await message.startThread({
        name: `Guess the aircraft`,
        autoArchiveDuration: 60,
        reason: "Guess the aircraft game",
      });
      await thread.send(
        `Send here your guesses! Remember, you have to send the exact ICAO code!`
      );
      (interaction.client as ClientType).guessGames.set(thread.id, {
        imageUrl: "attachment://" + registration + ".jpg",
        registration,
        guesses: [],
        originalMessage: message,
        icaoCode: aircraft,
      });
      return;
    }
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
      originalMessage: message,
      icaoCode: icao,
    });
  },
  async autocomplete(interaction: AutocompleteInteraction) {
    const focusedValue = interaction.options.getFocused();
    const datasets = await readdir(env.DATASETS_PATH ?? "");
    const filtered = datasets.filter((choice) => choice.includes(focusedValue));
    await interaction.respond(
      filtered.map((choice) => ({ name: choice, value: choice }))
    );
  },
};
