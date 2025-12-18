'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { X, User, GraduationCap, Award, Package, Phone, Settings } from 'lucide-react'
import { ProfilePicture } from '@/components/profile/profile-picture'
import { BasicInfoForm } from '@/components/profile/basic-info-form'
import { EducationSection } from '@/components/profile/education-section'
import { SkillsSection } from '@/components/profile/skills-section'
import { PasswordResetForm } from '@/components/profile/password-reset-form'

interface EmployeeDetailsDialogProps {
    employee: any
    onClose: () => void
}

export function EmployeeDetailsDialog({
    employee,
    onClose,
}: EmployeeDetailsDialogProps) {
    // Combine profile and employee data for the profile components
    const profile = employee.profile || {}

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-950 rounded-lg">
                {/* Header with Close Button */}
                <div className="sticky top-0 bg-white dark:bg-gray-950 z-10 border-b p-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Employee Profile</h2>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Header Card with Profile Picture */}
                    <Card className="bg-gradient-to-r from-black to-gray-800 dark:from-white dark:to-gray-200 text-white dark:text-black">
                        <CardContent className="p-8">
                            <div className="flex flex-col md:flex-row items-center gap-6">
                                <ProfilePicture
                                    userId={profile?.id}
                                    currentAvatarUrl={profile?.avatar_url}
                                    fullName={profile?.full_name || 'User'}
                                />
                                <div className="flex-1 text-center md:text-left">
                                    <h1 className="text-3xl font-bold mb-2">{profile?.full_name}</h1>
                                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-3">
                                        <Badge variant="secondary" className="bg-white/20 text-white dark:bg-black/20 dark:text-black">
                                            {employee?.designation?.title || 'Employee'}
                                        </Badge>
                                        <Badge variant="secondary" className="bg-white/20 text-white dark:bg-black/20 dark:text-black">
                                            {employee?.department?.name || 'No Department'}
                                        </Badge>
                                        <Badge variant="secondary" className="bg-white/20 text-white dark:bg-black/20 dark:text-black capitalize">
                                            {profile?.role}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm opacity-90">
                                        <span>📧 {profile?.email}</span>
                                        {profile?.phone && <span>📱 {profile?.phone}</span>}
                                        {employee?.employee_id && <span>🆔 {employee.employee_id}</span>}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tabs for Different Sections */}
                    <Tabs defaultValue="basic" className="w-full">
                        <TabsList className="w-full justify-start overflow-x-auto">
                            <TabsTrigger value="basic" className="gap-2">
                                <User className="w-4 h-4" />
                                Basic Info
                            </TabsTrigger>
                            <TabsTrigger value="education" className="gap-2">
                                <GraduationCap className="w-4 h-4" />
                                Education
                            </TabsTrigger>
                            <TabsTrigger value="skills" className="gap-2">
                                <Award className="w-4 h-4" />
                                Skills
                            </TabsTrigger>
                            <TabsTrigger value="inventory" className="gap-2">
                                <Package className="w-4 h-4" />
                                Inventory
                            </TabsTrigger>
                            <TabsTrigger value="emergency" className="gap-2">
                                <Phone className="w-4 h-4" />
                                Emergency
                            </TabsTrigger>
                            <TabsTrigger value="settings" className="gap-2">
                                <Settings className="w-4 h-4" />
                                Settings
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="basic">
                            <BasicInfoForm
                                userId={profile?.id}
                                profile={profile}
                                employee={employee}
                            />
                        </TabsContent>

                        <TabsContent value="education">
                            <EducationSection employeeId={profile?.id} />
                        </TabsContent>

                        <TabsContent value="skills">
                            <SkillsSection employeeId={profile?.id} />
                        </TabsContent>

                        <TabsContent value="inventory">
                            <Card>
                                <CardContent className="p-12 text-center text-gray-500">
                                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>Inventory management coming soon</p>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="emergency">
                            <Card>
                                <CardContent className="p-12 text-center text-gray-500">
                                    <Phone className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>Emergency contact is managed in Basic Info tab</p>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="settings">
                            <PasswordResetForm />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}
