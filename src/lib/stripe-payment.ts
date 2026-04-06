export const STRIPE_DEMO_PRODUCT = {
  amount: 4900,
  currency: "usd",
  description: "ODM viewer feature access",
  name: "ODM Feature Payment",
} as const;

export function formatStripeAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}
