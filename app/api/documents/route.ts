import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { uploadToB2 } from '@/app/actions/upload-actions'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Get query parameters
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category')
    const tags = searchParams.get('tags')?.split(',').filter(Boolean)
    const fileType = searchParams.get('file_type')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sort = searchParams.get('sort') || 'date'

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Build query
    let query = supabase
      .from('documents')
      .select(`
        *,
        uploader:profiles!documents_uploaded_by_fkey(full_name, avatar_url),
        category:document_categories(id, name, icon, color)
      `, { count: 'exact' })

    // Apply filters
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    if (category) {
      query = query.eq('category_id', category)
    }

    if (tags && tags.length > 0) {
      query = query.contains('tags', tags)
    }

    if (fileType) {
      query = query.ilike('file_type', `%${fileType}%`)
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    // Apply sorting
    switch (sort) {
      case 'name':
        query = query.order('title', { ascending: true })
        break
      case 'date':
      default:
        query = query.order('created_at', { ascending: false })
        break
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: documents, error, count } = await query

    if (error) {
      console.error('Error fetching documents:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      documents: documents || [],
      total: count || 0,
      page,
      limit
    })
  } catch (error: any) {
    console.error('Error in documents API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string | null
    const categoryId = formData.get('category_id') as string | null
    const isPublic = formData.get('is_public') === 'true'
    const tagsStr = formData.get('tags') as string | null
    const tags = tagsStr ? JSON.parse(tagsStr) : null

    if (!file || !title) {
      return NextResponse.json({ error: 'File and title are required' }, { status: 400 })
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 50MB limit' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/png',
      'image/jpeg',
      'image/jpg'
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `documents/${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

    // Upload file to Backblaze B2
    const uploadFormData = new FormData()
    uploadFormData.append('file', file)
    uploadFormData.append('filename', fileName)

    const uploadResult = await uploadToB2(uploadFormData)

    if (!uploadResult.success || !uploadResult.publicUrl) {
      console.error('B2 upload error:', uploadResult.error)
      return NextResponse.json({ error: uploadResult.error || 'Failed to upload file to B2' }, { status: 500 })
    }

    const publicUrl = uploadResult.publicUrl

    // Create document record
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        uploaded_by: user.id,
        title,
        description,
        file_url: publicUrl,
        file_type: file.type,
        file_size: file.size,
        category_id: categoryId,
        is_public: isPublic,
        tags,
        version: 1
      })
      .select(`
        *,
        uploader:profiles!documents_uploaded_by_fkey(full_name, avatar_url),
        category:document_categories(id, name, icon, color)
      `)
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Failed to create document record' }, { status: 500 })
    }

    // Create initial version record
    await supabase.from('document_versions').insert({
      document_id: document.id,
      version_number: 1,
      file_url: publicUrl,
      file_size: file.size,
      uploaded_by: user.id,
      change_notes: 'Initial version'
    })

    return NextResponse.json(document, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST documents:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
