'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, CheckCircle2, XCircle, TrendingUp } from 'lucide-react'
import { getEmployeeCurrentBalance, getEmployeeLeaveHistory } from '@/app/actions/policy-actions'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

interface LeaveSectionProps {
    employeeId: string
}

export function LeaveSection({ employeeId }: LeaveSectionProps) {
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
            <Card className="h-full">
                <CardContent className="p-6">
                    <div className="text-center text-muted-foreground">Loading leave information...</div>
                </CardContent>
            </Card>
        )
    }

    if (!currentBalance || !currentBalance.policy) {
        return (
            <Card className="h-full">
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
        <Card>
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    Leave Balance & History
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
                {/* Current Balance Section */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h3 className="font-semibold">Current Month</h3>
                            <div className="text-sm text-muted-foreground">
                                {currentBalance.policy.name}
                            </div>
                        </div>
                    </div>

                    {/* Leave Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                                {currentBalance.total_leaves}
                            </div>
                            <div className="text-xs text-muted-foreground">Total</div>
                        </div>
                        <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                            <div className="text-2xl font-bold text-red-600">
                                {currentBalance.used_leaves}
                            </div>
                            <div className="text-xs text-muted-foreground">Used</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                                {currentBalance.available_leaves}
                            </div>
                            <div className="text-xs text-muted-foreground">Available</div>
                        </div>
                    </div>

                    {/* Usage Chart */}
                    <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                        <div className="space-y-1">
                            <span className="text-sm font-medium text-gray-500">Usage</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-bold">{usagePercentage.toFixed(0)}%</span>
                                <span className="text-xs text-gray-400">used</span>
                            </div>
                        </div>
                        <div className="h-[60px] w-[60px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { value: currentBalance.used_leaves, fill: usagePercentage > 80 ? '#ef4444' : usagePercentage > 50 ? '#eab308' : '#22c55e' },
                                            { value: currentBalance.available_leaves, fill: '#e5e7eb' }
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={20}
                                        outerRadius={25}
                                        startAngle={90}
                                        endAngle={-270}
                                        dataKey="value"
                                        stroke="none"
                                        cornerRadius={10}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
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
                </div>

                {/* Leave History Section */}
                {history.length > 0 && (
                    <div>
                        <h4 className="font-semibold mb-3">Leave History</h4>
                        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                            {history.slice(0, 3).map((record: any) => {
                                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                                const isFullyUsed = record.used_leaves >= record.total_leaves

                                return (
                                    <div
                                        key={`${record.year}-${record.month}`}
                                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
