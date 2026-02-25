import { z } from "@medusajs/framework/zod"

export const PostStoreRedeemPointsSchema = z.object({
  cart_id: z.string(),
  variant_ids: z.array(z.string()).optional(),
})

export type PostStoreRedeemPointsSchemaType = z.infer<
  typeof PostStoreRedeemPointsSchema
>

export const DeleteStoreRedeemPointsSchema = z.object({
  cart_id: z.string(),
})

export type DeleteStoreRedeemPointsSchemaType = z.infer<
  typeof DeleteStoreRedeemPointsSchema
>
