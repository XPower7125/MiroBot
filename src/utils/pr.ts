import { Octokit } from "@octokit/rest";
import { Buffer } from "buffer";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

interface PullRequestParams {
  owner: string;
  repo: string;
  baseBranch: string;
  filePath: string;
  editFn: (currentContent: string) => string;
  prTitle: string;
  prBody: string;
  commitMessage: string;
  branchPrefix?: string;
}

export async function createPullRequestWithFileEdit({
  owner,
  repo,
  baseBranch,
  filePath,
  editFn,
  prTitle,
  prBody,
  commitMessage,
  branchPrefix = "add-misty",
}: PullRequestParams): Promise<boolean> {
  const newBranch = `${branchPrefix}-${Date.now()}`;

  try {
    // 1. Get latest commit SHA
    const refData = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${baseBranch}`,
    });
    const baseSha = refData.data.object.sha;

    // 2. Create new branch
    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${newBranch}`,
      sha: baseSha,
    });

    // 3. Get file content
    const fileRes = await octokit.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref: baseBranch,
    });

    if (!("content" in fileRes.data) || !("sha" in fileRes.data)) {
      throw new Error("Unsupported file structure");
    }

    const currentContent = Buffer.from(fileRes.data.content, "base64").toString(
      "utf-8"
    );
    const updatedContent = editFn(currentContent);
    console.log(updatedContent);
    if (updatedContent === currentContent) {
      console.warn("🟨 File content unchanged. No PR created.");
      return true;
    }

    // 4. Update file
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: commitMessage,
      content: Buffer.from(updatedContent).toString("base64"),
      sha: fileRes.data.sha,
      branch: newBranch,
    });

    // 5. Create PR
    const pr = await octokit.pulls.create({
      owner,
      repo,
      title: prTitle,
      head: newBranch,
      base: baseBranch,
      body: prBody,
    });

    console.log(`✅ PR created: ${pr.data.html_url}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to create PR:", (error as Error).message || error);
    return false;
  }
}
