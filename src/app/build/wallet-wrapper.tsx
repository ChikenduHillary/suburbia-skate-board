"use client";
import { redirect } from "next/navigation";
import MintNFTButton from "./mint-nft-button";
import { Wallet } from "@solana/wallet-adapter-react";
import { userHasWallet, Web3UserContextType } from "@civic/auth-web3";

type ExistingWeb3UserContext = Web3UserContextType & {
  solana: {
    address: string;
    wallet: Wallet;
  };
  createWallet: () => Promise<void>;
  walletCreationInProgress: boolean;
};

import { useState } from "react";
import { useUser } from "@civic/auth-web3/react";

export default function WalletWrapper() {
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const user = useUser() as unknown as ExistingWeb3UserContext;

  if (!user) {
    redirect("/");
    return null;
  }

  const handleCreateWallet = async () => {
    if (!user || isCreatingWallet) return;

    setIsCreatingWallet(true);
    try {
      // Check if createWallet method exists
      if (typeof user.createWallet === "function") {
        await user.createWallet();
      } else {
        console.error("Wallet creation method not available");
      }
    } catch (error) {
      console.error("Error creating wallet:", error);
    } finally {
      setIsCreatingWallet(false);
    }
  };

  const solWalletAddress = user?.solana?.address;
  const solWallet = user?.solana?.wallet;

  console.log({ user, solWalletAddress, solWallet });

  // If user doesn't have a wallet, show create wallet button
  if (!userHasWallet(user)) {
    return (
      <div className="text-white">
        <button
          onClick={handleCreateWallet}
          disabled={isCreatingWallet}
          className="px-4 py-2 bg-blue-500 rounded-lg disabled:opacity-50"
        >
          {isCreatingWallet ? "Creating Wallet..." : "Create Wallet"}
        </button>
      </div>
    );
  }

  if (!solWalletAddress) {
    return (
      <div className="text-white">
        Please connect your Solana wallet to mint NFTs
      </div>
    );
  }

  return (
    <MintNFTButton
      walletAddress={solWalletAddress}
      wallet={solWallet}
      userName={user.user?.name}
    />
  );
}
