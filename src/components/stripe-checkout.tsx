"use client";

import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { StripePaymentForm } from "@/components/stripe-payment-form";
import { formatStripeAmount } from "@/lib/stripe-payment";

type StripeCheckoutProps = {
  isConfigured: boolean;
  publishableKey: string;
};

type IntentResponse = {
  amount: number;
  clientSecret: string;
  currency: string;
  description: string;
  name: string;
};

type PaymentStatus = {
  tone: "error" | "info" | "success";
  message: string;
};

export function StripeCheckout({
  isConfigured,
  publishableKey,
}: StripeCheckoutProps) {
  const [intent, setIntent] = useState<IntentResponse | null>(null);
  const [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [isLoadingIntent, setIsLoadingIntent] = useState(false);

  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey],
  );
  const returnUrl =
    typeof window === "undefined"
      ? "/stripe-payment"
      : `${window.location.origin}/stripe-payment`;

  useEffect(() => {
    if (!isConfigured) {
      return;
    }

    let ignore = false;

    async function loadIntent() {
      setIsLoadingIntent(true);
      setLoadError("");

      try {
        const response = await fetch("/api/stripe/payment-intent", {
          cache: "no-store",
          method: "POST",
        });
        const payload = (await response.json()) as
          | IntentResponse
          | { message?: string };

        if (!response.ok) {
          throw new Error(
            "message" in payload && payload.message
              ? payload.message
              : "Stripe could not prepare the payment form.",
          );
        }

        if (!ignore) {
          setIntent(payload as IntentResponse);
        }
      } catch (error) {
        if (!ignore) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Stripe could not prepare the payment form.",
          );
        }
      } finally {
        if (!ignore) {
          setIsLoadingIntent(false);
        }
      }
    }

    void loadIntent();

    return () => {
      ignore = true;
    };
  }, [isConfigured]);

  useEffect(() => {
    if (!publishableKey) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const clientSecret = params.get("payment_intent_client_secret");

    if (!clientSecret) {
      return;
    }

    let ignore = false;

    loadStripe(publishableKey).then(async (stripe) => {
      if (!stripe) {
        return;
      }

      const result = await stripe.retrievePaymentIntent(clientSecret);

      if (ignore) {
        return;
      }

      if (result.error) {
        setStatus({
          tone: "error",
          message:
            result.error.message ??
            "Stripe could not confirm the payment status.",
        });
        return;
      }

      const paymentIntentStatus = result.paymentIntent?.status;

      if (paymentIntentStatus === "succeeded") {
        setStatus({
          tone: "success",
          message: "Payment succeeded.",
        });
        return;
      }

      if (paymentIntentStatus === "processing") {
        setStatus({
          tone: "info",
          message: "Payment is processing.",
        });
        return;
      }

      if (paymentIntentStatus === "requires_payment_method") {
        setStatus({
          tone: "error",
          message: "Payment was not completed. Try another payment method.",
        });
      }
    });

    return () => {
      ignore = true;
    };
  }, [publishableKey]);

  const elementsOptions = useMemo<StripeElementsOptions | undefined>(() => {
    if (!intent?.clientSecret) {
      return undefined;
    }

    return {
      clientSecret: intent.clientSecret,
      appearance: {
        theme: "stripe",
        variables: {
          colorPrimary: "#176b59",
          colorBackground: "#ffffff",
          colorText: "#12211d",
          colorDanger: "#b2482f",
          borderRadius: "16px",
          fontFamily: "Space Grotesk, system-ui, sans-serif",
        },
      },
    };
  }, [intent?.clientSecret]);

  return (
    <div className="stripe-page-shell">
      <section className="panel stripe-checkout-card simple-stripe-card">
        <div className="stripe-simple-head">
          <div>
            <p className="eyebrow">Stripe Payment</p>
            <h1>Checkout</h1>
            <p className="section-copy">
              {intent?.description ?? "Secure payment form"}
            </p>
          </div>

          <Link className="secondary-button" href="/">
            Back
          </Link>
        </div>

        <div className="stripe-simple-summary">
          <span>Amount</span>
          <strong>
            {intent ? formatStripeAmount(intent.amount, intent.currency) : "--"}
          </strong>
        </div>

        {status ? (
          <div className={`stripe-feedback ${status.tone}`} role="status">
            {status.message}
          </div>
        ) : null}

        {!isConfigured ? (
          <div className="stripe-setup-card">
            <strong>Stripe is not configured yet.</strong>
            <p>
              Add <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> and{" "}
              <code>STRIPE_SECRET_KEY</code>.
            </p>
          </div>
        ) : loadError ? (
          <div className="stripe-feedback error" role="alert">
            {loadError}
          </div>
        ) : isLoadingIntent || !elementsOptions || !stripePromise ? (
          <div className="stripe-setup-card">
            <strong>Preparing payment form...</strong>
          </div>
        ) : (
          <Elements options={elementsOptions} stripe={stripePromise}>
            <StripePaymentForm returnUrl={returnUrl} />
          </Elements>
        )}
      </section>
    </div>
  );
}
