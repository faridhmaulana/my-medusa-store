import { z } from "@medusajs/framework/zod"

export const PostAdminCustomerPointsSchema = z.object({
  action: z.enum(["add", "deduct"]),
  points: z.number().positive(),
  reason: z.string().optional(),
})

export type PostAdminCustomerPointsSchemaType = z.infer<
  typeof PostAdminCustomerPointsSchema
>

export const PostAdminVariantPointConfigSchema = z.object({
  payment_type: z.enum(["currency", "points", "both"]),
  point_price: z.number().nullable(),
})

export type PostAdminVariantPointConfigSchemaType = z.infer<
  typeof PostAdminVariantPointConfigSchema
>
