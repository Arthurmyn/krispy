import type { Metadata } from "next";
import { LegalPageLayout } from "@/frontend/components/legal/LegalPageLayout";

export const metadata: Metadata = { title: "Privacy Policy — Krispy" };

// Content sourced from privacy.txt (template drafted for the current BYOK /
// subscription model) — see the "Important notice" at the bottom.
const SECTIONS = [
  {
    heading: "Scope",
    body: "This Privacy Policy applies to all users of Krispy, including visitors, registered users, and customers. It governs the collection and processing of personal data through our website, applications, and related services.",
  },
  {
    heading: "Information We Collect",
    body: `We collect various types of information to provide and improve our Service, including:

Account Information: When you register, we collect your name, email address, and other contact details necessary to create and manage your account.
User Content: Any content you upload or create using Krispy, including prompts, scripts, images, videos, audio, subtitles, and project files. Krispy does not claim ownership of your creative content.
API Keys: If you connect API keys from third-party AI providers, these keys remain your property. We encrypt stored API keys and do not intentionally expose them after saving.
Payment Information: Payment data is processed exclusively by authorized third-party payment providers. Krispy does not store or process your payment information directly.
Usage Data: Information about your interactions with the Service, including log data, usage statistics, and error reports.
Device Information: Data about the device you use to access the Service, such as hardware model, operating system, and browser type.
Cookies and Similar Technologies: We use cookies and related technologies to enhance user experience and analyze usage patterns.`,
  },
  {
    heading: "How We Use Information",
    body: `We use your information to operate, maintain, and improve Krispy, including to:
Provide and personalize the Service; authenticate and manage your account; process transactions and subscriptions; communicate with you, including customer support and marketing communications (where permitted); monitor and analyze usage to improve performance and security; comply with legal obligations.`,
  },
  {
    heading: "BYOK (Bring Your Own Keys)",
    body: "Krispy operates under a Bring Your Own Keys (BYOK) model. Users connect API keys issued by third-party AI providers to access AI functionalities. These keys remain your property and are encrypted during storage. Krispy does not access, use, or disclose your API keys except to fulfill your requests via the third-party providers. You are responsible for compliance with the terms and conditions of those third-party AI providers.",
  },
  {
    heading: "AI Providers and Third-Party Services",
    body: "Our Service integrates with third-party AI providers and other external services. We do not control their policies, content, or availability. Use of such services is subject to their respective terms. Krispy is not liable for any issues arising from third-party services.",
  },
  {
    heading: "Legal Bases for Processing",
    body: "Where applicable, we process your personal data based on the following legal grounds: your consent; performance of a contract with you; compliance with legal obligations; legitimate interests pursued by Krispy, provided these do not override your rights.",
  },
  {
    heading: "Data Sharing",
    body: "We do not sell your personal data. We may share your information with: service providers and partners who perform services on our behalf under confidentiality agreements; third-party AI providers to process your requests; legal authorities when required by law or to protect rights; affiliates and successors in the event of a merger or acquisition.",
  },
  {
    heading: "International Data Transfers",
    body: "Your information may be transferred to and processed in countries outside your residence, including the United States. We implement appropriate safeguards to protect your data in accordance with applicable laws.",
  },
  {
    heading: "Data Retention",
    body: "We retain your personal data only as long as necessary to provide the Service, comply with legal obligations, resolve disputes, and enforce agreements. User content is retained according to your account status and applicable retention policies.",
  },
  {
    heading: "Security Measures",
    body: "We implement reasonable administrative, technical, and physical safeguards to protect your information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission or storage is completely secure.",
  },
  {
    heading: "User Rights",
    body: "Depending on your jurisdiction, you may have rights regarding your personal data, including: access to your data; correction of inaccurate or incomplete data; deletion of your data, subject to legal exceptions; data portability; restriction of processing; objection to processing; withdrawal of consent where applicable. To exercise these rights, please contact us as described below.",
  },
  {
    heading: "Children's Privacy",
    body: "Our Service is not intended for individuals under the age of 16. We do not knowingly collect personal information from children. If we become aware of such data, we will take steps to delete it.",
  },
  {
    heading: "Cookies and Similar Technologies",
    body: "We use cookies and similar technologies to enhance functionality, analyze usage, and deliver personalized content. You may manage cookie preferences through your browser settings.",
  },
  {
    heading: "Marketing Communications",
    body: "With your consent where required, we may send you promotional emails and updates about Krispy. You may opt-out of marketing communications at any time by following the unsubscribe instructions included in such messages.",
  },
  {
    heading: "California Privacy Rights",
    body: "California residents have specific rights under the California Consumer Privacy Act (CCPA), including the right to know about personal information collected, the right to delete personal information, and the right to opt-out of the sale of personal information. Krispy does not sell personal information.",
  },
  {
    heading: "EEA/UK Privacy Rights",
    body: "If you are located in the European Economic Area or the United Kingdom, you have additional rights under the GDPR, including the right to lodge a complaint with a supervisory authority.",
  },
  {
    heading: "Changes to this Privacy Policy",
    body: "We may update this Privacy Policy from time to time. Material changes will be communicated via the Service or email. Continued use of Krispy after changes indicates acceptance of the updated policy.",
  },
  {
    heading: "Contact Information",
    body: "For questions or to exercise your rights, please contact: legal@krispy.ai",
  },
];

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="Krispy Privacy Policy"
      lastUpdated="July 21, 2026"
      intro="Welcome to Krispy. We respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered content production platform ('Service'). By accessing or using Krispy, you agree to the terms of this Privacy Policy."
      sections={SECTIONS}
      notice="This Privacy Policy is provided as a professional template for early-stage SaaS products. Before deploying in production or accepting customers, it should be reviewed and adapted by qualified legal counsel to reflect Krispy's jurisdiction, corporate structure, privacy practices, and business model."
    />
  );
}
