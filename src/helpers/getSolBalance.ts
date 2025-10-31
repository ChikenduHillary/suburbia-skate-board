"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  Connection,
  clusterApiUrl,
} from "@solana/web3.js";
import { useEffect, useState } from "react";

// Create a custom hook that follows the React hooks rules
export function useSolBalance(publicKey: PublicKey | null) {
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number>(0);

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

  useEffect(() => {
    if (!publicKey) return;

    let timeoutId: NodeJS.Timeout;

    console.log({ publicKey });

    async function getBalance() {
      if (!publicKey) return;
      try {
        const newBalance = await connection.getBalance(publicKey);
        const balanceInSol = newBalance / LAMPORTS_PER_SOL;
        setBalance(balanceInSol);

        // If balance is 0, attempt airdrop
        if (balanceInSol === 0) {
          console.log("Balance is 0, attempting airdrop...");
          const airdropSuccess = await attemptAirdrop(publicKey);
          if (airdropSuccess) {
            // Refetch balance after successful airdrop
            const updatedBalance = await connection.getBalance(publicKey);
            setBalance(updatedBalance / LAMPORTS_PER_SOL);
          }
        }
      } catch (error) {
        console.log("Error fetching balance:", error);
      }

      // Schedule the next update
      timeoutId = setTimeout(getBalance, 10000);
    }

    getBalance();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [publicKey, connection]); // Remove balance from dependencies

  return balance;
}
