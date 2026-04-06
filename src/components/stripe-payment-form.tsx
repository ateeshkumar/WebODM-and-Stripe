"use client";

import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useState } from "react";

type StripePaymentFormProps = {
  returnUrl: string;
};

export function StripePaymentForm({ returnUrl }: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
      redirect: "if_required",
    });

    setIsSubmitting(false);

    if (result.error) {
      setErrorMessage(
        result.error.message ?? "Your payment could not be completed.",
      );
      return;
    }

    if (result.paymentIntent?.status === "succeeded") {
      setErrorMessage("Payment completed successfully.");
    }
  }

  return (
    <form className="stripe-form" onSubmit={handleSubmit}>
      <div className="stripe-element-shell">
        <PaymentElement
          options={{
            layout: "accordion",
          }}
        />
      </div>

      {errorMessage ? (
        <div
          className={`stripe-feedback ${
            errorMessage.includes("successfully") ? "success" : "error"
          }`}
          role="status"
        >
          {errorMessage}
        </div>
      ) : null}

      <button className="primary-button stripe-submit" disabled={!stripe || isSubmitting} type="submit">
        {isSubmitting ? "Processing payment..." : "Pay now"}
      </button>
    </form>
  );
}
