import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getUserByWallet = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .first();
  },
});

export const getUserProfile = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .first();

    if (!user) return null;

    // Get owned boards
    const ownedBoards = user.ownedBoards
      ? await Promise.all(
          user.ownedBoards.map(async (nftId) => {
            const nft = await ctx.db.get(nftId);
            return nft;
          })
        )
      : [];

    // Get created boards
    const createdBoards = user.createdBoards
      ? await Promise.all(
          user.createdBoards.map(async (nftId) => {
            const nft = await ctx.db.get(nftId);
            return nft;
          })
        )
      : [];

    // Get favorite boards
    const favoriteBoards = user.favoriteBoards
      ? await Promise.all(
          user.favoriteBoards.map(async (nftId) => {
            const nft = await ctx.db.get(nftId);
            return nft;
          })
        )
      : [];

    return {
      ...user,
      ownedBoards: ownedBoards.filter(
        (nft): nft is NonNullable<typeof nft> => nft !== null
      ),
      createdBoards: createdBoards.filter(
        (nft): nft is NonNullable<typeof nft> => nft !== null
      ),
      favoriteBoards: favoriteBoards.filter(
        (nft): nft is NonNullable<typeof nft> => nft !== null
      ),
    };
  },
});

export const createUser = mutation({
  args: {
    walletAddress: v.string(),
    username: v.string(),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .first();

    if (existing) {
      return existing;
    }

    // Create new user if none exists
    return await ctx.db.insert("users", {
      email: args.email,
      walletAddress: args.walletAddress,
      username: args.username,
      profileImage: args.avatarUrl ?? undefined,
      ownedBoards: [],
      createdBoards: [],
      favoriteBoards: [],
      createdAt: new Date().toISOString(),
    });
  },
});
