import { BulkReviewClient } from './bulk-review-client'
import { redirect } from 'next/navigation'

export default function BulkReviewPage({
  searchParams,
}: {
  searchParams: { key?: string }
}) {
  // Get storage key from URL params
  if (!searchParams.key) {
    redirect('/admin/attendance')
  }

  return <BulkReviewClient storageKey={searchParams.key} />
}
