/**
 * Client Brief Loyalty Rules:
 * "Regulars should earn rewards for ordering direct... Loyalty points on direct orders, redeemed at checkout."
 *
 * Financial parameters:
 * - 1 Loyalty Point per ₹10 spent on completed direct orders (10 points per ₹100).
 * - 1 Loyalty Point = 50 paise (₹0.50) discount at checkout.
 * - Maximum discount from points is capped at 50% of the payable cart total to protect margins.
 */

export const PAISE_PER_POINT_EARNED = 1000; // ₹10 = 1 point
export const PAISE_PER_POINT_REDEEMED = 50; // 1 point = ₹0.50 = 50 paise
export const MAX_LOYALTY_REBATE_PERCENT = 50; // Up to 50% of order payable
