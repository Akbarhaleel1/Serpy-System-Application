import React from 'react';
import { useNavigate } from 'react-router-dom';

const TermsAndConditions: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            ← Back
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Terms & Conditions
          </h1>
          <h2 className="text-xl text-gray-700 mb-4">
            SerpY — Smart ERP for Modern Manufacturers
          </h2>
          
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Issued by:</strong> Synx Automation Private Limited | March 2026</p>
            <p><strong>CIN:</strong> U62099KL2024PTC087457 | <strong>GSTIN:</strong> 32ABNCS3504L1Z8</p>
            <p><strong>Address:</strong> 77 Spaces, Kumarapuram, Trivandrum, Kerala – 695011, India</p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-8">
          {/* 1. Introduction & Acceptance */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction & Acceptance</h3>
            <p className="text-gray-700 mb-3">
              These Terms & Conditions ("Terms") govern your access to and use of SerpY, a cloud-based ERP, invoicing, CRM, and automation platform available at https://www.serpy.in ("the Service"), developed, owned, and operated by Synx Automation Private Limited ("Synx", "we", "us", "our"), a company incorporated under the Companies Act, 2013.
            </p>
            <p className="text-gray-700 mb-3">
              By registering for, accessing, or using the Service — including any free trial — you ("User", "Subscriber", "you") confirm that you have read, understood, and agree to be legally bound by these Terms and all policies incorporated herein. If you do not agree, you must not use the Service.
            </p>
            <p className="text-gray-700">
              These Terms are governed by the laws of India. The exclusive jurisdiction for disputes is the courts of Trivandrum, Kerala.
            </p>
          </section>

          {/* 2. Company Information */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">2. Company Information</h3>
            <div className="text-gray-700 space-y-1">
              <p><strong>Company:</strong> Synx Automation Private Limited</p>
              <p><strong>CIN:</strong> U62099KL2024PTC087457</p>
              <p><strong>GSTIN:</strong> 32ABNCS3504L1Z8</p>
              <p><strong>Registered Address:</strong> 77 Spaces, Kumarapuram, Trivandrum, Kerala – 695011, India</p>
              <p><strong>Legal Contact:</strong> legal@synxautomate.com</p>
              <p><strong>Product Website:</strong> https://www.serpy.in</p>
              <p><strong>Corporate Website:</strong> https://www.synxautomate.com</p>
            </div>
            <p className="text-gray-700 mt-3">
              SerpY is a product owned and distributed exclusively by Synx Automation Private Limited. All intellectual property, data, and service obligations relating to SerpY vest solely in Synx Automation Private Limited.
            </p>
          </section>

          {/* 3. Eligibility & Business Use */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">3. Eligibility & Business Use</h3>
            <p className="text-gray-700 mb-3">
              The Service is designed exclusively for business use by manufacturing companies, fabrication units, engineering workshops, assembly operations, industrial suppliers, and job-work manufacturers operating in India and internationally.
            </p>
            <p className="text-gray-700 mb-3">
              To use the Service you must: (a) be at least 18 years of age; (b) have legal capacity to enter into binding contracts; (c) be using the Service for lawful business purposes; and (d) provide accurate business information during registration, including a valid GSTIN where applicable.
            </p>
            <p className="text-gray-700">
              Personal, household, or consumer use is not permitted. Use by minors is strictly prohibited.
            </p>
          </section>

          {/* 4. Account Registration & Security */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">4. Account Registration & Security</h3>
            <p className="text-gray-700 mb-3">
              Access to the Service requires account registration. You agree to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 mb-4">
              <li>Provide accurate, complete, and current business information including company name, GSTIN, and authorised contact details.</li>
              <li>Maintain the confidentiality of all account credentials including Admin, Manager, and Staff login details.</li>
              <li>Notify us immediately at legal@synxautomate.com of any unauthorised access or security breach.</li>
              <li>Accept full responsibility for all activities conducted under your account across all user roles (Admin, Manager, Staff).</li>
              <li>Ensure that only authorised employees of your organisation are granted access.</li>
            </ul>
            <p className="text-gray-700">
              We reserve the right to suspend or terminate accounts found to be in breach of these Terms, misrepresenting their identity, or engaged in unauthorised access.
            </p>
          </section>

          {/* 5. Free Trial */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">5. Free Trial</h3>
            <p className="text-gray-700 mb-3">
              All new subscriptions include a 14-day free trial. No credit card is required to begin a free trial. During the trial period, you have access to the full feature set of your selected plan.
            </p>
            <p className="text-gray-700 mb-3">
              At the end of the trial period, access to the Service will require a paid subscription. Data entered during the trial will be retained for a period of 30 days after trial expiry; thereafter it may be permanently deleted if a subscription is not activated.
            </p>
            <p className="text-gray-700">
              We reserve the right to modify or withdraw the free trial offer at any time.
            </p>
          </section>

          {/* 6. Subscription Plans & Pricing */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">6. Subscription Plans & Pricing</h3>
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 border-b">Plan</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 border-b">Price</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 border-b">Job Volume</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 border-b">Key Features</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">Starter</td>
                    <td className="px-4 py-3 text-sm text-gray-700">₹2,499/month</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Up to 5,000 jobs/month</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Full job management, inventory, procurement, production scheduling, invoicing, analytics, role-based access</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">Scale</td>
                    <td className="px-4 py-3 text-sm text-gray-700">₹5,999/month</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Unlimited jobs/month</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Everything in Starter + unlimited jobs, advanced task allocation, priority support, custom reports, bulk export, performance analytics</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-700 mb-3">
              All prices are exclusive of applicable taxes. Goods and Services Tax (GST) at the applicable rate will be charged in addition to the listed price for Indian customers.
            </p>
            <p className="text-gray-700">
              Pricing is subject to change. We will notify existing subscribers of price changes with a minimum of 30 days' notice before the change takes effect.
            </p>
          </section>

          {/* 7. Payment Terms */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">7. Payment Terms</h3>
            
            <h4 className="text-lg font-medium text-gray-900 mb-2 mt-4">7.1 Billing Cycle</h4>
            <p className="text-gray-700 mb-4">
              Subscriptions are billed on a monthly basis. Your subscription commences on the date of successful payment and renews automatically each calendar month on the same date until cancelled.
            </p>

            <h4 className="text-lg font-medium text-gray-900 mb-2 mt-4">7.2 Refund Policy</h4>
            <div className="bg-red-50 border border-red-200 p-4 rounded mb-4">
              <p className="text-gray-700 font-medium mb-2">No Refund Policy:</p>
              <p className="text-gray-700">
                All subscription payments are non-refundable. A monthly subscription constitutes a binding monthly contract. Synx Automation Private Limited does not issue refunds, credits, or prorated amounts for partial periods, unused features, early cancellation, or any other reason, except where expressly required by applicable Indian law. The 14-day free trial is provided precisely so that users can evaluate the Service before committing financially.
              </p>
            </div>

            <h4 className="text-lg font-medium text-gray-900 mb-2 mt-4">7.3 Payment Processing</h4>
            <p className="text-gray-700 mb-4">
              Payments are processed by third-party payment gateways operating in compliance with PCI DSS standards. We do not store complete card details. By providing payment information, you authorise us to charge the applicable fees on each billing cycle.
            </p>

            <h4 className="text-lg font-medium text-gray-900 mb-2 mt-4">7.4 Failed Payments & Suspension</h4>
            <p className="text-gray-700">
              If a recurring payment fails, we will attempt collection up to three times within seven (7) days. Should payment remain unsuccessful, the Service will be suspended until the outstanding balance is cleared. All data will be retained during suspension for a period of 30 days. We are not liable for any business loss arising from suspension due to payment failure.
            </p>
          </section>

          {/* 8. Permitted Use */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">8. Permitted Use</h3>
            <p className="text-gray-700 mb-3">
              The Service may be used solely for lawful business purposes related to manufacturing operations, including job management, inventory tracking, procurement, production scheduling, CRM, and invoicing. You must not:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Use the Service to facilitate illegal financial transactions, tax fraud, or falsified GST records.</li>
              <li>Upload or process data belonging to individuals or businesses without lawful authority to do so.</li>
              <li>Attempt to gain unauthorised access to any feature, data, or account beyond your assigned role.</li>
              <li>Reverse engineer, decompile, copy, or reproduce any part of the Service or its codebase.</li>
              <li>Resell, sublicense, or provide third-party access to the Service without prior written consent.</li>
              <li>Use automated scripts, bots, or scraping tools against the Service.</li>
              <li>Upload malicious code, viruses, or content that may impair the Service or other users.</li>
              <li>Use the Service in any way that violates applicable law, regulation, or professional standard.</li>
            </ul>
          </section>

          {/* 9. Data & Manufacturing Records */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">9. Data & Manufacturing Records</h3>
            <p className="text-gray-700 mb-3">
              All job records, inventory data, invoices, production schedules, customer data, and business information you input into SerpY ("Your Data") remains your property. We process Your Data solely to provide the Service to you and in accordance with our Privacy Policy.
            </p>
            <p className="text-gray-700 mb-3">
              By using the Service, you grant Synx Automation Private Limited a limited, non-exclusive licence to process, store, and transmit Your Data as necessary to provide and improve the Service. This licence terminates upon account deletion, subject to retention obligations described in our Privacy Policy.
            </p>
            <p className="text-gray-700">
              You are solely responsible for the accuracy, legality, and completeness of all data you input into the Service, including GSTIN details, tax rates, and invoice records.
            </p>
          </section>

          {/* 10. GST & Invoicing Compliance */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">10. GST & Invoicing Compliance</h3>
            <p className="text-gray-700 mb-3">
              SerpY provides tools to generate GST-compliant invoices. However, you are solely responsible for ensuring that: (a) your GST registrations are valid and current; (b) HSN/SAC codes applied are correct for your goods and services; (c) invoices generated are reviewed for accuracy before issuance; and (d) all GST filings and payments are made in accordance with applicable law.
            </p>
            <p className="text-gray-700">
              Synx Automation Private Limited makes no warranty that use of the invoicing feature alone constitutes compliance with GST law. You are advised to engage a qualified chartered accountant for all tax compliance matters.
            </p>
          </section>

          {/* 11. Intellectual Property */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">11. Intellectual Property</h3>
            <p className="text-gray-700 mb-3">
              All intellectual property in the Service — including the SerpY name, logo, platform design, codebase, algorithms, documentation, and all features — is owned exclusively by Synx Automation Private Limited or its licensors.
            </p>
            <p className="text-gray-700">
              Nothing in these Terms grants you any ownership, licence, or right to use our intellectual property for any purpose beyond accessing the Service for your own business operations. You may not use the SerpY name or branding in any external communication without prior written approval.
            </p>
          </section>

          {/* 12. Third-Party Integrations */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">12. Third-Party Integrations</h3>
            <p className="text-gray-700 mb-3">
              The Service supports integrations with third-party platforms including WhatsApp Business, email (SMTP), cloud storage, and API connections. Use of such integrations is subject to the respective third-party terms of service.
            </p>
            <p className="text-gray-700">
              Synx Automation Private Limited is not responsible for the availability, security, or conduct of any third-party platform. Interruptions or failures in third-party services are outside our control and do not entitle you to a refund or service credit.
            </p>
          </section>

          {/* 13. Service Availability & Modifications */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">13. Service Availability & Modifications</h3>
            <p className="text-gray-700 mb-3">
              We target high availability but do not warrant uninterrupted access. We reserve the right to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 mb-4">
              <li>Modify, update, or discontinue any feature of the Service with or without notice.</li>
              <li>Perform scheduled maintenance which may temporarily affect availability.</li>
              <li>Amend these Terms at any time. Continued use constitutes acceptance of revised Terms.</li>
            </ul>
            <p className="text-gray-700">
              Material changes to these Terms will be communicated via email or in-app notification at least 14 days before taking effect where reasonably practicable.
            </p>
          </section>

          {/* 14. Limitation of Liability */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">14. Limitation of Liability</h3>
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded mb-3">
              <p className="text-gray-700">
                To the maximum extent permitted by applicable law, <strong>SYNX AUTOMATION PRIVATE LIMITED SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, BUSINESS DATA, PRODUCTION DOWNTIME, OR GOODWILL, ARISING FROM YOUR USE OF OR INABILITY TO USE THE SERVICE.</strong>
              </p>
            </div>
            <p className="text-gray-700 mb-3">
              Our total aggregate liability for any claim under these Terms shall not exceed the total fees paid by you to Synx in the three (3) calendar months immediately preceding the event giving rise to the claim.
            </p>
            <p className="text-gray-700">
              We are not liable for errors in invoices, GST calculations, or inventory records arising from incorrect data entered by your team.
            </p>
          </section>

          {/* 15. Indemnification */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">15. Indemnification</h3>
            <p className="text-gray-700">
              You agree to indemnify and hold harmless Synx Automation Private Limited and its directors, officers, employees, and agents from any claims, losses, damages, or expenses (including legal fees) arising from: (a) your breach of these Terms; (b) your violation of applicable law; (c) inaccurate or unlawful data entered into the Service; or (d) unauthorised use of the Service by your staff.
            </p>
          </section>

          {/* 16. Termination */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">16. Termination</h3>
            <p className="text-gray-700 mb-3">
              Either party may terminate the subscription at any time. You may cancel by notifying us at legal@synxautomate.com or via the account settings. Synx may suspend or terminate access immediately for breach of these Terms.
            </p>
            <p className="text-gray-700 mb-3">
              On termination: (a) your access to the Service ceases; (b) fees paid for the current billing month are non-refundable; (c) Your Data is retained for 30 days post-termination, after which it may be permanently deleted.
            </p>
            <p className="text-gray-700">
              You are responsible for exporting all data you wish to retain before cancellation.
            </p>
          </section>

          {/* 17. Governing Law & Dispute Resolution */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">17. Governing Law & Dispute Resolution</h3>
            <p className="text-gray-700 mb-3">
              These Terms are governed by the laws of India. Disputes shall first be subject to good-faith negotiation. If unresolved within 30 days, disputes shall be referred to arbitration under the Arbitration and Conciliation Act, 1996, with a sole arbitrator, conducted in Trivandrum, Kerala, in the English language.
            </p>
          </section>

          {/* 18. Miscellaneous */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">18. Miscellaneous</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li><strong>Entire Agreement:</strong> These Terms, together with our Privacy Policy and Data Security Policy, constitute the entire agreement regarding the Service.</li>
              <li><strong>Severability:</strong> If any provision is held invalid, the remaining provisions remain in effect.</li>
              <li><strong>Waiver:</strong> Failure to enforce any right does not constitute a waiver of that right.</li>
              <li><strong>Force Majeure:</strong> We are not liable for failures caused by events beyond our reasonable control.</li>
            </ul>
          </section>

          {/* 19. Contact */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">19. Contact</h3>
            <p className="text-gray-700 mb-3">
              For queries regarding these Terms:
            </p>
            <div className="text-gray-700 space-y-1">
              <p><strong>Synx Automation Private Limited</strong></p>
              <p><strong>Address:</strong> 77 Spaces, Kumarapuram, Trivandrum, Kerala – 695011, India</p>
              <p><strong>Email:</strong> legal@synxautomate.com</p>
              <p><strong>Website:</strong> https://www.serpy.in</p>
            </div>
          </section>

          {/* Footer */}
          <div className="border-t border-gray-200 pt-6 mt-8">
            <p className="text-sm text-gray-600 text-center">
              Last Updated: March 2026 | Synx Automation Private Limited | CIN: U62099KL2024PTC087457
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;