import { Navbar } from '../components/navbar'
import { Footer } from '../components/footer'
import { Container } from '../components/container'
import { PageBackLink } from '../components/ui/PageBackLink'

const sections = [
  {
    title: '1. Introduction',
    body: `This Privacy Policy explains how Fabrica ("we", "us", or "our") collects, uses, and shares information when you use our B2B fabric marketplace website and related services. By using Fabrica, you agree to the practices described in this policy.`,
  },
  {
    title: '2. Information We Collect',
    body: `We may collect account details such as your name, email address, company information, phone number, shipping addresses, and order history. We also collect usage data like pages visited, search queries, device type, and approximate location to improve the marketplace experience.`,
  },
  {
    title: '3. How We Use Your Information',
    body: `We use your information to create and manage accounts, process orders, communicate order updates, personalize product recommendations, improve platform performance, prevent fraud, and provide customer support. We do not sell your personal information.`,
  },
  {
    title: '4. Sharing of Information',
    body: `We may share limited information with sellers to fulfill orders, with payment and logistics partners to complete transactions, and with service providers who help us operate the platform. We may also disclose information when required by law or to protect the rights and safety of Fabrica and its users.`,
  },
  {
    title: '5. Data Retention',
    body: `We retain account and order information for as long as needed to provide our services, meet legal obligations, resolve disputes, and enforce our agreements. You may request deletion of your account subject to applicable legal and operational requirements.`,
  },
  {
    title: '6. Your Choices',
    body: `You can update profile and address information in your account settings, manage notification preferences where available, and contact us to request access, correction, or deletion of personal data. Some information may need to be retained for completed transactions and compliance.`,
  },
  {
    title: '7. Security',
    body: `We use reasonable administrative, technical, and organizational measures to protect your information. No method of transmission over the internet is completely secure, so we cannot guarantee absolute security of data shared with us.`,
  },
  {
    title: '8. Contact Us',
    body: `If you have questions about this Privacy Policy or your data, contact us at privacy@fabrica.example. This is sample policy text for demonstration purposes and is not legal advice.`,
  },
]

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f9f9f9]">
      <Navbar variant="solid" showActions fixed={false} />
      <Container className="flex-1 py-8 md:py-12">
        <PageBackLink to="/" label="Back to home" className="mb-3" />
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-black mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: August 5, 2026</p>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-8 space-y-7">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="font-serif text-xl font-semibold text-black mb-2">{section.title}</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{section.body}</p>
            </section>
          ))}
        </div>
      </Container>
      <Footer />
    </div>
  )
}
