import { redirect } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Profile } from "@/components/Profile";
import { getUser } from "@civic/auth-web3/nextjs";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  clusterApiUrl,
} from "@solana/web3.js";
import { Web3UserContextType } from "@civic/auth-web3";

type ExistingWeb3UserContext = Web3UserContextType & {
  solana: {
    address: string;
  };
  name?: string;
  picture?: string;
  email?: string;
};

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default async function ProfilePage() {
  const user = (await getUser()) as unknown as ExistingWeb3UserContext;

  if (!user) return redirect("/");
  const { name, picture, email } = user;
  const solWalletAddress = user.solana.address;

  // First check if user exists
  const userDB = await convex.query(api.users.getUserByWallet, {
    walletAddress: solWalletAddress!,
  });

  if (!userDB) {
    try {
      // Create user first since airdrop might fail
      await convex.mutation(api.users.createUser, {
        walletAddress: solWalletAddress!,
        username: name || solWalletAddress!.slice(0, 8),
        avatarUrl: picture,
        email: email!,
      });

      // Attempt airdrop with smaller amount and better error handling
      try {
        const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
        const receiver = new PublicKey(solWalletAddress);
        // Request smaller amount (2 SOL instead of 5)
        const airdropAmt = 2 * LAMPORTS_PER_SOL;
        const sig = await connection.requestAirdrop(receiver, airdropAmt);
        await connection.confirmTransaction(sig);
        console.log("Airdrop successful:", sig);
      } catch (error: unknown) {
        // Handle airdrop failure gracefully
        console.log(
          "Note: Airdrop unavailable. Please visit faucet.solana.com"
        );
        if (
          typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof error.message === "string" &&
          error.message.includes("429")
        ) {
          return (
            <div className="flex min-h-screen items-center justify-center">
              <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">
                  Profile Created Successfully
                </h1>
                <p className="text-gray-600 mb-4">
                  To start minting NFTs, you&apos;ll need some devnet SOL.
                </p>
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    Get SOL from these sources:
                  </p>
                  <ul className="list-disc text-left pl-6 space-y-2">
                    <li>
                      <a
                        href="https://faucet.solana.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700"
                      >
                        Solana Faucet
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://solfaucet.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700"
                      >
                        SolFaucet
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          );
        }
      }
    } catch (error) {
      console.error("Profile creation failed:", error);
      throw error;
    }
  }

  // Get full user profile with boards
  const userProfile = await convex.query(api.users.getUserProfile, {
    walletAddress: solWalletAddress!,
  });

  if (!userProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">
            Error Creating Profile
          </h1>
          <p className="mt-2 text-gray-600">
            Unable to create or retrieve user profile
          </p>
        </div>
      </div>
    );
  }

  const enrichedProfile = {
    ...userProfile,
    verified: false,
    xp: 0,
    totalSales: 0,
    totalPurchases: 0,
  };

  return <Profile userProfile={enrichedProfile} />;
}
