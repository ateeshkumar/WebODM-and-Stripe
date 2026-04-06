import type { Metadata } from "next";
import { StripeCheckout } from "@/components/stripe-checkout";
import { getStripePublishableKey, isStripeConfigured } from "@/lib/stripe-server";

export const metadata: Metadata = {
  title: "Stripe Payment | WebODM Viewer Hub",
  description: "Dedicated Stripe payment page for the WebODM app.",
};

export default function StripePaymentPage() {
  return (
    <main className="odm-page">
      <StripeCheckout
        isConfigured={isStripeConfigured()}
        publishableKey={getStripePublishableKey()}
      />
    </main>
  );
}
