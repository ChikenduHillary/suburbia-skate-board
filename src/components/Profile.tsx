"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SkateboardProduct } from "@/slices/ProductGrid/SkateboardProduct";
import { useUser } from "@civic/auth-web3/react";

import { ButtonLink } from "./ButtonLink";
import { Bounded } from "./Bounded";
import { redirect } from "next/navigation";
import { useSolBalance } from "@/helpers/getSolBalance";
import { PublicKey } from "@solana/web3.js";

type UserProfile = {
  _id: string;
  walletAddress: string;
  username?: string;
  profileImage?: string;
  bio?: string;
  verified?: boolean;
  xp?: number;
  totalSales?: number;
  totalPurchases?: number;
  ownedBoards: Array<{
    _id: string;
    prismicId: string;
    name: string;
    image?: string;
    price?: number;
    description?: string;
    mintAddress?: string;
    attributes?: Array<{
      trait_type: string;
      value: string;
    }>;
  }>;
  createdBoards: Array<{
    _id: string;
    prismicId: string;
    name: string;
    image?: string;
    price?: number;
    description?: string;
    mintAddress?: string;
    attributes?: Array<{
      trait_type: string;
      value: string;
    }>;
  }>;
  favoriteBoards: Array<{
    _id: string;
    prismicId: string;
    name: string;
    image?: string;
    price?: number;
    description?: string;
    mintAddress?: string;
    attributes?: Array<{
      trait_type: string;
      value: string;
    }>;
  }>;
};

type Props = {
  userProfile: UserProfile;
};

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function Profile({ userProfile }: Props) {
  const router = useRouter();
  const { signOut } = useUser();

  if (!userProfile) return redirect("/");

  console.log({ userProfile });
  const [activeTab, setActiveTab] = useState<"owned" | "created" | "favorites">(
    "owned"
  );

  const solBalance = useSolBalance(new PublicKey(userProfile.walletAddress));
  console.log({ solBalance });

  const isOwnProfile = userProfile?.walletAddress === userProfile.walletAddress;

  const tabs = [
    {
      id: "owned" as const,
      label: "Owned Boards",
      boards: userProfile.ownedBoards,
    },
    {
      id: "created" as const,
      label: "Created Boards",
      boards: userProfile.createdBoards,
    },
    {
      id: "favorites" as const,
      label: "Favorites",
      boards: userProfile.favoriteBoards,
    },
  ];

  console.log({ tabs, activeTab });

  const activeBoards = tabs.find((tab) => tab.id === activeTab)?.boards || [];

  return (
    <Bounded className="py-12 bg-texture bg-zinc-900 min-h-screen text-white">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row gap-8 mb-8">
          <div className="flex-shrink-0 relative">
            <div className="relative w-32 h-32 rounded-full overflow-hidden ">
              {userProfile.profileImage ? (
                <Image
                  src={userProfile.profileImage}
                  alt={userProfile.username || "Profile"}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-400 text-4xl">
                  👤
                </div>
              )}
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <h1 className="text-3xl font-bold">
                {userProfile.username || "Anonymous User"}
              </h1>
              {userProfile.verified && (
                <div className="text-blue-500 text-xl">✓</div>
              )}
            </div>

            <p className="text-stone-400 mb-4 font-mono">
              {userProfile.walletAddress.slice(0, 8)}...
              {userProfile.walletAddress.slice(-8)}
            </p>

            {userProfile.bio && (
              <p className="text-stone-800 mb-6">{userProfile.bio}</p>
            )}

            {isOwnProfile && (
              <ButtonLink href="/build">Build your board</ButtonLink>
            )}
          </div>

          <button
            onClick={async () => {
              await signOut();
              router.push("/");
            }}
            className="p-2 bg-stone-800 flex items-center justify-center self-center h-10 w-10 rounded-full hover:bg-stone-700 transition-colors duration-200 ease-in-out"
            title="Logout"
          >
            <LogOut size={18} className="text-white" />
          </button>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-3 gap-4 mb-8 p-6 bg-stone-50/10 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold">{solBalance || 0}</div>
            <div className="text-stone-400">SOL</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {userProfile.totalSales || 0}
            </div>
            <div className="text-stone-400">Total Sales</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {userProfile.totalPurchases || 0}
            </div>
            <div className="text-stone-400">Total Purchases</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex border-b border-stone-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-b-2 border-stone-800 text-stone-800"
                    : "text-stone-400 hover:text-stone-800"
                }`}
              >
                {tab.label} ({tab.boards.length})
              </button>
            ))}
          </div>
        </div>

        {/* Boards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeBoards.length > 0 ? (
            activeBoards.map((board) => {
              // Construct query params from attributes
              const params = new URLSearchParams();
              if (board.attributes) {
                board.attributes.forEach((attr) => {
                  if (attr.trait_type && attr.value) {
                    params.set(attr.trait_type.toLowerCase(), attr.value);
                  }
                });
              }
              const href = `/build${params.toString() ? `?${params.toString()}` : ""}`;

              return (
                <Link
                  key={board._id}
                  href={href}
                  className="transform scale-90 origin-top"
                >
                  <div className="border-[1px] border-gray-100/20 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                    {board.image && (
                      <img
                        src={board.image}
                        alt={board.name}
                        className="w-full h-48 object-cover rounded-md mb-4"
                      />
                    )}
                    <h3 className="font-bold text-lg mb-2">{board.name}</h3>
                    {board.description && (
                      <p className="text-stone-400 text-sm mb-2">
                        {board.description}
                      </p>
                    )}
                    {board.price && (
                      <p className="text-stone-600 font-semibold">
                        ${board.price / 100}
                      </p>
                    )}
                    {board.mintAddress && (
                      <a
                        href={`https://explorer.solana.com/address/${board.mintAddress}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-stone-400 text-xs mt-2 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Mint: {board.mintAddress.slice(0, 8)}...
                        {board.mintAddress.slice(-8)}
                      </a>
                    )}
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="col-span-full text-center py-12 text-stone-500">
              No boards found in this category.
            </div>
          )}
        </div>
      </div>
    </Bounded>
  );
}
