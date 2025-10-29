import {
  Connection,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Transaction,
  PublicKey,
} from "@solana/web3.js";

/* eslint-disable  @typescript-eslint/no-explicit-any */

export async function transferSol(
  connection: Connection,
  fromWallet: any,
  toAddress: string,
  amount: number
) {
  try {
    const toPublicKey = new PublicKey(toAddress);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromWallet.publicKey,
        toPubkey: toPublicKey,
        lamports: amount * LAMPORTS_PER_SOL,
      })
    );

    // Set the recent blockhash and fee payer
    transaction.feePayer = fromWallet.publicKey;
    const latestBlockhash = await connection.getLatestBlockhash();
    transaction.recentBlockhash = latestBlockhash.blockhash;
    console.log({ fromWallet });

    // Sign the transaction using the wallet adapter

    if (!fromWallet?.signTransaction) {
      return;
    }
    const signedTransaction = await fromWallet.signTransaction(transaction);

    // Send the transaction
    const signature = await connection.sendRawTransaction(
      signedTransaction.serialize()
    );

    console.log();

    // Confirm the transaction
    await connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });
    return signature;
  } catch (error) {
    console.error("Error transferring SOL:", error);
    throw error;
  }
}
