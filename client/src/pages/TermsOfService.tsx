import { Link } from "wouter";
import { FinsightLiteLogo } from "@/components/FinsightLiteLogo";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Simple header */}
      <header className="border-b border-gray-100 dark:border-gray-800 px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="inline-block hover:opacity-80 transition-opacity" aria-label="Finsight Lite home">
            <FinsightLiteLogo size={28} className="text-violet-700 dark:text-violet-400" />
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 pb-24">
        <h1 className="font-display font-bold text-4xl text-gray-900 dark:text-gray-50 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-10">Last updated: June 18, 2026</p>

        <div className="space-y-10 font-sans text-gray-700 dark:text-gray-300 leading-relaxed">

          <div className="space-y-3">
            <p>
              These Terms of Service govern access to and use of Finsight Lite, operated by Finsight Limited, a company
              based in Nassau, Bahamas. By creating an account or using the platform, you agree to these terms.
            </p>
            <p>
              If you are a student under the age of 18, you should use Finsight Lite under the supervision of a parent,
              guardian, teacher, or school administrator who has authorized your participation.
            </p>
          </div>

          <section>
            <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-gray-50 mb-3">What Finsight Lite is</h2>
            <p className="mb-4">
              Finsight Lite is a financial literacy education platform for youth ages 12 to 17, offering interactive
              lessons, money games, an Investment Simulator, and AI-assisted learning tools (Money Guide and AI Tutor),
              designed for use by schools, academies, and other organizations across the Bahamas, Barbados, Jamaica,
              Trinidad and Tobago, and the Eastern Caribbean.
            </p>
            <p className="mb-4">
              <strong className="text-gray-900 dark:text-gray-100">The Investment Simulator is a learning tool only.</strong>{" "}
              It does not involve real money, real brokerage accounts, or real securities transactions. Stock data shown
              in the simulator, including any BISX-listed companies, is used for educational illustration and does not
              constitute financial advice or a real trading platform.
            </p>
            <p>
              <strong className="text-gray-900 dark:text-gray-100">The AI Tutor and Money Guide chatbot provide general educational information.</strong>{" "}
              They do not provide personalized financial, investment, tax, or legal advice, and should not be relied
              upon as a substitute for guidance from a qualified professional.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-gray-50 mb-3">Accounts and roles</h2>
            <p className="mb-4">
              Finsight Lite supports four account types: Student, Teacher, Org Admin, and Super Admin. Each organization
              is responsible for the accuracy of the information it provides when creating accounts for its students and
              staff, and for ensuring it has appropriate authorization to enroll students, including any required parental
              or guardian consent under its own policies.
            </p>
            <p>
              A guest entry option may be available for users to explore the platform before creating an account.
              Activity under guest access may not be saved.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-gray-50 mb-3">Acceptable use</h2>
            <p className="mb-3">When using Finsight Lite, you agree not to:</p>
            <ul className="list-disc list-inside space-y-2 ml-1">
              <li>Provide false information when creating an account</li>
              <li>Attempt to access another organization's data, or another student's individual data, without authorization</li>
              <li>Use the platform to harass, bully, or share inappropriate content with other users</li>
              <li>Attempt to interfere with, disrupt, or reverse-engineer the platform</li>
              <li>Use the AI Tutor or Money Guide chatbot to attempt to extract harmful, inappropriate, or off-topic content</li>
            </ul>
            <p className="mt-4">We reserve the right to suspend or terminate accounts that violate these terms.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-gray-50 mb-3">Organization responsibilities</h2>
            <p className="mb-3">Organizations (schools, academies, ministries, and other entities) that license Finsight Lite are responsible for:</p>
            <ul className="list-disc list-inside space-y-2 ml-1">
              <li>Obtaining any consent required under their own jurisdiction's laws before enrolling students, particularly students under 13</li>
              <li>Designating appropriate Org Admins and Teachers within their own organization</li>
              <li>Promptly notifying Finsight Limited of any suspected unauthorized access to their organization's data</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-gray-50 mb-3">Content ownership</h2>
            <p className="mb-4">
              <strong className="text-gray-900 dark:text-gray-100">Our content.</strong>{" "}
              The curriculum, lessons, games, and platform design are owned by Finsight Limited. Organizations and users
              are granted a license to use this content for educational purposes while their account is active, not
              ownership of the content itself.
            </p>
            <p>
              <strong className="text-gray-900 dark:text-gray-100">Content you upload.</strong>{" "}
              Teachers who upload their own content or link external videos (such as YouTube) for their class retain
              ownership of that content, but grant Finsight Limited a license to host and display it within the platform
              for the purpose of delivering it to their students. Teachers are responsible for ensuring they have the
              right to share any content they upload or link.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-gray-50 mb-3">Data and privacy</h2>
            <p>
              Use of Finsight Lite is also governed by our{" "}
              <Link href="/privacy" className="text-violet-600 dark:text-violet-400 hover:underline">Privacy Policy</Link>,
              which explains what information we collect and how it is used, stored, and protected.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-gray-50 mb-3">Service availability</h2>
            <p>
              We aim to keep Finsight Lite available and reliable, but we do not guarantee uninterrupted access. We may
              perform maintenance, updates, or changes to the platform from time to time. We are not liable for temporary
              unavailability of the service.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-gray-50 mb-3">Disclaimers</h2>
            <p>
              Finsight Lite is provided for educational purposes. Nothing on the platform constitutes financial,
              investment, legal, or tax advice. Decisions made within the Investment Simulator or based on information
              from the AI Tutor or Money Guide chatbot are for learning purposes and should not be applied to real
              financial decisions without independent verification. The platform is provided "as is" without warranties
              of any kind, to the extent permitted by applicable law.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-gray-50 mb-3">Limitation of liability</h2>
            <p>
              To the extent permitted by law, Finsight Limited is not liable for indirect, incidental, or consequential
              damages arising from use of the platform. Our total liability for any claim relating to the platform is
              limited to the amount paid by the organization for access to the platform in the twelve months preceding
              the claim, where a fee has been paid.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-gray-50 mb-3">Termination</h2>
            <p>
              An organization or individual user may stop using Finsight Lite at any time. We may suspend or terminate
              access for violation of these terms, non-payment of applicable fees, or at the end of a licensing
              agreement, with reasonable notice where practicable. Upon termination, data may be deleted in accordance
              with our Privacy Policy and any data retention terms agreed with the organization.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-gray-50 mb-3">Changes to these terms</h2>
            <p>
              We may update these terms as the platform evolves. Continued use of Finsight Lite after an update
              constitutes acceptance of the revised terms. Material changes will be communicated to organization
              administrators where practicable.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-gray-50 mb-3">Governing law</h2>
            <p>
              These terms are governed by the laws of the Commonwealth of the Bahamas, without regard to conflict of law
              principles, except where a different governing law is required by an organization's licensing agreement or
              local regulation.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-gray-50 mb-3">Contact us</h2>
            <p>
              Questions about these terms can be directed to Finsight Limited using the contact information available
              on{" "}
              <a href="https://www.finsightlite.com" className="text-violet-600 dark:text-violet-400 hover:underline">www.finsightlite.com</a>.
            </p>
          </section>

          <p className="text-sm text-gray-400 dark:text-gray-500 italic border-t border-gray-100 dark:border-gray-800 pt-8">
            These terms describe Finsight Lite as it currently operates and do not claim certifications, compliance
            frameworks, or features not yet built.
          </p>
        </div>
      </main>

      <footer className="border-t border-gray-100 dark:border-gray-800 px-6 py-6">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400 dark:text-gray-500">
          <p>© {new Date().getFullYear()} Finsight Limited</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
