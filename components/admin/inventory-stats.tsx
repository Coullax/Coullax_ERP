"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, DollarSign, CheckCircle, Wrench, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

type InventoryStatsProps = {
    stats: {
        totalItems: number
        totalValue: number
        byCategory: Record<string, number>
        byStatus: Record<string, number>
        byCondition: Record<string, number>
        expiringWarranties: number
    }
}

export function InventoryStats({ stats }: InventoryStatsProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(value)
    }

    const categoryColors: Record<string, string> = {
        furniture: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
        equipment: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
        supplies: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
        electronics: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
        appliances: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
        tools: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
        vehicles: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
        other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    }

    return (
        <div className="space-y-4">
            {/* Main Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalItems}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Across all categories
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Combined inventory worth
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Available</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.byStatus['available'] || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Ready for use
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">In Maintenance</CardTitle>
                        <Wrench className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.byStatus['maintenance'] || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Under repair or servicing
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Category Breakdown */}
            {Object.keys(stats.byCategory).length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Items by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(stats.byCategory).map(([category, count]) => (
                                <Badge
                                    key={category}
                                    variant="secondary"
                                    className={categoryColors[category] || categoryColors.other}
                                >
                                    {category.charAt(0).toUpperCase() + category.slice(1)}: {count}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Status Breakdown */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Status Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {Object.entries(stats.byStatus).map(([status, count]) => (
                                <div key={status} className="flex items-center justify-between">
                                    <span className="text-sm capitalize">{status.replace('-', ' ')}</span>
                                    <Badge variant="outline">{count}</Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Condition Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {Object.entries(stats.byCondition).length > 0 ? (
                                Object.entries(stats.byCondition).map(([condition, count]) => (
                                    <div key={condition} className="flex items-center justify-between">
                                        <span className="text-sm capitalize">{condition}</span>
                                        <Badge variant="outline">{count}</Badge>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">No condition data available</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Warranty Alerts */}
            {stats.expiringWarranties > 0 && (
                <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
                    <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600 mr-2" />
                        <CardTitle className="text-sm font-medium text-orange-900 dark:text-orange-100">
                            Expiring Warranties
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-orange-800 dark:text-orange-200">
                            {stats.expiringWarranties} item(s) have warranties expiring within 30 days
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
