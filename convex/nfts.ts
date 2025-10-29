import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createNFT = mutation({
  args: {
    prismicId: v.string(),
    ownerId: v.id("users"),
    creatorId: v.id("users"),
    name: v.string(),
    image: v.optional(v.string()),
    description: v.optional(v.string()),
    mintAddress: v.string(),
    metadataUri: v.string(),
    attributes: v.optional(
      v.array(
        v.object({
          trait_type: v.string(),
          value: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const nftId = await ctx.db.insert("nfts", {
      prismicId: args.prismicId,
      owner: args.ownerId,
      creator: args.creatorId,
      name: args.name,
      image: args.image,
      description: args.description,
      mintAddress: args.mintAddress,
      metadataUri: args.metadataUri,
      attributes: args.attributes,
      createdAt: Date.now(),
    });

    // Update user's createdBoards and ownedBoards
    const user = await ctx.db.get(args.creatorId);
    if (user) {
      await ctx.db.patch(args.creatorId, {
        createdBoards: [...(user.createdBoards || []), nftId],
        ownedBoards: [...(user.ownedBoards || []), nftId],
      });
    }

    return nftId;
  },
});

export const getNFTByMint = query({
  args: { mintAddress: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("nfts")
      .withIndex("by_mint", (q) => q.eq("mintAddress", args.mintAddress))
      .first();
  },
});
