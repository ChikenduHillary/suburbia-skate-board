"use server";

import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const OWNER = "ChikenduHillary";
const REPO = "suburbia-skate-board-asset";
const BRANCH = "main";

/**
 * Uploads a file to GitHub and returns its URL
 */
async function uploadFileToGitHub(
  path: string,
  contentBase64: string,
  message: string
): Promise<string> {
  try {
    // Try to get the file first to get its SHA if it exists
    let fileSha: string | undefined;
    try {
      const { data } = await octokit.repos.getContent({
        owner: OWNER,
        repo: REPO,
        path,
        ref: BRANCH,
      });

      if (!Array.isArray(data) && "sha" in data) {
        fileSha = data.sha;
      }
    } catch (error: any) {
      // File doesn't exist yet, which is fine
      if (error.status !== 404) {
        console.log("Error checking file existence:", error);
      }
    }

    // Create or update file
    const result = await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path,
      message,
      content: contentBase64,
      branch: BRANCH,
      ...(fileSha && { sha: fileSha }),
    });

    // Use the download_url from the response, or construct the raw URL
    // The content.download_url is more reliable
    if (result.data.content && "download_url" in result.data.content) {
      return result.data.content.download_url!;
    }

    // Fallback to constructing the URL
    return `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${path}`;
  } catch (error) {
    console.error("Error uploading to GitHub:", error);
    throw new Error("Failed to upload file to GitHub");
  }
}

export async function uploadToGitHub(
  imageData: string,
  metadata: {
    name: string;
    description: string;
    attributes: Array<{ trait_type: string; value: string }>;
  }
) {
  try {
    // Extract the base64 image data (without the data URL prefix)
    let base64Image: string;
    if (imageData.startsWith("data:image/")) {
      base64Image = imageData.split(",")[1];
    } else {
      base64Image = imageData;
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const sanitizedName = metadata.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    const imagePath = `assets/nfts/${sanitizedName}-${timestamp}.png`;

    // Upload image
    const imageUrl = await uploadFileToGitHub(
      imagePath,
      base64Image,
      `Upload NFT image: ${metadata.name}`
    );

    // Create and upload metadata
    const nftMetadata = {
      name: metadata.name,
      description: metadata.description,
      image: imageUrl,
      attributes: metadata.attributes,
    };

    const metadataPath = `assets/metadata/${sanitizedName}-${timestamp}.json`;
    const metadataUrl = await uploadFileToGitHub(
      metadataPath,
      Buffer.from(JSON.stringify(nftMetadata, null, 2)).toString("base64"),
      `Upload NFT metadata: ${metadata.name}`
    );

    return { imageUrl, metadataUrl };
  } catch (error) {
    console.error("Upload failed:", error);
    throw error;
  }
}
