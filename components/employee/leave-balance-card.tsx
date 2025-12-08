'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, CheckCircle2, XCircle, TrendingUp } from 'lucide-react'
import { getEmployeeCurrentBalance, getEmployeeLeaveHistory } from '@/app/actions/policy-actions'

interface LeaveBalanceCardProps {
    employeeId: string
}

export function LeaveBalanceCard({ employeeId }: LeaveBalanceCardProps) {
    const [currentBalance, setCurrentBalance] = useState<any>(null)
    const [history, setHistory] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadBalance = async () => {
            try {
                const [balance, hist] = await Promise.all([
                    getEmployeeCurrentBalance(employeeId),
                    getEmployeeLeaveHistory(employeeId),
                ])
                setCurrentBalance(balance)
                setHistory(hist || [])
            } catch (error) {
                console.error('Failed to load leave balance:', error)
            } finally {
                setLoading(false)
            }
        }

        loadBalance()
    }, [employeeId])

    if (loading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="text-center text-muted-foreground">Loading leave balance...</div>
                </CardContent>
            </Card>
        )
    }

    if (!currentBalance || !currentBalance.policy) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="text-center text-muted-foreground">
                        No leave policy assigned. Contact your administrator.
                    </div>
                </CardContent>
            </Card>
        )
    }

    const usagePercentage = (currentBalance.used_leaves / currentBalance.total_leaves) * 100

    return (
        <div className="space-y-4">
            {/* Current Month Balance */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-semibold">Leave Balance</h3>
                            <p className="text-sm text-muted-foreground">
                                {currentBalance.policy.name} - Current Month
                            </p>
                        </div>
                        <Calendar className="w-8 h-8 text-primary" />
                    </div>

                    {/* Leave Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                                {currentBalance.total_leaves}
                            </div>
                            <div className="text-xs text-muted-foreground">Total Leaves</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">
                                {currentBalance.used_leaves}
                            </div>
                            <div className="text-xs text-muted-foreground">Used</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                                {currentBalance.available_leaves}
                            </div>
                            <div className="text-xs text-muted-foreground">Available</div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Usage</span>
                            <span>{usagePercentage.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                            <div
                                className={`h-2.5 rounded-full transition-all ${usagePercentage > 80 ? 'bg-red-600' : usagePercentage > 50 ? 'bg-yellow-500' : 'bg-green-600'
                                    }`}
                                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* Carried Forward */}
                    {currentBalance.carried_forward_leaves > 0 && (
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-blue-600 dark:text-blue-400">
                                {currentBalance.carried_forward_leaves} leaves carried forward from last month
                            </span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Leave History */}
            {history.length > 0 && (
                <Card>
                    <CardContent className="p-6">
                        <h4 className="text-md font-semibold mb-4">Leave History</h4>
                        <div className="space-y-2">
                            {history.slice(0, 6).map((record: any) => {
                                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                                const isFullyUsed = record.used_leaves >= record.total_leaves

                                return (
                                    <div
                                        key={`${record.year}-${record.month}`}
                                        className="flex items-center justify-between p-3 border rounded-lg"
                                    >
                                        <div className="flex items-center gap-3">
                                            {isFullyUsed ? (
                                                <XCircle className="w-5 h-5 text-red-500" />
                                            ) : (
                                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                            )}
                                            <div>
                                                <div className="font-medium text-sm">
                                                    {monthNames[record.month - 1]} {record.year}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {record.policy?.policy_type || 'Policy'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-medium">
                                                {record.available_leaves} / {record.total_leaves}
                                            </div>
                                            <div className="text-xs text-muted-foreground">available</div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
