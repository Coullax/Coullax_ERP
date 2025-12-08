import { Suspense } from 'react'
import { PoliciesClient } from './policies-client'

export default function PoliciesPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Employee Policies</h1>
                <p className="text-muted-foreground mt-2">
                    Manage employee leave policies and configure working days and leave allocations
                </p>
            </div>

            <Suspense fallback={<div>Loading policies...</div>}>
                <PoliciesClient />
            </Suspense>
        </div>
    )
}
