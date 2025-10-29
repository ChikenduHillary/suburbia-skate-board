"use client";
import { createNft } from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import {
  generateSigner,
  transactionBuilder,
  publicKey,
} from "@metaplex-foundation/umi";

import type { Amount } from "@metaplex-foundation/umi";

import { useState } from "react";
import { useCustomizerControls } from "./context";
import { uploadToGitHub } from "../actions/github-storage";
import { api } from "../../../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

import { PublicKey } from "@solana/web3.js";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface MintNFTButtonProps {
  walletAddress: string;
  wallet: any;
}

export default function MintNFTButton({
  walletAddress,
  wallet,
}: MintNFTButtonProps) {
  const { selectedWheel, selectedDeck, selectedTruck, selectedBolt } =
    useCustomizerControls();
  const [isMinting, setIsMinting] = useState(false);
  const publicKey = walletAddress ? new PublicKey(walletAddress) : null;

  console.log({ publicKey });

  const handleMintNFT = async () => {
    console.log("Mint NFT button clicked");
    if (!publicKey || !wallet) {
      alert("Please connect your wallet first");
      return;
    }

    setIsMinting(true);
    try {
      // Initialize UMI inside the function to ensure wallet is connected
      const umi = createUmi("https://api.devnet.solana.com")
        .use(mplTokenMetadata())
        .use(walletAdapterIdentity(wallet));

      // Get the current skateboard design image
      const canvases = document.getElementsByTagName("canvas");
      if (canvases.length === 0) {
        throw new Error(
          "3D skateboard viewer is not loaded yet. Please wait for the model to load completely and try again."
        );
      }

      // Find the Three.js canvas (it usually has a specific style or parent element)
      const canvas =
        Array.from(canvases).find(
          (c) =>
            c.style.width === "100%" || // Three.js canvas typically has 100% width
            c.parentElement?.classList.contains("skateboard-viewer") // Add your viewer's class here
        ) || canvases[0];

      // Create a temporary canvas to handle the image processing
      const tempCanvas = document.createElement("canvas");
      const ctx = tempCanvas.getContext("2d");

      // Set the temp canvas size to match the original
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;

      if (!ctx) {
        throw new Error("Failed to get canvas context");
      }

      // Clear the temporary canvas with a transparent background
      ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

      // Wait for next frame to ensure render is complete
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // Draw the original canvas content
      ctx.drawImage(canvas, 0, 0);

      let imageData: string;

      // Log canvas properties for debugging
      console.log("Canvas properties:", {
        width: canvas.width,
        height: canvas.height,
        style: {
          width: canvas.style.width,
          height: canvas.style.height,
        },
      });
      try {
        // Convert to PNG with transparency
        imageData = tempCanvas.toDataURL("image/png", 1.0);
        const dataSize = imageData.length;
        console.log(
          "Canvas image captured, size:",
          Math.round(dataSize / 1024),
          "KB"
        );

        // Validate the captured image
        if (dataSize < 1000) {
          // Less than 1KB is probably empty
          throw new Error("Captured image is too small, might be empty");
        }
      } catch (error) {
        console.error("Failed to capture canvas image:", error);
        throw new Error(
          "Failed to capture the skateboard image. This might be due to browser security restrictions or the 3D model not being fully loaded."
        );
      }

      // Generate attributes from selected parts
      const attributes = [
        { trait_type: "Wheel", value: selectedWheel?.uid || "default" },
        { trait_type: "Deck", value: selectedDeck?.uid || "default" },
        { trait_type: "Truck", value: selectedTruck?.uid || "default" },
        { trait_type: "Bolt", value: selectedBolt?.uid || "default" },
      ];
      console.log("Attributes generated:", attributes);

      // Upload image and metadata to GitHub
      console.log("Uploading to GitHub...");
      const { imageUrl, metadataUrl } = await uploadToGitHub(imageData, {
        name: "Custom Skateboard",
        description: "A unique custom skateboard NFT",
        attributes,
      });
      console.log("Uploaded to GitHub:", { imageUrl, metadataUrl });

      // Create NFT
      console.log("Creating NFT...");
      let signature;
      const maxRetries = 3;
      let lastError;
      let mint; // Declare mint outside the loop

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Attempt ${attempt} of ${maxRetries}...`);

          // Generate a new mint signer for each attempt
          mint = generateSigner(umi);
          console.log("Generated new mint address:", mint.publicKey);

          // Initialize the transaction builder
          let builder = transactionBuilder();
          builder = builder.add(
            createNft(umi, {
              mint,
              name: "Custom Skateboard",
              uri: metadataUrl,
              sellerFeeBasisPoints: 500 as unknown as Amount<"%", 2>,
              symbol: "SKATE",
              collection: null,
              creators: null,
              uses: null,
            })
          );

          // Get fresh blockhash
          await umi.rpc.getLatestBlockhash();

          // Build and send transaction
          const txSignature = await builder.buildAndSign(umi).then((tx) =>
            umi.rpc.sendTransaction(tx, {
              skipPreflight: false,
              preflightCommitment: "confirmed",
            })
          );

          // umi.rpc.sendTransaction returns a transaction signature string; assign it directly.
          signature = txSignature;
          console.log("NFT created successfully:", {
            signature: signature.toString(),
          });
          break; // Success, exit retry loop
        } catch (error: any) {
          console.error(`Attempt ${attempt} failed:`, error);
          lastError = error;

          if (error.logs) {
            console.error("Transaction logs:", error.logs);
          }

          // If this was the last attempt, throw the error
          if (attempt === maxRetries) {
            throw new Error(
              `Failed to mint NFT after ${maxRetries} attempts: ${error.message || "Unknown error"}`
            );
          }

          // Wait before retrying (exponential backoff)
          const waitTime = 1000 * attempt;
          console.log(`Waiting ${waitTime}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }

      if (!mint) {
        throw new Error("Mint was not created successfully");
      }

      const mintResult = {
        mintAddress: mint.publicKey.toString(),
        metadataUri: metadataUrl,
        signature: signature?.toString(),
      };

      // Get user ID from Convex
      const user = await convex.query(api.users.getUserByWallet, {
        walletAddress: publicKey.toString(),
      });

      if (!user) {
        throw new Error("User not found");
      }

      console.log("Saving to Convex...");
      // Save NFT to Convex
      await convex.mutation(api.nfts.createNFT, {
        prismicId: "custom-skateboard",
        ownerId: user._id,
        creatorId: user._id,
        name: "Custom Skateboard",
        image: imageUrl,
        description: "A unique custom skateboard NFT",
        mintAddress: mint.publicKey.toString(),
        metadataUri: metadataUrl,
        attributes,
      });
      console.log("Saved to Convex successfully");

      // Create explorer links
      const mintUrl = `https://explorer.solana.com/address/${mintResult.mintAddress}?cluster=devnet`;
      const txUrl = `https://explorer.solana.com/tx/${mintResult.signature}?cluster=devnet`;

      console.log("View your NFT:");
      console.log("- Mint address:", mintUrl);
      console.log("- Transaction:", txUrl);

      alert(
        `NFT minted successfully!\n\nView on Solana Explorer:\nMint: ${mintUrl}\nTransaction: ${txUrl}`
      );
    } catch (error: any) {
      console.error("Minting failed:", error);
      alert(`Minting failed: ${error.message || "Unknown error"}`);

      if (error.logs) {
        console.error("Transaction logs:", error.logs);
      }
      if (error.stack) {
        console.error("Error stack:", error.stack);
      }
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <button
      onClick={handleMintNFT}
      disabled={isMinting || !publicKey}
      className="button-cutout group mx-4 inline-flex items-center bg-gradient-to-b from-25% to-75% bg-[length:100%_400%] font-bold transition-[filter,background-position] duration-300 hover:bg-bottom from-brand-lime to-brand-orange text-black gap-3 px-1 text-lg ~py-2.5/3"
    >
      <div className="flex size-6 items-center justify-center transition-transform group-hover:-rotate-[25deg] [&>svg]:h-full [&>svg]:w-full">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423L16.5 15.75l.394 1.183a2.25 2.25 0 001.423 1.423L19.5 18.75l-1.183.394a2.25 2.25 0 00-1.423 1.423z"
          />
        </svg>
      </div>
      <div className="w-px self-stretch bg-black/25" />
      {isMinting ? "Minting..." : "Mint as NFT"}
    </button>
  );
}
