import React from 'react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy: React.FC = () => {
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
            Privacy Policy
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
          {/* 1. Introduction */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h3>
            <p className="text-gray-700 mb-3">
              Synx Automation Private Limited ("Synx", "we", "us") is committed to protecting the privacy of businesses and individuals who use SerpY. This Privacy Policy explains how we collect, use, share, and protect personal and business data processed through the Service at https://www.serpy.in.
            </p>
            <p className="text-gray-700 mb-3">
              This Policy is compliant with the Information Technology Act, 2000, the IT (Reasonable Security Practices and Sensitive Personal Data or Information) Rules, 2011 ("SPDI Rules"), and the Digital Personal Data Protection Act, 2023 ("DPDPA"), as applicable.
            </p>
            <p className="text-gray-700">
              By using the Service, you ("Data Principal", "Subscriber", "you") consent to the practices described in this Policy.
            </p>
          </section>

          {/* 2. Data Fiduciary */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">2. Data Fiduciary</h3>
            <div className="text-gray-700 space-y-1">
              <p><strong>Company:</strong> Synx Automation Private Limited</p>
              <p><strong>CIN:</strong> U62099KL2024PTC087457</p>
              <p><strong>Address:</strong> 77 Spaces, Kumarapuram, Trivandrum, Kerala – 695011, India</p>
              <p><strong>Privacy Contact:</strong> privacy@synxautomate.com</p>
            </div>
          </section>

          {/* 3. Data We Collect */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">3. Data We Collect</h3>
            
            <h4 className="text-lg font-medium text-gray-900 mb-2 mt-4">3.1 Business & Account Information</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700 mb-4">
              <li>Company name, GSTIN, business address, and industry type.</li>
              <li>Authorised representative name, email address, and phone number.</li>
              <li>Billing information (processed by third-party PCI DSS-compliant payment gateways; we do not store full card details).</li>
              <li>User account details for all Admin, Manager, and Staff logins created under your subscription.</li>
            </ul>

            <h4 className="text-lg font-medium text-gray-900 mb-2 mt-4">3.2 Operational / Manufacturing Data</h4>
            <p className="text-gray-700 mb-3">
              The following categories of data are entered into the Service by you in the course of running your business:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 mb-4">
              <li><strong>Job records:</strong> job details, customer requirements, materials, quantities, deadlines, production status, and process notes.</li>
              <li><strong>Inventory data:</strong> raw materials, components, finished goods, stock movement, and reorder levels.</li>
              <li><strong>Procurement records:</strong> purchase orders, supplier details, and pricing.</li>
              <li><strong>Customer data:</strong> names, contact details, addresses, GSTIN, quotations, invoices, and payment records.</li>
              <li><strong>Team and task data:</strong> staff assignments, task completion logs, and operational activity.</li>
              <li><strong>Invoice and financial data:</strong> GST invoices, payment status, and outstanding amounts.</li>
            </ul>
            <p className="text-gray-700 mb-4">
              This operational data is your business data. We process it solely to provide the Service and do not use it for any other purpose.
            </p>

            <h4 className="text-lg font-medium text-gray-900 mb-2 mt-4">3.3 Automatically Collected Data</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700 mb-4">
              <li><strong>Log data:</strong> IP addresses, browser type, pages accessed, timestamps, and referring URLs.</li>
              <li><strong>Device and session information:</strong> operating system, device identifiers, and screen resolution.</li>
              <li><strong>Usage analytics:</strong> feature usage patterns, session duration, and error logs.</li>
              <li><strong>Cookies and similar technologies</strong> (see Section 9).</li>
            </ul>

            <h4 className="text-lg font-medium text-gray-900 mb-2 mt-4">3.4 Sensitive Personal Data</h4>
            <p className="text-gray-700">
              We do not intentionally collect Sensitive Personal Data or Information (SPDI) as defined under the SPDI Rules from individual users, except billing data which is processed solely by our payment partners.
            </p>
          </section>

          {/* 4. How We Use Your Data */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">4. How We Use Your Data</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li><strong>Service Delivery:</strong> To operate, maintain, and improve the SerpY platform and all its features.</li>
              <li><strong>Account Management:</strong> To manage registrations, authenticate users across all role tiers, and maintain account security.</li>
              <li><strong>Billing:</strong> To process payments, issue tax invoices, and manage subscription renewals.</li>
              <li><strong>Support:</strong> To respond to support queries, diagnose issues, and improve user experience.</li>
              <li><strong>Product Improvement:</strong> To analyse usage patterns and develop new features relevant to manufacturing workflows.</li>
              <li><strong>Legal Compliance:</strong> To comply with applicable laws, GST regulations, and regulatory requirements.</li>
              <li><strong>Communications:</strong> To send service announcements, updates, and — with your consent — product information.</li>
            </ul>
          </section>

          {/* 5. Legal Basis for Processing */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">5. Legal Basis for Processing</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li><strong>Contractual Necessity:</strong> To fulfil our obligations under your subscription agreement.</li>
              <li><strong>Consent:</strong> Where you have provided explicit consent (e.g., marketing communications).</li>
              <li><strong>Legitimate Interests:</strong> For fraud prevention, security, and product improvement.</li>
              <li><strong>Legal Obligation:</strong> To comply with applicable Indian law including GST regulations.</li>
            </ul>
          </section>

          {/* 6. Data Sharing & Disclosure */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">6. Data Sharing & Disclosure</h3>
            <p className="text-gray-700 mb-3">
              We do not sell your data. We do not share your operational manufacturing data with any third party for commercial purposes. We may share data only with:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 mb-4">
              <li><strong>Service Providers:</strong> Trusted vendors providing cloud hosting, analytics, payment processing, and communication services — under strict data processing agreements requiring equivalent security standards.</li>
              <li><strong>Legal Authorities:</strong> Where required by law, court order, or lawful government directive.</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or asset sale, with appropriate data protection safeguards.</li>
              <li><strong>With Your Consent:</strong> In circumstances where you have explicitly authorised disclosure.</li>
            </ul>
            <p className="text-gray-700">
              Your manufacturing data — job records, inventory, invoices, customer details — is never accessed by us for commercial analysis or shared with competitors or third parties.
            </p>
          </section>

          {/* 7. Data Retention */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">7. Data Retention</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li><strong>Active subscription data:</strong> Retained for the duration of your subscription plus 30 days post-cancellation (to allow for data export).</li>
              <li><strong>Post-cancellation:</strong> Data is permanently deleted 30 days after account closure unless you request earlier deletion.</li>
              <li><strong>Free trial data:</strong> Retained for 30 days post-trial expiry; deleted if no subscription is activated.</li>
              <li><strong>Billing records:</strong> Retained for seven (7) years as required by Indian financial and GST regulations.</li>
              <li><strong>Audit logs:</strong> Retained for a minimum of 90 days for security and compliance purposes.</li>
            </ul>
            <p className="text-gray-700 mt-3">
              You may request a full export of your data before cancellation. Contact privacy@synxautomate.com to request export or deletion.
            </p>
          </section>

          {/* 8. Your Rights as a Data Principal */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">8. Your Rights as a Data Principal</h3>
            <p className="text-gray-700 mb-3">
              Under the DPDPA 2023 and applicable law, you have the following rights:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 mb-4">
              <li><strong>Right to Access:</strong> Request a summary of personal data held about you.</li>
              <li><strong>Right to Correction:</strong> Request correction of inaccurate or incomplete data.</li>
              <li><strong>Right to Erasure:</strong> Request deletion of personal data, subject to legal retention obligations (e.g., GST records).</li>
              <li><strong>Right to Portability:</strong> Request an export of your operational data in a standard format.</li>
              <li><strong>Right to Grievance Redressal:</strong> Raise a complaint with our Grievance Officer (see Section 11).</li>
              <li><strong>Right to Nominate:</strong> Nominate another person to exercise your rights in the event of death or incapacity.</li>
            </ul>
            <p className="text-gray-700">
              To exercise any of these rights, contact privacy@synxautomate.com. We will respond within 30 days of receipt of a valid request.
            </p>
          </section>

          {/* 9. Cookies & Tracking */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">9. Cookies & Tracking</h3>
            <p className="text-gray-700 mb-3">
              We use cookies and similar technologies for:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 mb-4">
              <li>Session authentication and maintaining login state across user roles.</li>
              <li>User preferences and dashboard configuration.</li>
              <li>Usage analytics (e.g., Google Analytics or equivalent) to understand platform usage.</li>
            </ul>
            <p className="text-gray-700">
              You may manage cookie settings through your browser. Disabling essential cookies may impair Service functionality such as login persistence.
            </p>
          </section>

          {/* 10. Third-Party Integrations & Data */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">10. Third-Party Integrations & Data</h3>
            <p className="text-gray-700">
              When you connect SerpY to third-party services (WhatsApp Business, SMTP email, cloud storage, API connections), data may be transmitted to those platforms. Such transmission is governed by the respective third-party's privacy policy. We recommend reviewing those policies before enabling integrations.
            </p>
          </section>

          {/* 11. Grievance Officer */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">11. Grievance Officer</h3>
            <p className="text-gray-700 mb-3">
              In accordance with the IT Act, 2000 and SPDI Rules, we have designated a Grievance Officer:
            </p>
            <div className="text-gray-700 space-y-1 bg-gray-50 p-4 rounded">
              <p><strong>Grievance Officer, Synx Automation Private Limited</strong></p>
              <p><strong>Email:</strong> privacy@synxautomate.com</p>
              <p><strong>Address:</strong> 77 Spaces, Kumarapuram, Trivandrum, Kerala – 695011, India</p>
            </div>
            <p className="text-gray-700 mt-3">
              You may file a grievance within 30 days of any data-related concern. We will acknowledge within 48 hours and resolve within 30 days.
            </p>
          </section>

          {/* 12. Children's Privacy */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">12. Children's Privacy</h3>
            <p className="text-gray-700">
              SerpY is a business platform not intended for use by individuals under 18 years of age. We do not knowingly collect personal data from minors. Contact privacy@synxautomate.com to report any such instance.
            </p>
          </section>

          {/* 13. International Data Transfers */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">13. International Data Transfers</h3>
            <p className="text-gray-700">
              Data is primarily stored on servers located in India. Where data is processed by global cloud service providers, we ensure appropriate contractual safeguards are in place, including standard contractual clauses or equivalent mechanisms compliant with Indian data protection law.
            </p>
          </section>

          {/* 14. Changes to This Policy */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">14. Changes to This Policy</h3>
            <p className="text-gray-700">
              We may update this Policy periodically. Material changes will be communicated via email or in-app notice at least 14 days before taking effect. Continued use of the Service after notification constitutes acceptance of the revised Policy.
            </p>
          </section>

          {/* 15. Contact */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">15. Contact</h3>
            <div className="text-gray-700 space-y-1">
              <p><strong>Synx Automation Private Limited</strong></p>
              <p><strong>Address:</strong> 77 Spaces, Kumarapuram, Trivandrum, Kerala – 695011, India</p>
              <p><strong>Email:</strong> privacy@synxautomate.com</p>
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

export default PrivacyPolicy;