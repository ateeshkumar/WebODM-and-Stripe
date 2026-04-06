import { NextResponse } from "next/server";
import {
  getStripePaymentSettings,
  getStripeServerClient,
} from "@/lib/stripe-server";

export async function POST() {
  try {
    const stripe = getStripeServerClient();
    const payment = getStripePaymentSettings();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: payment.amount,
      currency: payment.currency,
      automatic_payment_methods: {
        enabled: true,
      },
      description: payment.description,
      metadata: {
        product: payment.name,
      },
    });

    if (!paymentIntent.client_secret) {
      throw new Error("Stripe did not return a client secret.");
    }

    return NextResponse.json(
      {
        amount: paymentIntent.amount,
        clientSecret: paymentIntent.client_secret,
        currency: paymentIntent.currency,
        description: payment.description,
        name: payment.name,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "The Stripe payment intent could not be created.",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
        status: 500,
      },
    );
  }
}
