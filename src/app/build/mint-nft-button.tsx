"use client";
import { createNft } from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { generateSigner, transactionBuilder } from "@metaplex-foundation/umi";

import type { Amount } from "@metaplex-foundation/umi";

import { useState } from "react";
import { useCustomizerControls } from "./context";
import { uploadToGitHub } from "../actions/github-storage";
import { api } from "../../../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { toast } from "sonner";

import {
  PublicKey,
  Connection,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface MintNFTButtonProps {
  walletAddress: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wallet: any;
  userName?: string;
}

export default function MintNFTButton({
  walletAddress,
  wallet,
  userName,
}: MintNFTButtonProps) {
  const { selectedWheel, selectedDeck, selectedTruck, selectedBolt } =
    useCustomizerControls();
  const [isMinting, setIsMinting] = useState(false);
  const [isAirdropping, setIsAirdropping] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const publicKey = walletAddress ? new PublicKey(walletAddress) : null;

  // Function to attempt airdrop up to 3 times
  async function attemptAirdrop(receiver: PublicKey) {
    const airdropConnection = new Connection(
      clusterApiUrl("devnet"),
      "confirmed"
    );
    const airdropAmt = 1 * LAMPORTS_PER_SOL;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Attempting airdrop ${attempt}/3...`);
        const sig = await airdropConnection.requestAirdrop(
          receiver,
          airdropAmt
        );

        // Confirm transaction
        const latestBlockhash = await airdropConnection.getLatestBlockhash();
        await airdropConnection.confirmTransaction({
          signature: sig,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        });

        console.log("Airdrop successful!");
        return true; // Success
      } catch (error) {
        console.log(`Airdrop attempt ${attempt} failed:`, error);
        if (attempt === 3) {
          console.error("All airdrop attempts failed.");
          return false; // All attempts failed
        }
      }
    }
    return false;
  }

  const handleMintNFT = async () => {
    console.log("Mint NFT button clicked");
    if (!publicKey || !wallet) {
      alert("Please connect your wallet first");
      return;
    }

    // Check SOL balance before proceeding
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    let balance = await connection.getBalance(publicKey);
    console.log("Current SOL balance:", balance / LAMPORTS_PER_SOL);

    if (balance === 0) {
      console.log("Balance is 0, attempting airdrop...");
      setIsAirdropping(true);
      const airdropSuccess = await attemptAirdrop(publicKey);
      setIsAirdropping(false);
      if (airdropSuccess) {
        // Refetch balance after successful airdrop
        balance = await connection.getBalance(publicKey);
        console.log("Balance after airdrop:", balance / LAMPORTS_PER_SOL);
      } else {
        setShowModal(true);
        return;
      }
    }

    if (balance === 0) {
      toast.error("Insufficient SOL balance", {
        description:
          "You need SOL for transaction fees. Please fund your wallet.",
      });
      return;
    }

    setIsMinting(true);
    try {
      const umi = createUmi("https://api.devnet.solana.com")
        .use(mplTokenMetadata())
        .use(walletAdapterIdentity(wallet));

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
        imageData = tempCanvas.toDataURL("image/png", 1.0);
        const dataSize = imageData.length;
        console.log(
          "Canvas image captured, size:",
          Math.round(dataSize / 1024),
          "KB"
        );

        if (dataSize < 1000) {
          throw new Error("Captured image is too small, might be empty");
        }
      } catch (error) {
        console.error("Failed to capture canvas image:", error);
        throw new Error(
          "Failed to capture the skateboard image. This might be due to browser security restrictions or the 3D model not being fully loaded."
        );
      }

      const attributes = [
        { trait_type: "Wheel", value: selectedWheel?.uid || "default" },
        { trait_type: "Deck", value: selectedDeck?.uid || "default" },
        { trait_type: "Truck", value: selectedTruck?.uid || "default" },
        { trait_type: "Bolt", value: selectedBolt?.uid || "default" },
      ];
      console.log("Attributes generated:", attributes);

      // Upload image and metadata to GitHub
      console.log("Uploading to GitHub...");
      const generateNFTName = () => {
        const wheelName = selectedWheel?.uid || "Custom";
        const capitalizedWheelName =
          wheelName.charAt(0).toUpperCase() + wheelName.slice(1);
        return `${capitalizedWheelName} Skateboard`;
      };

      const nftName = generateNFTName();

      const { imageUrl, metadataUrl } = await uploadToGitHub(imageData, {
        name: nftName,
        description: `A unique skateboard NFT made by ${userName || "Anonymous"}`,
        attributes,
      });
      console.log("Uploaded to GitHub:", { imageUrl, metadataUrl });

      // Create NFT
      console.log("Creating NFT...");
      let signature;
      const maxRetries = 2;
      let mint;

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
              name: nftName,
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

          signature = txSignature;
          console.log("NFT created successfully:", {
            signature: signature.toString(),
          });
          break;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
          console.error(`Attempt ${attempt} failed:`, error);

          if (error.logs) {
            console.error("Transaction logs:", error.logs);
          }

          if (attempt === maxRetries) {
            throw new Error(
              `Failed to mint NFT after ${maxRetries} attempts: ${error.message || "Unknown error"}`
            );
          }

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

      const user = await convex.query(api.users.getUserByWallet, {
        walletAddress: publicKey.toString(),
      });

      if (!user) {
        throw new Error("User not found");
      }

      console.log("Saving to Convex...");
      await convex.mutation(api.nfts.createNFT, {
        prismicId: "custom-skateboard",
        ownerId: user._id,
        creatorId: user._id,
        name: nftName,
        image: imageUrl,
        description: `A unique skateboard NFT made by ${userName || "Anonymous"}`,
        mintAddress: mint.publicKey.toString(),
        metadataUri: metadataUrl,
        attributes,
      });
      console.log("Saved to Convex successfully");

      const mintUrl = `https://explorer.solana.com/address/${mintResult.mintAddress}?cluster=devnet`;
      const txUrl = `https://explorer.solana.com/tx/${mintResult.signature}?cluster=devnet`;

      console.log("View your NFT:");
      console.log("- Mint address:", mintUrl);
      console.log("- Transaction:", txUrl);

      toast.success("NFT minted successfully!", {
        description: "Your custom skateboard NFT has been created.",
        action: {
          label: "View on Explorer",
          onClick: () => window.open(mintUrl, "_blank"),
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Minting failed:", error);

      toast.error("Minting failed", {
        description:
          error.message || "An unknown error occurred while minting your NFT.",
        action: {
          label: "Retry",
          onClick: () => handleMintNFT(),
        },
      });

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

  const handleCopyAddress = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress);
      toast.success("Address copied to clipboard!");
    }
  };

  return (
    <>
      <button
        onClick={handleMintNFT}
        disabled={isMinting || isAirdropping || !publicKey}
        className="button-cutout group disabled:cursor-not-allowed disabled:bg-brand-orange mx-4 inline-flex items-center bg-gradient-to-b from-25% to-75% bg-[length:100%_400%] font-bold transition-[filter,background-position] duration-300 hover:bg-bottom from-brand-lime to-brand-orange text-black gap-3 px-1 text-lg ~py-2.5/3"
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
        {isAirdropping
          ? "Airdropping SOL..."
          : isMinting
            ? "Minting..."
            : "Mint as NFT"}
      </button>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className=" p-6 rounded-lg bg-black/90 shadow-lg max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Airdrop Failed</h2>
            <p className="mb-4">
              Unable to get SOL for transaction fees. Please fund your wallet
              using the Solana faucet.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Wallet Address:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={walletAddress}
                  readOnly
                  className="flex-1 px-3 py-2 rounded-md bg-gray-100/10"
                />
                <button
                  onClick={handleCopyAddress}
                  className="p-2 bg-gray-100/10 hover:bg-gray-100/20 rounded-md"
                  title="Copy to clipboard"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex gap-4">
              <a
                href="https://faucet.solana.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-center"
              >
                Go to Solana Faucet
              </a>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-100/10 hover:bg-gray-100/20 rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
