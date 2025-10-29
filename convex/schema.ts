import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    walletAddress: v.string(), // Solana wallet address (unique ID)
    username: v.string(),
    email: v.string(),
    profileImage: v.optional(v.string()), // IPFS/Arweave/URL
    bio: v.optional(v.string()),
    favoriteBoards: v.optional(v.array(v.id("nfts"))), // reference to NFT table
    createdBoards: v.optional(v.array(v.id("nfts"))),
    ownedBoards: v.optional(v.array(v.id("nfts"))),
    followers: v.optional(v.array(v.id("users"))),
    following: v.optional(v.array(v.id("users"))),
    verified: v.optional(v.boolean()),
    xp: v.optional(v.number()),
    totalSales: v.optional(v.number()),
    totalPurchases: v.optional(v.number()),
    createdAt: v.optional(v.string()),
    updatedAt: v.optional(v.string()),
  })
    .index("by_wallet", ["walletAddress"])
    .index("by_username", ["username"]),

  nfts: defineTable({
    prismicId: v.string(), // Prismic document ID for skateboard
    owner: v.id("users"), // current owner
    creator: v.id("users"), // original creator
    name: v.string(),
    image: v.optional(v.string()),
    price: v.optional(v.number()), // in cents
    createdAt: v.optional(v.number()),
    mintAddress: v.optional(v.string()), // Solana mint address for NFT
    metadataUri: v.optional(v.string()), // IPFS/Arweave URI for metadata
    description: v.optional(v.string()),
    attributes: v.optional(
      v.array(
        v.object({
          trait_type: v.string(),
          value: v.string(),
        })
      )
    ),
  })
    .index("by_owner", ["owner"])
    .index("by_creator", ["creator"])
    .index("by_mint", ["mintAddress"]),
});
