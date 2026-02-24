import Link from "next/link"

export const metadata = {
  title: "Terms of Service — High Purchase",
}

export default function TermsPage() {
  return (
    <div className="relative z-10 pt-8 sm:pt-12 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-sm text-purple-400 hover:text-purple-300 font-medium">&larr; Back to Home</Link>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Terms of Service</h1>
        <p className="text-sm text-slate-500 mb-10">Last updated: June 2025</p>

        <div className="prose-custom space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              By accessing or using the High Purchase platform (&quot;the Service&quot;), you agree to be bound by these Terms of Service
              (&quot;Terms&quot;). If you do not agree to these Terms, you may not use the Service. These Terms apply to all users,
              including business administrators, shop administrators, sales staff, debt collectors, accountants, and customers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Description of Service</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              High Purchase is a cloud-based hire purchase management platform designed for Ghanaian businesses. The Service
              enables businesses to manage instalment-based sales, track payments, manage collections, generate financial reports,
              and communicate with customers. The Service is provided on a subscription basis.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Account Registration</h2>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex gap-2"><span className="text-purple-400">•</span> You must provide accurate and complete information during registration.</li>
              <li className="flex gap-2"><span className="text-purple-400">•</span> Business registration is subject to approval by our team.</li>
              <li className="flex gap-2"><span className="text-purple-400">•</span> You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li className="flex gap-2"><span className="text-purple-400">•</span> You must immediately notify us of any unauthorised use of your account.</li>
              <li className="flex gap-2"><span className="text-purple-400">•</span> One person may not create multiple business accounts without authorisation.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Subscription & Payment</h2>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex gap-2"><span className="text-purple-400">•</span> The Service offers free and paid subscription plans with varying features and limits.</li>
              <li className="flex gap-2"><span className="text-purple-400">•</span> Paid subscriptions are billed monthly, quarterly, or yearly as selected.</li>
              <li className="flex gap-2"><span className="text-purple-400">•</span> Payments may be made via Mobile Money (MoMo), bank transfer, or card.</li>
              <li className="flex gap-2"><span className="text-purple-400">•</span> Subscription fees are non-refundable unless otherwise stated.</li>
              <li className="flex gap-2"><span className="text-purple-400">•</span> We reserve the right to change pricing with 30 days&apos; notice.</li>
              <li className="flex gap-2"><span className="text-purple-400">•</span> Failure to pay may result in account suspension or downgrade.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. User Responsibilities</h2>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex gap-2"><span className="text-purple-400">•</span> Comply with all applicable laws of the Republic of Ghana.</li>
              <li className="flex gap-2"><span className="text-purple-400">•</span> Ensure all data entered is accurate and up to date.</li>
              <li className="flex gap-2"><span className="text-purple-400">•</span> Use the Service only for lawful hire purchase business operations.</li>
              <li className="flex gap-2"><span className="text-purple-400">•</span> Not attempt to reverse-engineer, modify, or distribute the Service.</li>
              <li className="flex gap-2"><span className="text-purple-400">•</span> Not use the Service to harass, defraud, or mislead customers.</li>
              <li className="flex gap-2"><span className="text-purple-400">•</span> Maintain fair and transparent hire purchase agreements with your customers.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Data & Content</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              You retain ownership of all data you enter into the platform. By using the Service, you grant us a limited
              licence to process and store your data as necessary to provide the Service. We will handle your data in
              accordance with our <Link href="/privacy" className="text-purple-400 hover:text-purple-300">Privacy Policy</Link> and
              Ghana&apos;s Data Protection Act, 2012 (Act 843).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Hire Purchase Compliance</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Businesses using this platform are solely responsible for ensuring their hire purchase agreements comply with
              the Hire Purchase Act, 1974 (N.R.C.D. 292) and any other applicable Ghanaian legislation. The platform
              provides tools for managing agreements but does not constitute legal advice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Service Availability</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              We strive to maintain 99.9% uptime but do not guarantee uninterrupted access. Scheduled maintenance will be
              communicated in advance where possible. We are not liable for any losses arising from service interruptions
              beyond our reasonable control.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Limitation of Liability</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              To the maximum extent permitted by law, High Purchase shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages, including loss of profits, data, or business opportunities.
              Our total liability shall not exceed the amount paid by you for the Service in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Termination</h2>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex gap-2"><span className="text-purple-400">•</span> You may cancel your account at any time.</li>
              <li className="flex gap-2"><span className="text-purple-400">•</span> We may suspend or terminate accounts that violate these Terms.</li>
              <li className="flex gap-2"><span className="text-purple-400">•</span> Upon termination, you may request an export of your data within 30 days.</li>
              <li className="flex gap-2"><span className="text-purple-400">•</span> We may retain certain data as required by law after account closure.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">11. Governing Law</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the Republic of Ghana.
              Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Ghana.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">12. Changes to Terms</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              We reserve the right to modify these Terms at any time. Material changes will be communicated via email
              or in-platform notification at least 14 days before taking effect. Continued use of the Service after
              changes take effect constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">13. Contact</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              For questions about these Terms, contact us:
            </p>
            <div className="mt-3 p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 text-sm text-slate-400">
              <p>Email: <a href="mailto:legal@highpurchase.co" className="text-purple-400 hover:text-purple-300">legal@highpurchase.co</a></p>
              <p>Phone: +233 30 123 4567</p>
              <p>Or visit our <Link href="/contact" className="text-purple-400 hover:text-purple-300">Contact Page</Link></p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
