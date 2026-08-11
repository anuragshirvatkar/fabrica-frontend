export type FaqItem = {
  question: string
  answer: string
}

/** Shared FAQ copy for the landing section and /faq page. */
export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'What is Fabrica?',
    answer:
      'Fabrica is a B2B marketplace for premium fabrics and textiles. Clothing brands, designers, and manufacturers can discover verified mill inventory, compare specs, and place orders in one place.',
  },
  {
    question: 'How does AI sourcing help me?',
    answer:
      'Ask Fabrica AI for fabrics by use case, color, GSM, or budget. It recommends products from the published catalog only, so you get real matches instead of generic advice.',
  },
  {
    question: 'How do orders and delivery work?',
    answer:
      'Add fabrics to your cart, checkout with a saved address, and track order status from your account. Delivery timelines depend on the seller — confirm lead times on the product page when needed.',
  },
]
