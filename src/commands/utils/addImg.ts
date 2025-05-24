import {
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  MessageContextMenuCommandInteraction,
  MessageFlags,
} from "discord.js";
import { createPullRequestWithFileEdit } from "../../utils/pr.js";
import { uploadUrl } from "../../utils/ut.js";

export function appendUrlsToRedirectArray(
  newUrls: string[]
): (content: string) => string {
  return (content: string) => {
    // Updated regex to match the actual structure: const urls: string[] = [ ... ];
    const urlsRegex = /const urls: string\[\] = \[([\s\S]*?)\];/;
    const match = content.match(urlsRegex);

    if (!match || !match[1]) {
      throw new Error("Couldn't find the 'urls' array in the file.");
    }

    const currentUrlsBlock = match[1];

    // Extract existing URLs from the matched block
    const currentUrlsSet = new Set(
      Array.from(currentUrlsBlock.matchAll(/"([^"]+)"/g) ?? []).map((m) => m[1])
    );

    // Filter out URLs that already exist
    const dedupedUrls = newUrls.filter((url) => !currentUrlsSet.has(url));

    if (dedupedUrls.length === 0) {
      console.log("🟨 All URLs already exist. Nothing to update.");
      return content;
    }

    // Format new URLs with proper indentation
    const appendedUrls = dedupedUrls.map((url) => `    "${url}"`).join(",\n");

    // Build the updated URLs block
    // Remove trailing whitespace/newlines and add comma if needed
    const trimmedBlock = currentUrlsBlock.replace(/,?\s*$/, "");
    const updatedUrlsBlock = `${trimmedBlock},\n${appendedUrls}`;

    // Replace the entire urls array with the updated version
    const updatedContent = content.replace(
      urlsRegex,
      `const urls: string[] = [${updatedUrlsBlock}\n  ];`
    );

    console.log(`✅ Added ${dedupedUrls.length} new URL(s).`);
    return updatedContent;
  };
}

export default {
  data: new ContextMenuCommandBuilder()
    .setName("Add Misty Image")
    .setType(ApplicationCommandType.Message),
  async execute(interaction: MessageContextMenuCommandInteraction) {
    const {
      attachments,
      id: messageId,
      url: messageUrl,
    } = interaction.targetMessage;
    await interaction.deferReply();
    if (attachments.size === 0) {
      return interaction.followUp({
        content: "No image found in the message",
        ephemeral: true,
      });
    }
    const attachmentUtUrls = await Promise.all(
      attachments.map(async (attachment) => {
        const url = attachment.url;
        const ufsUrl = await uploadUrl(url);
        return ufsUrl;
      })
    );
    const attachmentUrls = attachmentUtUrls.filter(Boolean);
    if (attachmentUrls.length === 0) {
      return interaction.followUp({
        content: "Failed to upload images",
        ephemeral: true,
      });
    }
    const success = await createPullRequestWithFileEdit({
      owner: "StarNumber12046",
      repo: "starnumber12046.github.io",
      baseBranch: "main",
      filePath: "src/pages/misty.ts",
      editFn: appendUrlsToRedirectArray(
        attachmentUrls.filter((url) => url != undefined)
      ),
      prTitle: "Add Misty Images from " + messageId,
      prBody: `This PR adds Misty images from ${messageUrl}.\n# Added Images\n${attachmentUrls
        .map((url) => `- ${url}`)
        .join(
          "\n"
        )}\n\nNote: This PR is automatically created by the Misty bot. This interaction was created by @${
        interaction.user.username
      }`,
      commitMessage: "Add Misty Images from " + messageId,
    });
    if (success) {
      await interaction.followUp({
        content: "PR created successfully",
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.followUp({
        content: "Failed to create PR",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
