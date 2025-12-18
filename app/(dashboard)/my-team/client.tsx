'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Users, Mail, Building2, Briefcase, Calendar, ChevronDown, ChevronRight, FolderTree } from 'lucide-react'
import { getInitials, formatDate } from '@/lib/utils'

interface SubDepartment {
    id: string
    name: string
    description?: string
    head_id?: string
    members: any[]
}

interface Team {
    id: string
    name: string
    description?: string
    head_id?: string
    members: any[]
    subDepartments?: SubDepartment[]
}

interface MyTeamClientProps {
    teams: Team[]
    currentUserId: string
}

export function MyTeamClient({
    teams,
    currentUserId,
}: MyTeamClientProps) {
    const [openTeams, setOpenTeams] = useState<string[]>(teams.map(t => t.id))
    const [openSubDepts, setOpenSubDepts] = useState<string[]>([])

    const toggleTeam = (teamId: string) => {
        setOpenTeams(prev =>
            prev.includes(teamId)
                ? prev.filter(id => id !== teamId)
                : [...prev, teamId]
        )
    }

    const toggleSubDept = (subDeptId: string) => {
        setOpenSubDepts(prev =>
            prev.includes(subDeptId)
                ? prev.filter(id => id !== subDeptId)
                : [...prev, subDeptId]
        )
    }

    const MemberTable = ({ members, headId }: { members: any[], headId?: string }) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {members.map((member) => (
                    <TableRow key={member.id} className={member.id === currentUserId ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}>
                        {/* Employee Info */}
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10">
                                    <AvatarImage src={member.profile?.avatar_url} />
                                    <AvatarFallback>
                                        {member.profile ? getInitials(member.profile.full_name) : 'U'}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-medium flex items-center gap-2">
                                        {member.profile?.full_name || 'Unknown'}
                                        {member.id === currentUserId && (
                                            <Badge variant="outline" className="text-xs h-5">You</Badge>
                                        )}
                                        {member.id === headId && (
                                            <Badge variant="default" className="bg-purple-600 hover:bg-purple-700 text-xs h-5">Team Lead</Badge>
                                        )}
                                        {member.profile?.role === 'TeamLead' && member.id !== headId && (
                                            <Badge variant="secondary" className="text-xs h-5">Team Lead</Badge>
                                        )}
                                    </div>
                                    <div className="text-sm text-gray-500 flex items-center gap-1">
                                        <Mail className="w-3 h-3" />
                                        {member.profile?.email}
                                    </div>
                                </div>
                            </div>
                        </TableCell>

                        {/* Designation */}
                        <TableCell>
                            {member.designation ? (
                                <div className="flex items-center gap-1 text-sm">
                                    <Briefcase className="w-4 h-4 text-gray-400" />
                                    {member.designation.title}
                                </div>
                            ) : (
                                <span className="text-sm text-gray-400">-</span>
                            )}
                        </TableCell>

                        {/* Joined Date */}
                        <TableCell>
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                {formatDate(member.joining_date)}
                            </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                            {member.is_active !== false ? (
                                <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                                    Active
                                </Badge>
                            ) : (
                                <Badge variant="secondary" className="bg-orange-500 text-white hover:bg-orange-600">
                                    Inactive
                                </Badge>
                            )}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">My Team</h1>
                    <p className="text-gray-500 mt-1">View your department colleagues and structure</p>
                </div>
            </div>

            {/* Teams and Members */}
            {teams.length === 0 ? (
                <Card>
                    <CardContent className="p-12">
                        <div className="text-center text-gray-500">
                            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">Not assigned to a department</p>
                            <p className="text-sm mt-2">You need to be assigned to a department to view team members</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {teams.map((team) => {
                        const isOpen = openTeams.includes(team.id)
                        const totalTeamMembers = team.members.length + (team.subDepartments?.reduce((sum, sub) => sum + sub.members.length, 0) || 0)

                        return (
                            <Card key={team.id}>
                                <Collapsible open={isOpen} onOpenChange={() => toggleTeam(team.id)}>
                                    <CardHeader className="border-b bg-blue-50 dark:bg-blue-950">
                                        <CollapsibleTrigger asChild>
                                            <div className="flex items-center justify-between cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900 -m-6 p-6 rounded-t-lg transition-colors">
                                                <div className="flex items-center gap-3">
                                                    {isOpen ? (
                                                        <ChevronDown className="w-5 h-5 text-gray-500" />
                                                    ) : (
                                                        <ChevronRight className="w-5 h-5 text-gray-500" />
                                                    )}
                                                    <Building2 className="w-5 h-5 text-blue-600" />
                                                    <div>
                                                        <CardTitle className="text-lg flex items-center gap-2">
                                                            {team.name}
                                                            {team.head_id && (
                                                                <Badge variant="outline" className="text-xs font-normal ml-2">
                                                                    Has Team Lead
                                                                </Badge>
                                                            )}
                                                        </CardTitle>
                                                        {team.description && (
                                                            <p className="text-sm text-gray-500 mt-1">{team.description}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        {totalTeamMembers} total member{totalTeamMembers !== 1 ? 's' : ''}
                                                    </p>
                                                </div>
                                            </div>
                                        </CollapsibleTrigger>
                                    </CardHeader>

                                    <CollapsibleContent>
                                        <CardContent className="p-6 space-y-6">
                                            {/* Main Department Members */}
                                            {team.members.length > 0 && (
                                                <div>
                                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                                        <Users className="w-4 h-4" />
                                                        Main Department Members ({team.members.length})
                                                    </h3>
                                                    <MemberTable members={team.members} headId={team.head_id} />
                                                </div>
                                            )}

                                            {/* Sub-Departments */}
                                            {team.subDepartments && team.subDepartments.length > 0 && (
                                                <div className="space-y-4">
                                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                                        <FolderTree className="w-4 h-4" />
                                                        Sub-Departments ({team.subDepartments.length})
                                                    </h3>
                                                    {team.subDepartments.map((subDept) => {
                                                        const isSubOpen = openSubDepts.includes(subDept.id)

                                                        return (
                                                            <Card key={subDept.id} className="border-l-4 border-l-purple-400">
                                                                <Collapsible open={isSubOpen} onOpenChange={() => toggleSubDept(subDept.id)}>
                                                                    <CardHeader className="border-b bg-gray-50 dark:bg-gray-900">
                                                                        <CollapsibleTrigger asChild>
                                                                            <div className="flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 -m-6 p-4 rounded-t-lg transition-colors">
                                                                                <div className="flex items-center gap-3">
                                                                                    {isSubOpen ? (
                                                                                        <ChevronDown className="w-4 h-4 text-gray-500" />
                                                                                    ) : (
                                                                                        <ChevronRight className="w-4 h-4 text-gray-500" />
                                                                                    )}
                                                                                    <Building2 className="w-4 h-4 text-purple-500" />
                                                                                    <div>
                                                                                        <h4 className="font-medium text-sm flex items-center gap-2">
                                                                                            {subDept.name}
                                                                                            {subDept.head_id && (
                                                                                                <Badge variant="outline" className="text-xs font-normal scale-90">
                                                                                                    Has Team Lead
                                                                                                </Badge>
                                                                                            )}
                                                                                        </h4>
                                                                                        {subDept.description && (
                                                                                            <p className="text-xs text-gray-500 mt-1">{subDept.description}</p>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                                <div className="text-right">
                                                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                                        {subDept.members.length} member{subDept.members.length !== 1 ? 's' : ''}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        </CollapsibleTrigger>
                                                                    </CardHeader>

                                                                    <CollapsibleContent>
                                                                        <CardContent className="p-0">
                                                                            {subDept.members.length === 0 ? (
                                                                                <div className="text-center py-8 text-gray-500">
                                                                                    <Users className="w-8 h-8 mx-auto mb-3 opacity-50" />
                                                                                    <p className="text-sm">No members in this sub-department yet</p>
                                                                                </div>
                                                                            ) : (
                                                                                <MemberTable members={subDept.members} />
                                                                            )}
                                                                        </CardContent>
                                                                    </CollapsibleContent>
                                                                </Collapsible>
                                                            </Card>
                                                        )
                                                    })}
                                                </div>
                                            )}

                                            {/* Empty state for department with no members or sub-departments */}
                                            {team.members.length === 0 && (!team.subDepartments || team.subDepartments.length === 0) && (
                                                <div className="text-center py-8 text-gray-500">
                                                    <Users className="w-8 h-8 mx-auto mb-3 opacity-50" />
                                                    <p className="text-sm">No members or sub-departments in this department yet</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </CollapsibleContent>
                                </Collapsible>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
