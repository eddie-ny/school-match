import { PageTitle } from '../components/ui'

export default function Privacy() {
  return (
    <div className="max-w-2xl space-y-4">
      <PageTitle title="Privacy notice" />
      <div className="rounded-xl bg-brand-orange/20 p-4 text-sm font-medium">
        Placeholder text. This must be written or reviewed by a lawyer against the Ghana Data Protection Act before launch.
      </div>
      <p>We collect your name, contact details, date of birth, school details and exam results to match you with schools and scholarships.</p>
      <p>If you are under 18, a parent or guardian must confirm your account before it is fully active.</p>
      <p>Final wording, retention periods and how to withdraw consent will be added here.</p>
    </div>
  )
}
