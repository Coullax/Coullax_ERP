'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { getEmployeeSkills, addSkill, deleteSkill } from '@/app/actions/profile-actions'
import { Plus, Trash2, Award, Star } from 'lucide-react'

interface SkillsSectionProps {
  employeeId: string
}

interface Skill {
  id: string
  skill_name: string
  proficiency_level: number
  years_of_experience?: number
}

export function SkillsSection({ employeeId }: SkillsSectionProps) {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    skill_name: '',
    proficiency_level: 3,
    years_of_experience: '',
  })

  useEffect(() => {
    loadSkills()
  }, [employeeId])

  const loadSkills = async () => {
    try {
      const data = await getEmployeeSkills(employeeId)
      setSkills(data)
    } catch (error) {
      toast.error('Failed to load skills')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await addSkill(employeeId, {
        skill_name: formData.skill_name,
        proficiency_level: formData.proficiency_level,
        years_of_experience: formData.years_of_experience
          ? parseInt(formData.years_of_experience)
          : undefined,
      })

      toast.success('Skill added successfully!')
      setFormData({
        skill_name: '',
        proficiency_level: 3,
        years_of_experience: '',
      })
      setShowForm(false)
      loadSkills()
    } catch (error: any) {
      toast.error(error.message || 'Failed to add skill')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this skill?')) return

    try {
      await deleteSkill(id)
      toast.success('Skill deleted successfully!')
      loadSkills()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete skill')
    }
  }

  const getProficiencyLabel = (level: number) => {
    const labels = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Expert']
    return labels[level - 1] || 'Unknown'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Skills
          </CardTitle>
          <Button
            onClick={() => setShowForm(!showForm)}
            variant="outline"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Skill
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <AnimatePresence>
          {showForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleSubmit}
              className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="skill_name">Skill Name *</Label>
                  <Input
                    id="skill_name"
                    value={formData.skill_name}
                    onChange={(e) => setFormData({ ...formData, skill_name: e.target.value })}
                    placeholder="JavaScript, Leadership, etc."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proficiency_level">
                    Proficiency Level (1-5) *
                  </Label>
                  <select
                    id="proficiency_level"
                    value={formData.proficiency_level}
                    onChange={(e) =>
                      setFormData({ ...formData, proficiency_level: parseInt(e.target.value) })
                    }
                    className="flex h-11 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    required
                  >
                    <option value={1}>1 - Beginner</option>
                    <option value={2}>2 - Novice</option>
                    <option value={3}>3 - Intermediate</option>
                    <option value={4}>4 - Advanced</option>
                    <option value={5}>5 - Expert</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="years_of_experience">Years of Experience</Label>
                  <Input
                    id="years_of_experience"
                    type="number"
                    value={formData.years_of_experience}
                    onChange={(e) =>
                      setFormData({ ...formData, years_of_experience: e.target.value })
                    }
                    placeholder="3"
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
        ) : skills.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No skills added yet. Click "Add Skill" to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {skills.map((skill) => (
              <motion.div
                key={skill.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold">{skill.skill_name}</h4>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(skill.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 -mt-2 -mr-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < skill.proficiency_level
                          ? 'fill-black dark:fill-white text-black dark:text-white'
                          : 'text-gray-300 dark:text-gray-700'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {getProficiencyLabel(skill.proficiency_level)}
                  </Badge>
                  {skill.years_of_experience && (
                    <Badge variant="outline">
                      {skill.years_of_experience} years
                    </Badge>
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
