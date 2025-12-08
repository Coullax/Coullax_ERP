'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Edit, Trash2, Users, Calendar, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { deletePolicy } from '@/app/actions/policy-actions'
import { PolicyFormDialog } from './policy-form-dialog'

interface PolicyListProps {
    policies: any[]
    onUpdate: () => void
}

export function PolicyList({ policies, onUpdate }: PolicyListProps) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [selectedPolicy, setSelectedPolicy] = useState<any>(null)
    const [deleting, setDeleting] = useState(false)

    const handleDelete = async () => {
        if (!selectedPolicy) return

        setDeleting(true)
        try {
            await deletePolicy(selectedPolicy.id)
            toast.success('Policy deleted successfully!')
            setDeleteDialogOpen(false)
            onUpdate()
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete policy')
        } finally {
            setDeleting(false)
        }
    }

    const getPolicyTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            '5_day_permanent': '5 Day Permanent',
            '6_day_permanent': '6 Day Permanent',
            intern: 'Intern',
            contract: 'Contract',
        }
        return labels[type] || type
    }

    return (
        <>
            <div className="space-y-4">
                {policies.map((policy) => (
                    <div
                        key={policy.id}
                        className="border rounded-xl p-4 hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-semibold">{policy.name}</h3>
                                    <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                                        {getPolicyTypeLabel(policy.policy_type)}
                                    </span>
                                </div>

                                {policy.description && (
                                    <p className="text-sm text-muted-foreground mt-2">
                                        {policy.description}
                                    </p>
                                )}

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                        <div>
                                            <div className="text-xs text-muted-foreground">Working Days</div>
                                            <div className="font-medium">{policy.working_days_per_week} days/week</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                        <div>
                                            <div className="text-xs text-muted-foreground">Leave Days</div>
                                            <div className="font-medium">{policy.leave_days_per_month} days/month</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm">
                                        {policy.carry_forward_enabled ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <XCircle className="w-4 h-4 text-gray-400" />
                                        )}
                                        <div>
                                            <div className="text-xs text-muted-foreground">Carry Forward</div>
                                            <div className="font-medium">
                                                {policy.carry_forward_enabled ? 'Enabled' : 'Disabled'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm">
                                        <Users className="w-4 h-4 text-muted-foreground" />
                                        <div>
                                            <div className="text-xs text-muted-foreground">Employees</div>
                                            <div className="font-medium">{policy.employee_count}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 ml-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedPolicy(policy)
                                        setEditDialogOpen(true)
                                    }}
                                >
                                    <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedPolicy(policy)
                                        setDeleteDialogOpen(true)
                                    }}
                                    disabled={policy.employee_count > 0}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Policy</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{selectedPolicy?.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                            {deleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {editDialogOpen && selectedPolicy && (
                <PolicyFormDialog
                    policy={selectedPolicy}
                    onClose={() => {
                        setEditDialogOpen(false)
                        setSelectedPolicy(null)
                    }}
                    onSuccess={() => {
                        setEditDialogOpen(false)
                        setSelectedPolicy(null)
                        onUpdate()
                    }}
                />
            )}
        </>
    )
}
