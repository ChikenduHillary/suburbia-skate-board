"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";

// Create a custom hook that follows the React hooks rules
export function useSolBalance(publicKey: PublicKey | null) {
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    if (!publicKey) return;

    let timeoutId: NodeJS.Timeout;

    console.log({ publicKey });

    async function getBalance() {
      if (!publicKey) return;
      try {
        const newBalance = await connection.getBalance(publicKey);
        setBalance(newBalance / LAMPORTS_PER_SOL);
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
