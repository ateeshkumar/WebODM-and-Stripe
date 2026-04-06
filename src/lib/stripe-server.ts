import Stripe from "stripe";

let stripeClient: Stripe | null = null;

type StripePaymentSettings = {
  amount: number;
  currency: string;
  description: string;
  name: string;
};

export function getStripePublishableKey() {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
}

export function hasStripeSecretKey() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function isStripeConfigured() {
  return Boolean(getStripePublishableKey() && hasStripeSecretKey());
}

export function getStripeServerClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      "Stripe is not configured yet. Add STRIPE_SECRET_KEY to your environment.",
    );
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}

export function getStripePaymentSettings(): StripePaymentSettings {
  const amount = Number.parseInt(process.env.STRIPE_PAYMENT_AMOUNT ?? "4900", 10);
  const currency = (process.env.STRIPE_PAYMENT_CURRENCY ?? "usd").toLowerCase();
  const name = process.env.STRIPE_PAYMENT_NAME ?? "ODM Feature Payment";
  const description =
    process.env.STRIPE_PAYMENT_DESCRIPTION ?? "ODM viewer feature access";

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(
      "STRIPE_PAYMENT_AMOUNT must be a positive integer in the smallest currency unit.",
    );
  }

  if (!/^[a-z]{3}$/.test(currency)) {
    throw new Error("STRIPE_PAYMENT_CURRENCY must be a valid 3-letter currency code.");
  }

  return {
    amount,
    currency,
    description,
    name,
  };
}
