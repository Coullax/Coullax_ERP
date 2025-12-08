// Document Types
export interface Document {
  id: string
  uploaded_by: string
  title: string
  description: string | null
  file_url: string
  file_type: string | null
  file_size: number | null
  category_id: string | null
  is_public: boolean
  expiry_date: string | null
  version: number
  parent_id: string | null
  request_id: string | null
  tags: string[] | null
  created_at: string
  updated_at: string
  uploader?: {
    full_name: string
    avatar_url: string | null
  }
  category?: DocumentCategory
}

export interface DocumentCategory {
  id: string
  name: string
  description: string | null
  icon: string | null
  color: string | null
  created_at: string
  updated_at: string
}

export interface DocumentRequest {
  id: string
  employee_id: string
  request_type: DocumentRequestType
  title: string
  description: string | null
  status: DocumentRequestStatus
  fulfilled_by: string | null
  fulfilled_at: string | null
  rejection_reason: string | null
  document_id: string | null
  created_at: string
  updated_at: string
  employee?: {
    full_name: string
    employee_id: string
  }
  fulfiller?: {
    full_name: string
  }
  document?: Document
}

export type DocumentRequestStatus = 'pending' | 'fulfilled' | 'rejected'

export type DocumentRequestType =
  | 'paysheet'
  | 'salary_slip'
  | 'experience_letter'
  | 'relieving_letter'
  | 'appointment_letter'
  | 'tax_document'
  | 'certificate'
  | 'other'

export interface DocumentVersion {
  id: string
  document_id: string
  version_number: number
  file_url: string
  file_size: number | null
  uploaded_by: string
  change_notes: string | null
  created_at: string
  uploader?: {
    full_name: string
    avatar_url: string | null
  }
}

export interface DocumentAccess {
  id: string
  document_id: string
  user_id: string
  can_view: boolean
  can_edit: boolean
  can_delete: boolean
  granted_by: string | null
  created_at: string
  user?: {
    full_name: string
    email: string
    avatar_url: string | null
  }
}

export interface DocumentTag {
  id: string
  document_id: string
  tag: string
  created_at: string
}

// API Request/Response Types
export interface CreateDocumentRequest {
  title: string
  description?: string
  category_id?: string
  is_public?: boolean
  tags?: string[]
  file: File
}

export interface UpdateDocumentRequest {
  title?: string
  description?: string
  category_id?: string
  is_public?: boolean
  tags?: string[]
}

export interface CreateDocumentRequestRequest {
  request_type: DocumentRequestType
  title: string
  description?: string
}

export interface FulfillDocumentRequestRequest {
  document_id: string
}

export interface RejectDocumentRequestRequest {
  rejection_reason: string
}

export interface CreateDocumentVersionRequest {
  file: File
  change_notes?: string
}

export interface SearchDocumentsParams {
  search?: string
  category?: string
  tags?: string[]
  file_type?: string
  start_date?: string
  end_date?: string
  page?: number
  limit?: number
  sort?: 'relevance' | 'date' | 'name'
}

export interface DocumentsResponse {
  documents: Document[]
  total: number
  page: number
  limit: number
}

export interface GrantDocumentAccessRequest {
  user_id: string
  can_view: boolean
  can_edit: boolean
  can_delete: boolean
}
