'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Camera, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { uploadAvatar } from '@/app/actions/profile-actions'
import { getInitials } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'

interface ProfilePictureProps {
  userId: string
  currentAvatarUrl?: string
  fullName: string
  onUploadComplete?: (url: string) => void
}

export function ProfilePicture({
  userId,
  currentAvatarUrl,
  fullName,
  onUploadComplete,
}: ProfilePictureProps) {
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const profile = useAuthStore((state) => state.profile)
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin)

  console.log('Profile role:', profile?.role)
  // console.log('Is Super Admin:', isSuperAdmin())

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', userId)

      const { url } = await uploadAvatar(formData)
      setAvatarUrl(url)
      onUploadComplete?.(url)
      toast.success('Profile picture updated!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative group"
      >
        <Avatar className="w-32 h-32 border-4 border-white dark:border-gray-800 shadow-lg">
          <AvatarImage src={avatarUrl} alt={fullName} />
          <AvatarFallback className="text-3xl">
            {getInitials(fullName)}
          </AvatarFallback>
        </Avatar>

        {!isSuperAdmin() && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 p-2 rounded-full bg-black dark:bg-white text-white dark:text-black shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
          >
            {uploading ? (
              <Upload className="w-5 h-5 animate-pulse" />
            ) : (
              <Camera className="w-5 h-5" />
            )}
          </button>
        )}
      </motion.div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {!isSuperAdmin() && (
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Click camera icon to upload new photo
          </p>
          <p className="text-xs text-gray-400 mt-1">
            JPG, PNG or GIF (max 5MB)
          </p>
        </div>
      )}
    </div>
  )
}
