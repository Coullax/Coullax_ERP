'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { getPoliciesWithEmployeeCount } from '@/app/actions/policy-actions'
import { PolicyFormDialog } from '@/components/admin/policy-form-dialog'
import { PolicyList } from '@/components/admin/policy-list'

export function PoliciesClient() {
    const [policies, setPolicies] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreateDialog, setShowCreateDialog] = useState(false)

    const loadPolicies = async () => {
        try {
            setLoading(true)
            const data = await getPoliciesWithEmployeeCount()
            setPolicies(data)
        } catch (error: any) {
            toast.error(error.message || 'Failed to load policies')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadPolicies()
    }, [])

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Policy Management</CardTitle>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadPolicies}
                            disabled={loading}
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => setShowCreateDialog(true)}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Policy
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Loading policies...
                        </div>
                    ) : policies.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No policies found. Create your first policy to get started.
                        </div>
                    ) : (
                        <PolicyList policies={policies} onUpdate={loadPolicies} />
                    )}
                </CardContent>
            </Card>

            {showCreateDialog && (
                <PolicyFormDialog
                    onClose={() => setShowCreateDialog(false)}
                    onSuccess={loadPolicies}
                />
            )}
        </div>
    )
}
