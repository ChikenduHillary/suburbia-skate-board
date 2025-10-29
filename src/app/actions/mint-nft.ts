"use server";

import { NFTStorage } from "nft.storage";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { createNft } from "@metaplex-foundation/mpl-token-metadata";
import { generateSigner } from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import { clusterApiUrl } from "@solana/web3.js";

// Create NFT Storage client
const client = new NFTStorage({ token: process.env.NFT_STORAGE_KEY! });

export async function uploadToIpfs(
  imageData: string,
  metadata: {
    name: string;
    description: string;
    attributes: Array<{ trait_type: string; value: string }>;
  }
) {
  try {
    // Convert base64 to blob if needed
    const imageBlob = await (async () => {
      if (imageData.startsWith("data:")) {
        const response = await fetch(imageData);
        return response.blob();
      }
      return new Blob([imageData], { type: "image/png" });
    })();

    // Upload image to IPFS
    const imageCid = await client.storeBlob(imageBlob);
    const imageUrl = `https://nftstorage.link/ipfs/${imageCid}`;

    // Create and upload metadata
    const nftMetadata = {
      name: metadata.name,
      description: metadata.description,
      image: imageUrl,
      attributes: metadata.attributes,
    };

    const metadataBlob = new Blob([JSON.stringify(nftMetadata)], {
      type: "application/json",
    });
    const metadataCid = await client.storeBlob(metadataBlob);
    const metadataUrl = `https://nftstorage.link/ipfs/${metadataCid}`;

    return { imageUrl, metadataUrl };
  } catch (error) {
    console.error("Error uploading to IPFS:", error);
    throw error;
  }
}
