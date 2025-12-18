"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import {
    Users,
    Plus,
    Search,
    Calendar as CalendarIcon,
    Clock,
    CheckCircle2,
    XCircle,
    LogOut,
    MoreVertical,
    Briefcase,
    User,
    History,
    Building2
} from "lucide-react"
import { toast } from "sonner"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

import { cn, getInitials } from "@/lib/utils"
import { Visitor, VisitorStatus } from "@/lib/types"

const visitorSchema = z.object({
    full_name: z.string().min(1, "Name is required"),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    identification_id: z.string().optional(),
    company_name: z.string().optional(),
    purpose: z.string().min(1, "Purpose is required"),
    host_employee_id: z.string().min(1, "Host is required"),
    scheduled_arrival: z.string().min(1, "Arrival time is required"),
    notes: z.string().optional(),
    addToCalendar: z.boolean().default(false),
    isPublicVisit: z.boolean().default(false),
})

interface VisitorsClientProps {
    initialVisitors: Visitor[]
    employeeOptions: { id: string; name: string; email?: string }[]
}

export function VisitorsClient({ initialVisitors, employeeOptions }: VisitorsClientProps) {
    const router = useRouter()
    const supabase = createClient()
    const [visitors, setVisitors] = useState<Visitor[]>(initialVisitors)
    const [searchQuery, setSearchQuery] = useState("")
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [activeTab, setActiveTab] = useState("upcoming")

    const form = useForm<z.infer<typeof visitorSchema>>({
        resolver: zodResolver(visitorSchema),
        defaultValues: {
            full_name: "",
            email: "",
            phone: "",
            identification_id: "",
            company_name: "",
            purpose: "",
            host_employee_id: "",
            scheduled_arrival: "",
            notes: "",
            addToCalendar: false,
            isPublicVisit: false,
        },
    })

    // Filter visitors
    const filteredVisitors = visitors.filter(v =>
        v.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.purpose.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const upcomingVisitors = filteredVisitors.filter(v => v.status === 'scheduled')
    const activeVisitors = filteredVisitors.filter(v => v.status === 'checked_in')
    const pastVisitors = filteredVisitors.filter(v => v.status === 'checked_out' || v.status === 'cancelled')

    const onSubmit = async (values: z.infer<typeof visitorSchema>) => {
        try {
            const { data: { user } } = await supabase.auth.getUser()

            // 1. Create Visitor Record
            const { data: visitorData, error: visitorError } = await supabase
                .from('visitors')
                .insert({
                    full_name: values.full_name,
                    email: values.email,
                    phone: values.phone,
                    identification_id: values.identification_id,
                    company_name: values.company_name,
                    purpose: values.purpose,
                    host_employee_id: values.host_employee_id,
                    scheduled_arrival: values.scheduled_arrival,
                    notes: values.notes,
                    status: 'scheduled',
                    created_by: user?.id,
                    updated_at: new Date().toISOString()
                })
                .select(`
          *,
          host:host_employee_id (
            id,
            profile:profiles!employees_id_fkey (
              full_name,
              email,
              phone,
              avatar_url
            )
          )
        `)
                .single()

            if (visitorError) throw visitorError

            // 2. Add to Calendar if selected
            if (values.addToCalendar && values.host_employee_id) {
                // Find host's default calendar
                const { data: hostCalendar } = await supabase
                    .from('calendars')
                    .select('id')
                    .eq('owner_id', values.host_employee_id)
                    .eq('is_default', true)
                    .single()

                if (hostCalendar) {
                    // Calculate end time (default 1 hour)
                    const startTime = new Date(values.scheduled_arrival)
                    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000)

                    const { error: eventError } = await supabase
                        .from('calendar_events')
                        .insert({
                            calendar_id: hostCalendar.id,
                            title: `Visit: ${values.full_name}`,
                            description: `Visitor: ${values.full_name}\nCompany: ${values.company_name || 'N/A'}\nPurpose: ${values.purpose}`,
                            start_time: startTime.toISOString(),
                            end_time: endTime.toISOString(),
                            location: 'Office',
                            visibility: values.isPublicVisit ? 'public' : 'internal',
                            status: 'confirmed',
                            created_by: user?.id
                        })

                    if (eventError) {
                        console.error("Failed to create calendar event:", eventError)
                        toast.error("Visitor created but failed to add to calendar: " + eventError.message)
                    } else {
                        toast.success("Visitor scheduled and added to calendar")
                    }
                } else {
                    console.warn("Host has no default calendar")
                    toast.warning("Visitor created but host has no calendar")
                }
            } else {
                toast.success("Visitor scheduled successfully")
            }

            setVisitors([visitorData as Visitor, ...visitors])
            setIsAddOpen(false)
            form.reset()
            router.refresh()
        } catch (error: any) {
            console.error("Error scheduling visitor:", error)
            toast.error(`Failed to schedule visitor: ${error.message || 'Unknown'} ${error.details || ''} ${error.hint || ''}`)
        }
    }

    const handleStatusChange = async (visitorId: string, newStatus: VisitorStatus) => {
        try {
            const updates: any = { status: newStatus }

            if (newStatus === 'checked_in') {
                updates.check_in_time = new Date().toISOString()
            } else if (newStatus === 'checked_out') {
                updates.check_out_time = new Date().toISOString()
            }

            const { error } = await supabase
                .from('visitors')
                .update(updates)
                .eq('id', visitorId)

            if (error) throw error

            setVisitors(visitors.map(v =>
                v.id === visitorId ? { ...v, ...updates } : v
            ))

            toast.success(`Visitor ${newStatus === 'checked_in' ? 'checked in' : newStatus === 'checked_out' ? 'checked out' : 'updated'}`)
            router.refresh()
        } catch (error) {
            toast.error("Failed to update status")
        }
    }

    const getStatusBadge = (status: VisitorStatus) => {
        switch (status) {
            case 'scheduled':
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Scheduled</Badge>
            case 'checked_in':
                return <Badge variant="default" className="bg-green-600 hover:bg-green-700">Checked In</Badge>
            case 'checked_out':
                return <Badge variant="secondary">Checked Out</Badge>
            case 'cancelled':
                return <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200">Cancelled</Badge>
        }
    }

    const VisitorList = ({ items }: { items: Visitor[] }) => (
        <div className="space-y-4">
            {items.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No visitors found in this category</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {items.map((visitor) => (
                        <Card key={visitor.id} className="overflow-hidden hover:shadow-md transition-shadow">
                            <div className="p-6 flex flex-col md:flex-row items-center gap-6">
                                {/* Avatar/Time */}
                                <div className="flex-shrink-0 text-center md:text-left">
                                    <Avatar className="w-12 h-12 md:w-14 md:h-14 mx-auto md:mx-0">
                                        <AvatarFallback className="bg-primary/10 text-primary font-medium text-lg">
                                            {getInitials(visitor.full_name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="mt-2 text-xs font-medium text-gray-500">
                                        {format(new Date(visitor.scheduled_arrival), 'h:mm a')}
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="flex-1 text-center md:text-left space-y-1">
                                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                                        <h3 className="font-semibold text-lg">{visitor.full_name}</h3>
                                        {getStatusBadge(visitor.status)}
                                    </div>

                                    <div className="flex flex-col md:flex-row items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <Briefcase className="w-3.5 h-3.5" />
                                            {visitor.company_name || 'Independent'}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <User className="w-3.5 h-3.5" />
                                            Host: {visitor.host?.profile?.full_name || 'Unknown'}
                                        </div>
                                    </div>

                                    <div className="text-sm border-l-2 border-primary/20 pl-3 py-1 mt-2 bg-gray-50/50 rounded-r">
                                        <span className="font-medium text-gray-700">Purpose:</span> {visitor.purpose}
                                        {visitor.notes && <span className="text-gray-500 ml-2">- {visitor.notes}</span>}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    {visitor.status === 'scheduled' && (
                                        <>
                                            <Button size="sm" onClick={() => handleStatusChange(visitor.id, 'checked_in')} className="gap-1">
                                                <CheckCircle2 className="w-4 h-4" /> Check In
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => handleStatusChange(visitor.id, 'cancelled')} className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50">
                                                Cancel
                                            </Button>
                                        </>
                                    )}

                                    {visitor.status === 'checked_in' && (
                                        <Button size="sm" variant="secondary" onClick={() => handleStatusChange(visitor.id, 'checked_out')} className="gap-1 bg-orange-100 text-orange-700 hover:bg-orange-200">
                                            <LogOut className="w-4 h-4" /> Check Out
                                        </Button>
                                    )}

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem>Edit Details</DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-600">Delete Record</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Visitor Management</h1>
                    <p className="text-gray-500 mt-1">Schedule, track, and manage office visitors</p>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="w-4 h-4" /> Schedule Visit
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Schedule New Visit</DialogTitle>
                            <DialogDescription>
                                Enter the visitor's details and host information.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="full_name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Full Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="John Doe" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="company_name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Company (Optional)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Acme Inc." {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email (Optional)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="john@example.com" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="phone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Phone (Optional)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="+1 234 567 890" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="host_employee_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Host</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select host employee" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {employeeOptions.map(emp => (
                                                            <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="scheduled_arrival"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Arrival Time</FormLabel>
                                                <FormControl>
                                                    <Input type="datetime-local" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="purpose"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Purpose of Visit</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Meeting, Interview, Delivery, etc." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="addToCalendar"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mb-4">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>
                                                    Add to Host's Calendar
                                                </FormLabel>
                                                <FormDescription>
                                                    Create a calendar event for this visit.
                                                </FormDescription>
                                            </div>
                                        </FormItem>
                                    )}
                                />

                                {form.watch("addToCalendar") && (
                                    <FormField
                                        control={form.control}
                                        name="isPublicVisit"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 ml-4 mb-4">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <div className="space-y-1 leading-none">
                                                    <FormLabel>
                                                        Publish to All Calendars (Public)
                                                    </FormLabel>
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                )}

                                <FormField
                                    control={form.control}
                                    name="notes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Additional Notes</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Any badge numbers or special instructions..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <DialogFooter>
                                    <Button type="submit">Schedule Visit</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border p-1">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Search visitors by name, company, or purpose..."
                        className="pl-9 border-0 bg-transparent focus-visible:ring-0"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
                    <TabsTrigger value="upcoming" className="gap-2">
                        <CalendarIcon className="w-4 h-4" /> Upcoming
                        <Badge variant="secondary" className="ml-1 bg-gray-200 text-gray-700">{upcomingVisitors.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="active" className="gap-2">
                        <Clock className="w-4 h-4" /> Checked In
                        <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-700">{activeVisitors.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-2">
                        <History className="w-4 h-4" /> History
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="upcoming" className="mt-6">
                    <VisitorList items={upcomingVisitors} />
                </TabsContent>

                <TabsContent value="active" className="mt-6">
                    <VisitorList items={activeVisitors} />
                </TabsContent>

                <TabsContent value="history" className="mt-6">
                    <VisitorList items={pastVisitors} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
