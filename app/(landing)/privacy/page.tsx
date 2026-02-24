import Link from "next/link"

export const metadata = {
  title: "Privacy Policy — High Purchase",
}

export default function PrivacyPage() {
  return (
    <div className="relative z-10 pt-8 sm:pt-12 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-sm text-purple-400 hover:text-purple-300 font-medium">&larr; Back to Home</Link>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Privacy Policy</h1>
        <p className="text-sm text-slate-500 mb-10">Last updated: June 2025</p>

        <div className="prose-custom space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Introduction</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              High Purchase (&quot;we&quot;, &quot;our&quot;, or &quot;the Platform&quot;) is committed to protecting the privacy of our users.
              This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our
              hire purchase management platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Information We Collect</h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-3">We collect the following types of information:</p>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex gap-2"><span className="text-purple-400">•</span> <span><strong className="text-slate-300">Account Information:</strong> Name, email address, phone number, and role within a business.</span></li>
              <li className="flex gap-2"><span className="text-purple-400">•</span> <span><strong className="text-slate-300">Business Information:</strong> Business name, type, address, shop details, and staff information.</span></li>
              <li className="flex gap-2"><span className="text-purple-400">•</span> <span><strong className="text-slate-300">Transaction Data:</strong> Purchase records, payment history, collection records, and invoices.</span></li>
              <li className="flex gap-2"><span className="text-purple-400">•</span> <span><strong className="text-slate-300">Customer Data:</strong> Customer names, contact information, purchase agreements, and payment schedules.</span></li>
              <li className="flex gap-2"><span className="text-purple-400">•</span> <span><strong className="text-slate-300">Usage Data:</strong> Login times, pages visited, and platform interaction patterns.</span></li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. How We Use Your Information</h2>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex gap-2"><span className="text-purple-400">•</span> To provide and maintain our hire purchase management services.</li>
              <li className="flex gap-2"><span className="text-purple-400">•</span> To process payments and generate financial reports.</li>
              <li className="flex gap-2"><span className="text-purple-400">•</span> To send transaction notifications via SMS and email.</li>
              <li className="flex gap-2"><span className="text-purple-400">•</span> To provide customer support and respond to enquiries.</li>
              <li className="flex gap-2"><span className="text-purple-400">•</span> To improve our platform and develop new features.</li>
              <li className="flex gap-2"><span className="text-purple-400">•</span> To comply with legal obligations and prevent fraud.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Data Storage & Security</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Your data is stored securely using industry-standard encryption and security practices. We use Prisma Postgres
              with encrypted connections. Access to personal data is restricted to authorised personnel only. We implement
              role-based access control (RBAC) to ensure users can only access data relevant to their role (Business Admin,
              Shop Admin, Sales Staff, Debt Collector, or Customer).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Data Sharing</h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-3">
              We do not sell your personal data. We may share data with:
            </p>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex gap-2"><span className="text-purple-400">•</span> <span><strong className="text-slate-300">Within your organisation:</strong> Other authorised members of your business as permitted by your role hierarchy.</span></li>
              <li className="flex gap-2"><span className="text-purple-400">•</span> <span><strong className="text-slate-300">Service providers:</strong> SMS and email delivery services for transaction notifications.</span></li>
              <li className="flex gap-2"><span className="text-purple-400">•</span> <span><strong className="text-slate-300">Legal requirements:</strong> When required by law or to protect our legal rights.</span></li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Your Rights</h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-3">Under Ghana&apos;s Data Protection Act, 2012 (Act 843), you have the right to:</p>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex gap-2"><span className="text-purple-400">•</span> Access the personal data we hold about you.</li>
              <li className="flex gap-2"><span className="text-purple-400">•</span> Request correction of inaccurate data.</li>
              <li className="flex gap-2"><span className="text-purple-400">•</span> Request deletion of your data (subject to legal retention requirements).</li>
              <li className="flex gap-2"><span className="text-purple-400">•</span> Object to certain processing of your data.</li>
              <li className="flex gap-2"><span className="text-purple-400">•</span> Withdraw consent at any time.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Cookies & Tracking</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              We use session cookies to maintain your login state. We do not use third-party tracking cookies or advertising trackers.
              Essential cookies are required for the platform to function correctly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Data Retention</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              We retain your data for as long as your account is active or as needed to provide our services.
              Transaction and financial records may be retained for up to 7 years as required by Ghanaian tax and
              financial regulations. You may request account deletion by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Changes to This Policy</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new
              policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Contact Us</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              If you have any questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="mt-3 p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 text-sm text-slate-400">
              <p>Email: <a href="mailto:privacy@highpurchase.co" className="text-purple-400 hover:text-purple-300">privacy@highpurchase.co</a></p>
              <p>Phone: +233 30 123 4567</p>
              <p>Or visit our <Link href="/contact" className="text-purple-400 hover:text-purple-300">Contact Page</Link></p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
