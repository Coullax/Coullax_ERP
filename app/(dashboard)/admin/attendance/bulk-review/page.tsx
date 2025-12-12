import { BulkReviewClient } from './bulk-review-client'
import { redirect } from 'next/navigation'
import { AttendanceRecord } from '@/lib/excel-parser'

export default function BulkReviewPage({
  searchParams,
}: {
  searchParams: { data?: string }
}) {
  // Get data from URL params (base64 encoded)
  if (!searchParams.data) {
    redirect('/admin/attendance')
  }

  let records: AttendanceRecord[] = []
  try {
    const decoded = Buffer.from(searchParams.data, 'base64').toString('utf-8')
    records = JSON.parse(decoded)
  } catch (error) {
    console.error('Error parsing bulk data:', error)
    redirect('/admin/attendance')
  }

  return <BulkReviewClient initialRecords={records} />
}
