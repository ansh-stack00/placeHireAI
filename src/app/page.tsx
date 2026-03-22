import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl w-full text-center">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-12">
          <div className="w-8 h-8 rounded-full bg-[#534AB7]" />
          <span className="text-xl font-medium text-gray-900">PlaceHire</span>
        </div>

        {/* Hero */}
        <h1 className="text-4xl font-medium text-gray-900 leading-tight mb-4">
          Never lose track of a<br />job application again
        </h1>
        <p className="text-lg text-gray-500 mb-10 leading-relaxed">
          Kanban board + AI interview prep + Gmail auto-tracking.<br />
          Built for placement season and job switches.
        </p>

        {/* CTA */}
        <Link
          href="/login"
          className="inline-flex items-center gap-2 bg-[#534AB7] text-white px-8 py-3 rounded-lg text-sm font-medium hover:bg-[#3C3489] transition-colors"
        >
          Get started free
          <span>→</span>
        </Link>

        <p className="text-xs text-gray-400 mt-4">
          Free for up to 15 applications · No credit card required
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 justify-center mt-16">
          {[
            'Kanban board',
            'AI interview prep',
            'JD auto-parser',
            'Resume scoring',
            'Gmail auto-detection',
            'Analytics dashboard',
          ].map((f) => (
            <span
              key={f}
              className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full"
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </main>
  )
}