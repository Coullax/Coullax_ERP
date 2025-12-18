'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { getEmployeeEducation, addEducation, deleteEducation } from '@/app/actions/profile-actions'
import { Plus, Trash2, GraduationCap, CheckCircle, Shield } from 'lucide-react'

interface EducationSectionProps {
  employeeId: string
}

interface Education {
  id: string
  degree: string
  institution: string
  field_of_study?: string
  start_year?: number
  end_year?: number
  grade?: string
  isverified?: boolean
  verified_at?: string
  verified_by?: string
}

export function EducationSection({ employeeId }: EducationSectionProps) {
  const [education, setEducation] = useState<Education[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // Check if education is verified
  const isEducationVerified = education.length > 0 && education.every(edu => edu.isverified === true)

  const [formData, setFormData] = useState({
    degree: '',
    institution: '',
    field_of_study: '',
    start_year: '',
    end_year: '',
    grade: '',
  })

  const loadEducation = useCallback(async () => {
    try {
      const data = await getEmployeeEducation(employeeId)
      setEducation(data)
    } catch (error) {
      toast.error('Failed to load education')
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  useEffect(() => {
    loadEducation()
  }, [loadEducation])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await addEducation(employeeId, {
        degree: formData.degree,
        institution: formData.institution,
        field_of_study: formData.field_of_study || undefined,
        start_year: formData.start_year ? parseInt(formData.start_year) : undefined,
        end_year: formData.end_year ? parseInt(formData.end_year) : undefined,
        grade: formData.grade || undefined,
      })

      toast.success('Education added successfully!')
      setFormData({
        degree: '',
        institution: '',
        field_of_study: '',
        start_year: '',
        end_year: '',
        grade: '',
      })
      setShowForm(false)
      loadEducation()
    } catch (error: any) {
      toast.error(error.message || 'Failed to add education')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this education entry?')) return

    try {
      await deleteEducation(id)
      toast.success('Education deleted successfully!')
      loadEducation()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete education')
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Education
          </CardTitle>
          {!isEducationVerified && (
            <Button
              onClick={() => setShowForm(!showForm)}
              variant="outline"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Education
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Verification Status Badge */}
        {isEducationVerified && (
          <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-semibold text-green-900 dark:text-green-100">Education Verified</p>
                {education[0]?.verified_at && (
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Verified on {new Date(education[0].verified_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
        )}

        <AnimatePresence>
          {showForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleSubmit}
              className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="degree">Degree *</Label>
                  <Input
                    id="degree"
                    value={formData.degree}
                    onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                    placeholder="Bachelor of Science"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="institution">Institution *</Label>
                  <Input
                    id="institution"
                    value={formData.institution}
                    onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                    placeholder="University Name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="field_of_study">Field of Study</Label>
                  <Input
                    id="field_of_study"
                    value={formData.field_of_study}
                    onChange={(e) => setFormData({ ...formData, field_of_study: e.target.value })}
                    placeholder="Computer Science"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade">Grade/GPA</Label>
                  <Input
                    id="grade"
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    placeholder="3.8/4.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_year">Start Year</Label>
                  <Input
                    id="start_year"
                    type="number"
                    value={formData.start_year}
                    onChange={(e) => setFormData({ ...formData, start_year: e.target.value })}
                    placeholder="2018"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_year">End Year</Label>
                  <Input
                    id="end_year"
                    type="number"
                    value={formData.end_year}
                    onChange={(e) => setFormData({ ...formData, end_year: e.target.value })}
                    placeholder="2022"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add</Button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : education.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No education added yet. Click &quot;Add Education&quot; to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {education.map((edu) => (
              <motion.div
                key={edu.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{edu.degree}</h4>
                      {edu.isverified && (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{edu.institution}</p>
                    {edu.field_of_study && (
                      <p className="text-sm text-gray-500 mt-1">{edu.field_of_study}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {(edu.start_year || edu.end_year) && (
                        <Badge variant="secondary">
                          {edu.start_year} - {edu.end_year || 'Present'}
                        </Badge>
                      )}
                      {edu.grade && (
                        <Badge variant="outline">Grade: {edu.grade}</Badge>
                      )}
                    </div>
                  </div>
                  {!isEducationVerified && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(edu.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
