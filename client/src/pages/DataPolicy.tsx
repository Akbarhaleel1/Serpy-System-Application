import React from 'react';
import { useNavigate } from 'react-router-dom';

const DataPolicy: React.FC = () => {
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
            Data Security Policy
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
          {/* 1. Purpose & Scope */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">1. Purpose & Scope</h3>
            <p className="text-gray-700 mb-3">
              This Data Security Policy ("Policy") describes the technical and organisational security measures implemented by Synx Automation Private Limited ("Synx") to protect all data processed through SerpY ("the Service") at https://www.serpy.in.
            </p>
            <p className="text-gray-700 mb-3">
              This Policy applies to all data stored, transmitted, or processed by Synx on behalf of subscribers and their teams, including job records, inventory data, invoices, customer information, procurement records, and user account data.
            </p>
            <p className="text-gray-700">
              The Policy is aligned with the Information Technology Act, 2000, SPDI Rules, 2011, Digital Personal Data Protection Act, 2023, and ISO/IEC 27001 principles.
            </p>
          </section>

          {/* 2. Data Classification */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">2. Data Classification</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 border-b">Classification</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 border-b">Examples</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 border-b">Protection Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">Confidential</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Customer PII, GSTIN records, payment data, API credentials, user login credentials</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Highest — encrypted at rest and in transit, access restricted to authorised personnel only</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">Business Data</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Job records, inventory, invoices, procurement, production schedules</td>
                    <td className="px-4 py-3 text-sm text-gray-700">High — subscriber-owned; Synx accesses only for service delivery and support</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">Internal</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Usage analytics, operational logs, system telemetry</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Standard — restricted to Synx engineering and operations teams</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">Public</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Marketing content, documentation, feature descriptions</td>
                    <td className="px-4 py-3 text-sm text-gray-700">None — freely accessible</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 3. Infrastructure & Hosting Security */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">3. Infrastructure & Hosting Security</h3>
            
            <h4 className="text-lg font-medium text-gray-900 mb-2 mt-4">3.1 Cloud Infrastructure</h4>
            <p className="text-gray-700 mb-3">
              SerpY is hosted on enterprise-grade cloud infrastructure (AWS, Google Cloud, or equivalent) providing:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 mb-4">
              <li>Geographically distributed data centres with physical access controls, CCTV, and biometric entry.</li>
              <li>Automatic, encrypted data backups with a minimum Recovery Point Objective (RPO) of 24 hours.</li>
              <li>Server-side antivirus, intrusion detection systems (IDS), and intrusion prevention systems (IPS).</li>
              <li>Firewall rules, network segmentation, and DDoS mitigation at the network and application layers.</li>
              <li>Automated vulnerability scanning of infrastructure components.</li>
            </ul>

            <h4 className="text-lg font-medium text-gray-900 mb-2 mt-4">3.2 Data Encryption</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700 mb-4">
              <li><strong>Data in Transit:</strong> All data transmitted between user devices and our servers uses TLS 1.2 or higher (HTTPS). All API communications are encrypted.</li>
              <li><strong>Data at Rest:</strong> Sensitive data including customer PII, financial records, and credentials is encrypted using AES-256.</li>
              <li><strong>Database Encryption:</strong> Production databases are encrypted at the volume level.</li>
              <li><strong>Backups:</strong> All backup data is encrypted prior to storage and transferred over encrypted channels.</li>
            </ul>

            <h4 className="text-lg font-medium text-gray-900 mb-2 mt-4">3.3 Multi-Role Access Architecture</h4>
            <p className="text-gray-700 mb-3">
              SerpY implements a three-tier role-based access model reflecting the platform's operational design:
            </p>
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 border-b">Role</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 border-b">Access Scope</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 border-b">Security Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">Admin</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Full platform access — jobs, financials, inventory, analytics, user management, pricing</td>
                    <td className="px-4 py-3 text-sm text-gray-700">MFA strongly recommended; all actions logged; can create/revoke Manager and Staff access</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">Manager</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Job flow, task allocation, production tracking, inventory — no sensitive margin data or financial reports</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Session-bound access; cannot modify pricing, create users, or view Admin-level reports</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">Staff</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Assigned tasks only — job status updates, material usage logging, operational floor view</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Read-write limited to assigned tasks; cannot access financial, procurement, or customer data</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-700">
              Subscribers are responsible for: assigning appropriate roles to team members; revoking access promptly when staff leave or change roles; and ensuring Admin credentials are held only by authorised principals.
            </p>
          </section>

          {/* 4. Application Security */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">4. Application Security</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li><strong>Secure Development Lifecycle (SDLC):</strong> Security requirements are integrated at every stage of development — design, coding, testing, and deployment.</li>
              <li><strong>Code Reviews:</strong> All code changes undergo peer review with an explicit security focus before merge.</li>
              <li><strong>OWASP Top 10:</strong> Application controls are maintained against the OWASP Top 10 vulnerability framework, including protection against SQL injection, XSS, CSRF, and insecure direct object references.</li>
              <li><strong>Automated Scanning:</strong> Automated static analysis and dependency vulnerability scanning on every release.</li>
              <li><strong>Penetration Testing:</strong> Periodic third-party penetration tests are conducted. Critical findings are remediated before production deployment.</li>
              <li><strong>Input Validation & Sanitisation:</strong> All user inputs are validated server-side to prevent injection attacks.</li>
              <li><strong>Session Management:</strong> Sessions use secure, HttpOnly, SameSite cookies with short expiry and automatic invalidation on logout.</li>
            </ul>
          </section>

          {/* 5. GST & Invoice Data Security */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">5. GST & Invoice Data Security</h3>
            <p className="text-gray-700 mb-3">
              Given that SerpY processes GST-compliant invoices and tax records, the following additional controls apply:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>All invoice data is stored in encrypted, access-controlled databases separate from general operational data.</li>
              <li>GSTIN data is validated at input and stored only in encrypted form.</li>
              <li>Invoice export and PDF generation occurs in-session; generated documents are not permanently cached on our servers.</li>
              <li>Access to billing and invoice data within the platform is restricted to Admin-tier users by default.</li>
              <li>Audit trails for all invoice creation, modification, and dispatch events are maintained for a minimum of 7 years in line with GST record-keeping requirements.</li>
            </ul>
          </section>

          {/* 6. Access Control */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">6. Access Control</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li><strong>Principle of Least Privilege:</strong> All Synx employees and systems are granted access only to data and systems necessary for their specific function.</li>
              <li><strong>Multi-Factor Authentication (MFA):</strong> Required for all Synx engineering and administrative access to production systems.</li>
              <li><strong>Access Reviews:</strong> Periodic reviews of internal access privileges are conducted to revoke unnecessary access.</li>
              <li><strong>Privileged Access Management:</strong> Production database and infrastructure access is logged, monitored, and subject to approval workflows.</li>
              <li><strong>Audit Logs:</strong> All access to subscriber data by Synx personnel is logged and retained for a minimum of 90 days.</li>
              <li><strong>Separation of Duties:</strong> Critical operations such as production deployments and data exports require multi-person authorisation.</li>
            </ul>
          </section>

          {/* 7. Data Breach Response */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">7. Data Breach Response</h3>
            <p className="text-gray-700 mb-3">
              In the event of a confirmed or suspected personal data breach, Synx Automation Private Limited will:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li><strong>Contain:</strong> Immediately isolate affected systems to prevent further exposure.</li>
              <li><strong>Assess:</strong> Investigate the nature, scope, and impact of the breach within 24 hours of detection.</li>
              <li><strong>Notify:</strong> Where required by the DPDPA 2023 and IT Act, notify affected subscribers and the relevant regulatory authority within 72 hours of becoming aware.</li>
              <li><strong>Remediate:</strong> Implement corrective and preventive measures.</li>
              <li><strong>Document:</strong> Maintain a full record of the breach, response actions, and outcomes.</li>
            </ul>
            <p className="text-gray-700 mt-3">
              To report a suspected security incident, contact legal@synxautomate.com with the subject line "Security Incident — SerpY".
            </p>
          </section>

          {/* 8. Third-Party & Vendor Security */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">8. Third-Party & Vendor Security</h3>
            <p className="text-gray-700 mb-3">
              All third-party vendors with access to subscriber data — cloud providers, payment processors, email services, analytics tools — are engaged under contractual data processing agreements requiring:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Security standards equivalent to or higher than those described in this Policy.</li>
              <li>Restriction on sub-processing without prior written authorisation from Synx.</li>
              <li>Right to audit and production of security attestations (ISO 27001, SOC 2, or equivalent).</li>
              <li>Prompt notification of any security incident affecting shared systems or data.</li>
            </ul>
          </section>

          {/* 9. Employee & Internal Security */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">9. Employee & Internal Security</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>All Synx employees receive data security training at onboarding and annually thereafter.</li>
              <li>Background verification is conducted for all employees with access to production systems or subscriber data.</li>
              <li>Non-Disclosure Agreements (NDAs) are in place for all employees and contractors.</li>
              <li>Clean desk policy applies; physical documents containing subscriber data must be securely disposed of.</li>
              <li>All company-managed devices are encrypted and subject to remote wipe capability.</li>
            </ul>
          </section>

          {/* 10. Subscriber Responsibilities */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">10. Subscriber Responsibilities</h3>
            <p className="text-gray-700 mb-3">
              Subscribers and their teams share responsibility for the security of their accounts. Subscribers must:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Maintain the confidentiality of Admin, Manager, and Staff login credentials.</li>
              <li>Assign the minimum necessary role to each team member (avoid blanket Admin access).</li>
              <li>Revoke access immediately when a staff member leaves or changes role.</li>
              <li>Enable Multi-Factor Authentication on Admin accounts where available.</li>
              <li>Use strong, unique passwords for all user accounts on the platform.</li>
              <li>Report any suspected unauthorised access immediately to legal@synxautomate.com.</li>
              <li>Ensure that devices used to access the Service are secured with screen locks and up-to-date software.</li>
            </ul>
          </section>

          {/* 11. Business Continuity & Disaster Recovery */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">11. Business Continuity & Disaster Recovery</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li><strong>Recovery Time Objective (RTO):</strong> Core Service restoration targeted within 4 hours of a critical infrastructure failure.</li>
              <li><strong>Recovery Point Objective (RPO):</strong> Data loss targeted at no more than 24 hours.</li>
              <li><strong>Redundancy:</strong> Critical systems operate with active redundancy across multiple availability zones.</li>
              <li><strong>Failover:</strong> Automated failover mechanisms are in place for database and application tiers.</li>
              <li><strong>DR Testing:</strong> Disaster recovery procedures are tested at minimum annually; results are documented and acted upon.</li>
            </ul>
          </section>

          {/* 12. Compliance Framework */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">12. Compliance Framework</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 border-b">Standard / Regulation</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 border-b">Applicability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">Information Technology Act, 2000 (India)</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Data processing and security obligations</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">SPDI Rules, 2011 (India)</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Sensitive personal data handling</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">Digital Personal Data Protection Act, 2023 (India)</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Data fiduciary obligations, breach notification</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">ISO/IEC 27001 Principles</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Information security management framework</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">OWASP Top 10</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Application security standards</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">GST Act & Rules (India)</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Invoice data integrity and 7-year retention requirement</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">PCI DSS (via payment processors)</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Payment card data security</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 13. Policy Review */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">13. Policy Review</h3>
            <p className="text-gray-700">
              This Policy is reviewed at minimum annually, or following any significant security incident, regulatory change, or major product update. The current version is published at https://www.serpy.in.
            </p>
          </section>

          {/* 14. Contact */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">14. Contact</h3>
            <p className="text-gray-700 mb-3">
              For security queries or to report a vulnerability:
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

export default DataPolicy;