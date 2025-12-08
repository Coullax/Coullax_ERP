import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { id } = params

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all versions for this document
    const { data: versions, error } = await supabase
      .from('document_versions')
      .select(`
        *,
        uploader:profiles(full_name, avatar_url)
      `)
      .eq('document_id', id)
      .order('version_number', { ascending: false })

    if (error) {
      console.error('Error fetching versions:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ versions: versions || [] })
  } catch (error: any) {
    console.error('Error in GET versions:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { id } = params

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const changeNotes = formData.get('change_notes') as string | null

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 50MB limit' }, { status: 400 })
    }

    // Get current document to determine next version number
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('version')
      .eq('id', id)
      .single()

    if (docError) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const nextVersion = (document.version || 0) + 1

    // Generate unique filename with version
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${id}_v${nextVersion}.${fileExt}`

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName)

    // Create version record
    const { data: version, error: versionError } = await supabase
      .from('document_versions')
      .insert({
        document_id: id,
        version_number: nextVersion,
        file_url: publicUrl,
        file_size: file.size,
        uploaded_by: user.id,
        change_notes: changeNotes
      })
      .select(`
        *,
        uploader:profiles(full_name, avatar_url)
      `)
      .single()

    if (versionError) {
      console.error('Version creation error:', versionError)
      // Clean up uploaded file
      await supabase.storage.from('documents').remove([fileName])
      return NextResponse.json({ error: 'Failed to create version' }, { status: 500 })
    }

    // Update document's current version and file URL
    await supabase
      .from('documents')
      .update({
        version: nextVersion,
        file_url: publicUrl,
        file_size: file.size,
        file_type: file.type,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    return NextResponse.json(version, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST version:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
