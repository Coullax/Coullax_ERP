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

    // Get document with related data
    const { data: document, error } = await supabase
      .from('documents')
      .select(`
        *,
        uploader:profiles!documents_uploaded_by_fkey(full_name, avatar_url),
        category:document_categories(id, name, icon, color),
        access:document_access(
          id,
          user_id,
          can_view,
          can_edit,
          can_delete,
          user:profiles(full_name, email, avatar_url)
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }
      console.error('Error fetching document:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(document)
  } catch (error: any) {
    console.error('Error in GET document:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(
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

    const body = await request.json()
    const { title, description, category_id, is_public, tags } = body

    // Update document
    const { data: document, error } = await supabase
      .from('documents')
      .update({
        title,
        description,
        category_id,
        is_public,
        tags,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        uploader:profiles!documents_uploaded_by_fkey(full_name, avatar_url),
        category:document_categories(id, name, icon, color)
      `)
      .single()

    if (error) {
      console.error('Error updating document:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(document)
  } catch (error: any) {
    console.error('Error in PATCH document:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
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

    // Get document to extract file URL
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('file_url')
      .eq('id', id)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Extract file path from URL
    const url = new URL(document.file_url)
    const filePath = url.pathname.split('/').slice(-2).join('/')

    // Delete file from storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([filePath])

    if (storageError) {
      console.error('Error deleting file from storage:', storageError)
    }

    // Delete all versions from storage
    const { data: versions } = await supabase
      .from('document_versions')
      .select('file_url')
      .eq('document_id', id)

    if (versions && versions.length > 0) {
      const versionPaths = versions.map(v => {
        const vUrl = new URL(v.file_url)
        return vUrl.pathname.split('/').slice(-2).join('/')
      })
      await supabase.storage.from('documents').remove(versionPaths)
    }

    // Delete document record (cascade will handle versions, tags, access)
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting document:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE document:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
