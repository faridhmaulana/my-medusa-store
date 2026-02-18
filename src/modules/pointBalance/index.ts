import PointBalanceModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const POINT_BALANCE_MODULE = "pointBalance"

export default Module(POINT_BALANCE_MODULE, {
  service: PointBalanceModuleService,
})
