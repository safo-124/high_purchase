import Link from "next/link"

export const metadata = {
  title: "About Us | High Purchase",
  description: "Learn about High Purchase — the team, mission, and story behind Ghana's leading hire purchase management platform.",
}

export default function AboutPage() {
  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative z-10 pt-28 sm:pt-36 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs sm:text-sm text-purple-300 font-medium mb-6">🇬🇭 About Us</span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Empowering Ghanaian <br className="hidden sm:block" />
            <span className="text-gradient">Businesses to Grow</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            High Purchase was built with one goal: to help every Ghanaian business owner manage hire purchase sales
            with confidence, transparency, and ease.
          </p>
        </div>
      </section>

      {/* ===== OUR STORY ===== */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs sm:text-sm text-blue-300 font-medium mb-6">📖 Our Story</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Born from a <span className="text-gradient">Real Problem</span>
              </h2>
              <div className="space-y-4 text-sm sm:text-base text-slate-400 leading-relaxed">
                <p>
                  In Ghana, hire purchase (buy now, pay later) is how millions of people buy electronics, furniture,
                  and appliances. But for business owners, tracking these installment payments has always been a nightmare.
                </p>
                <p>
                  Notebooks get lost. Disputes arise when customers claim they&apos;ve paid but there&apos;s no record.
                  Debt collectors report different numbers than what actually comes in. And as businesses grow to
                  multiple shops, the chaos only multiplies.
                </p>
                <p>
                  We saw this firsthand working with electronics shops in Kumasi and furniture stores in Accra.
                  Business owners were losing thousands of cedis every month to poor tracking.
                </p>
                <p className="text-white font-medium">
                  So we built High Purchase — a platform that brings order to the chaos, giving every business owner
                  complete visibility and control over their hire purchase operations.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "2024", label: "Founded", icon: "🚀" },
                { value: "500+", label: "Businesses", icon: "🏢" },
                { value: "10K+", label: "Customers Served", icon: "👥" },
                { value: "10+", label: "Regions in Ghana", icon: "📍" },
              ].map((stat) => (
                <div key={stat.label} className="glass-card p-6 text-center">
                  <span className="text-2xl mb-3 block">{stat.icon}</span>
                  <p className="text-2xl sm:text-3xl font-bold text-white mb-1">{stat.value}</p>
                  <p className="text-xs text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== MISSION & VISION ===== */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
            <div className="glass-card p-6 sm:p-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/10 border border-purple-500/30 flex items-center justify-center mb-6 text-xl">
                🎯
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Our Mission</h3>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
                To digitize and simplify hire purchase management for every business in Ghana and across West Africa.
                We believe that technology should be accessible, affordable, and tailored to the way African
                businesses actually operate — not force them into foreign frameworks.
              </p>
            </div>
            <div className="glass-card p-6 sm:p-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 border border-blue-500/30 flex items-center justify-center mb-6 text-xl">
                🔭
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Our Vision</h3>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
                To become the #1 hire purchase and BNPL management platform in Africa, enabling 100,000+
                businesses to sell more, collect faster, and grow with confidence. We envision a future where
                every installment payment is tracked, transparent, and dispute-free.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== VALUES ===== */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Our Values</h2>
            <p className="text-base text-slate-400 max-w-xl mx-auto">The principles that guide everything we build.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: "🤝",
                title: "Trust & Transparency",
                desc: "Every payment, every transaction, every record — visible and verifiable. No hidden fees in our pricing, no hidden data in your reports.",
              },
              {
                icon: "🇬🇭",
                title: "Built for Ghana",
                desc: "Designed for the way Ghanaian businesses operate. Mobile money integration, SMS-first communication, and offline-friendly architecture.",
              },
              {
                icon: "⚡",
                title: "Simplicity First",
                desc: "If you can use WhatsApp, you can use High Purchase. We obsess over making complex business operations feel simple and intuitive.",
              },
              {
                icon: "🌱",
                title: "Growth Mindset",
                desc: "We grow when our customers grow. That's why we start free and scale with you. Your success is our success.",
              },
            ].map((value) => (
              <div key={value.title} className="glass-card p-6 text-center hover:-translate-y-1 transition-transform duration-300">
                <span className="text-3xl mb-4 block">{value.icon}</span>
                <h3 className="text-lg font-semibold text-white mb-3">{value.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TEAM ===== */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Meet the Team</h2>
            <p className="text-base text-slate-400 max-w-xl mx-auto">A small, passionate team building for Ghana&apos;s future.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { name: "Nana Sarfo", role: "Founder & CEO", initials: "NS", color: "from-purple-500/20 to-purple-600/20 border-purple-500/30" },
              { name: "Kwesi Mensah", role: "CTO", initials: "KM", color: "from-blue-500/20 to-blue-600/20 border-blue-500/30" },
              { name: "Adwoa Boateng", role: "Head of Design", initials: "AB", color: "from-pink-500/20 to-pink-600/20 border-pink-500/30" },
              { name: "Yaw Asante", role: "Head of Sales", initials: "YA", color: "from-green-500/20 to-green-600/20 border-green-500/30" },
            ].map((member) => (
              <div key={member.name} className="glass-card p-6 text-center group hover:-translate-y-1 transition-transform duration-300">
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${member.color} border flex items-center justify-center mx-auto mb-5`}>
                  <span className="text-xl font-bold text-white">{member.initials}</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">{member.name}</h3>
                <p className="text-sm text-slate-400">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== WHY GHANA ===== */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-5xl mb-6 block">🇬🇭</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Proudly <span className="text-gradient">Ghanaian</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto mb-8">
            High Purchase is designed, built, and operated in Ghana, for Ghanaian businesses. We understand the
            local market because we are part of it. From the bustling markets of Kumasi to the tech hubs of Accra,
            we&apos;re building tools that work for how you do business — not how Silicon Valley thinks you should.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {[
              { label: "Accra", region: "Greater Accra" },
              { label: "Kumasi", region: "Ashanti" },
              { label: "Tamale", region: "Northern" },
              { label: "Takoradi", region: "Western" },
            ].map((city) => (
              <div key={city.label} className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <p className="text-sm font-medium text-white">{city.label}</p>
                <p className="text-xs text-slate-500">{city.region}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass-card p-8 sm:p-12 relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-600/15 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-600/15 rounded-full blur-3xl" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Want to Join Our Journey?</h2>
              <p className="text-base text-slate-400 max-w-xl mx-auto mb-8">
                Whether you want to use High Purchase for your business or join our team, we&apos;d love to hear from you.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
                <Link href="/register" className="w-full sm:w-auto px-10 py-4 text-base font-semibold text-white rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all shadow-xl shadow-purple-500/25 hover:-translate-y-0.5">
                  Get Started Free →
                </Link>
                <Link href="/contact" className="w-full sm:w-auto px-10 py-4 text-base font-medium text-slate-300 hover:text-white rounded-2xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all">
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
