import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { clusterApiUrl } from "@solana/web3.js";
import { generateSigner, percentAmount } from "@metaplex-foundation/umi";
import { createNft } from "@metaplex-foundation/mpl-token-metadata";

export async function mintSkateboardNFT(
  name: string,
  description: string,
  imageUri: string,
  attributes: Array<{ trait_type: string; value: string }>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wallet: any
) {
  try {
    const umi = createUmi(clusterApiUrl("devnet"))
      .use(mplTokenMetadata())
      .use(irysUploader())
      .use(walletAdapterIdentity(wallet));

    const mint = generateSigner(umi);

    const metadata = {
      name,
      description,
      image: imageUri,
      attributes,
    };

    const uri = await umi.uploader.uploadJson(metadata);

    const tx = await createNft(umi, {
      mint,
      name,
      uri: uri[0],
      sellerFeeBasisPoints: percentAmount(5.5),
    }).sendAndConfirm(umi);

    console.log("NFT minted successfully!", tx);

    return {
      mintAddress: mint.publicKey.toString(),
      metadataUri: uri[0],
      txId: tx.signature.toString(),
    };
  } catch (error) {
    console.error("Error minting NFT:", error);
    throw error;
  }
}
