"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getInitials } from "@/lib/utils";
import { Mail, Phone, Search, Building2, User2 } from "lucide-react";

interface FamilyMember {
    id: string;
    profile: {
        full_name: string;
        email: string;
        avatar_url: string | null;
        phone: string | null;
    } | null;
    department: {
        name: string;
    } | null;
    designation: {
        title: string;
    } | null;
}

export function FamilyClient({ members }: { members: FamilyMember[] }) {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredMembers = members.filter((member) =>
        member.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.department?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.designation?.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Coullax Family</h2>
                    <p className="text-muted-foreground">
                        Contact details of all employees in the organization.
                    </p>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Search employees..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredMembers.map((member) => (
                    <Card key={member.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        <CardHeader className="p-0">
                            <div className="h-24 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-950 dark:to-purple-950" />
                        </CardHeader>
                        <CardContent className="p-6 pt-0">
                            <div className="flex flex-col items-center -mt-12 text-center">
                                <Avatar className="w-24 h-24 border-4 border-white dark:border-gray-950 shadow-md">
                                    <AvatarImage src={member.profile?.avatar_url || ""} />
                                    <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                                        {getInitials(member.profile?.full_name || "User")}
                                    </AvatarFallback>
                                </Avatar>

                                <h3 className="mt-4 font-semibold text-lg truncate w-full">
                                    {member.profile?.full_name || "Unknown Name"}
                                </h3>

                                <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="secondary" className="font-normal truncate max-w-[150px]">
                                        {member.designation?.title || "No Designation"}
                                    </Badge>
                                </div>

                                <div className="mt-6 w-full space-y-3 text-sm text-left">
                                    <div className="flex items-center gap-3 text-muted-foreground">
                                        <Building2 className="w-4 h-4 flex-shrink-0" />
                                        <span className="truncate">{member.department?.name || "No Department"}</span>
                                    </div>

                                    <div className="flex items-center gap-3 text-muted-foreground">
                                        <Mail className="w-4 h-4 flex-shrink-0" />
                                        <a href={`mailto:${member.profile?.email}`} className="truncate hover:text-primary transition-colors">
                                            {member.profile?.email || "No Email"}
                                        </a>
                                    </div>

                                    {member.profile?.phone && (
                                        <div className="flex items-center gap-3 text-muted-foreground">
                                            <Phone className="w-4 h-4 flex-shrink-0" />
                                            <a href={`tel:${member.profile?.phone}`} className="truncate hover:text-primary transition-colors">
                                                {member.profile?.phone}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filteredMembers.length === 0 && (
                <div className="text-center py-12">
                    <User2 className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <h3 className="text-lg font-medium">No employees found</h3>
                    <p className="text-muted-foreground">Detailed search did not match any family members.</p>
                </div>
            )}
        </div>
    );
}
