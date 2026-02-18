import { z } from "@medusajs/framework/zod"

export const PostStoreRedeemPointsSchema = z.object({
  cart_id: z.string(),
})

export type PostStoreRedeemPointsSchemaType = z.infer<
  typeof PostStoreRedeemPointsSchema
>
