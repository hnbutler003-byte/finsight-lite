import { Link } from "wouter";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Simple header */}
      <header className="border-b border-gray-100 dark:border-gray-800 px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="font-display font-bold text-xl text-violet-700 dark:text-violet-400 hover:opacity-80 transition-opacity">
            FinSight Lite
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 pb-24">
        <h1 className="font-display font-bold text-4xl text-gray-900 dark:text-gray-50 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-10">Last updated: June 18, 2026</p>

        <div className="prose-custom space-y-10 font-sans text-gray-700 dark:text-gray-300 leading-relaxed">

          <p>
            Finsight Lite is operated by Finsight Limited, a company based in Nassau, Bahamas. This policy explains what
            information we collect, how we use it, and the choices available to students, parents, teachers, and
            organizations using the platform.
          </p>
          <p>This policy applies to www.finsightlite.com and the Finsight Lite platform.</p>

          <section>
            <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-gray-50 mb-3">Who this policy is for</h2>
            <p>
              Finsight Lite is used by students ages 12 to 17, their teachers, school and organization administrators,
              and parents or guardians. Some users on the platform may be under the age of 13. Where this policy refers
              to a "student," this includes users under 13, and the protections in the Children's Privacy section below
              apply specifically to them.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-gray-50 mb-3">Information we collect</h2>
            <p className="mb-4">We collect the following categories of information:</p>
            <div className="space-y-3">
              <p><strong className="text-gray-900 dark:text-gray-100">Account information.</strong> Name, email address, role (student, teacher, org admin), and organization affiliation, provided when an account is created.</p>
              <p><strong className="text-gray-900 dark:text-gray-100">Learning activity data.</strong> Lesson and module progress, quiz scores, completed games, XP, streaks, achievements, and savings goal activity within the platform.</p>
              <p><strong className="text-gray-900 dark:text-gray-100">Investment Simulator activity.</strong> Simulated buy and sell decisions made within the platform's Investment Simulator. This is a learning simulation only. No real money, real brokerage accounts, or real securities transactions are involved.</p>
              <p><strong className="text-gray-900 dark:text-gray-100">AI Tutor and Money Guide conversations.</strong> Questions and messages submitted to the AI Tutor or Money Guide chatbot, and the responses generated. These conversations may be reviewed in aggregate to improve the quality of AI responses, but are not sold or shared with third parties for advertising purposes.</p>
              <p><strong className="text-gray-900 dark:text-gray-100">Teacher feedback.</strong> Notes or messages a teacher leaves for an individual student through the platform's feedback feature. This information is visible only to that student, their teacher, and their organization's administrators.</p>
              <p><strong className="text-gray-900 dark:text-gray-100">Technical information.</strong> Standard technical data such as IP address, browser type, and device information, collected automatically for security and platform functionality.</p>
            </div>
            <p className="mt-4">
              We do not collect financial account numbers, real banking credentials, or government identification numbers.
              Nothing in the platform requires a student to connect a real bank account or investment account.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-gray-50 mb-3">How we use this information</h2>
            <p className="mb-3">We use the information collected to:</p>
            <ul className="list-disc list-inside space-y-2 ml-1">
              <li>Operate the platform and track individual student progress</li>
              <li>Allow teachers and organization administrators to view aggregate and individual student engagement and performance within their own organization</li>
              <li>Generate AI Tutor and Money Guide responses to student questions</li>
              <li>Send organization administrators periodic summary reports of their organization's usage</li>
              <li>Maintain the security and integrity of the platform</li>
              <li>Improve the platform's curriculum, games, and features over time</li>
            </ul>
            <p className="mt-4">
              We do not sell personal information. We do not use student data for targeted advertising. We do not share
              student data with any organization other than the school, academy, or organization the student is enrolled with.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-gray-50 mb-3">Where data is stored</h2>
            <p>
              All personal data collected by Finsight Lite is stored on servers located in the United States, through
              our infrastructure providers Supabase (database) and Google Cloud Storage (files and media).
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-gray-50 mb-3">Data access and organization boundaries</h2>
            <p className="mb-3">Student data is only visible to:</p>
            <ul className="list-disc list-inside space-y-2 ml-1">
              <li>The student themselves</li>
              <li>Teachers within the student's own organization</li>
              <li>Organization administrators within the student's own organization</li>
              <li>Finsight Limited staff, for the purposes of providing technical support and maintaining the platform</li>
            </ul>
            <p className="mt-4">
              Organizations cannot view or access data belonging to students in a different organization. Each
              organization's data is kept separate within the platform.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-gray-50 mb-3">Children's privacy</h2>
            <p className="mb-4">
              Some users of Finsight Lite are under the age of 13. We are committed to protecting the privacy of younger
              students and limiting the data we collect from them to what is necessary to provide the educational service.
            </p>
            <p className="mb-4">
              For students under 13, account creation and continued use of the platform should occur with the knowledge
              and involvement of a parent, guardian, teacher, or school administrator who has authorized the student's
              participation, typically through the student's school or organization's own enrollment and consent process.
            </p>
            <p className="mb-4">
              We do not knowingly collect more information from a student under 13 than is necessary for the platform's
              educational features described in this policy. We do not use data from students under 13 for advertising,
              and we do not permit students to publicly share personal information with people outside their own
              organization through the platform.
            </p>
            <p>
              Parents or guardians who wish to review, correct, or request deletion of their child's information may do
              so by contacting their child's school or organization administrator, or by contacting Finsight Limited
              directly using the information at the end of this policy.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-gray-50 mb-3">Account and data deletion</h2>
            <p className="mb-4">
              Students may permanently delete their own account and all associated personal data at any time through the
              Settings page within the platform. This action is permanent and cannot be undone, and requires a
              confirmation step before it is completed.
            </p>
            <p className="mb-4">
              Organization administrators may also process a full account and data deletion on behalf of a student,
              including in response to a request from a parent or guardian, through the organization admin dashboard.
            </p>
            <p className="mb-4">
              When an account is deleted, we permanently remove the student's personal records, including progress,
              scores, AI conversation history, and any teacher feedback associated with that student. We retain a minimal
              record that a deletion occurred, including the date and which administrator or student initiated it, for
              audit and security purposes only. This audit record does not contain the personal data that was deleted.
            </p>
            <p>
              Removing a student from an organization (for example, when they graduate or transfer) is a separate action
              from full account deletion, and does not by itself delete the student's personal data.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-gray-50 mb-3">Data sharing with third parties</h2>
            <p className="mb-3">We use the following third-party service providers to operate Finsight Lite:</p>
            <ul className="list-disc list-inside space-y-2 ml-1">
              <li><strong className="text-gray-900 dark:text-gray-100">Supabase</strong>, for database hosting</li>
              <li><strong className="text-gray-900 dark:text-gray-100">Google Cloud Storage</strong>, for file and media storage</li>
              <li><strong className="text-gray-900 dark:text-gray-100">Anthropic</strong>, to power the AI Tutor and Money Guide chatbot features</li>
            </ul>
            <p className="mt-4">
              These providers process data on our behalf and are not permitted to use it for their own independent
              purposes. We do not otherwise share, sell, or rent personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-gray-50 mb-3">Security</h2>
            <p>
              We take reasonable technical and organizational measures to protect the information stored on Finsight Lite,
              including access controls that restrict data visibility to a student's own organization. No system is
              perfectly secure, and we encourage organizations to promptly report any suspected security concern to us
              using the contact information below.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-gray-50 mb-3">Changes to this policy</h2>
            <p>
              We may update this policy from time to time as the platform evolves. The "last updated" date at the top of
              this page will reflect the most recent revision. Material changes affecting how student data is used will
              be communicated to organization administrators.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-gray-50 mb-3">Contact us</h2>
            <p>
              Questions about this policy, or requests related to accessing, correcting, or deleting personal data, can
              be directed to Finsight Limited at the contact information available on{" "}
              <a href="https://www.finsightlite.com" className="text-violet-600 dark:text-violet-400 hover:underline">www.finsightlite.com</a>.
            </p>
          </section>

          <p className="text-sm text-gray-400 dark:text-gray-500 italic border-t border-gray-100 dark:border-gray-800 pt-8">
            This policy describes Finsight Lite as it currently operates. It does not claim certifications, compliance
            frameworks, or third-party validations that have not been formally obtained.
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
