export type DocumentSection = 'personal' | 'education' | 'other'

export type UploadMode = 'single' | 'multiple' | 'front-back'

export type FileTypeRestriction = 'image' | 'pdf' | 'both'

export interface DocumentTypeConfig {
    id: string
    label: string
    section: DocumentSection
    uploadMode: UploadMode
    fileTypes: FileTypeRestriction
    acceptedExtensions: string
    description?: string
}

export const DOCUMENT_SECTIONS = {
    personal: {
        id: 'personal',
        label: 'Personal Documents',
        description: 'Identity and personal verification documents',
    },
    education: {
        id: 'education',
        label: 'Education & Experience',
        description: 'Academic and professional credentials',
    },
    other: {
        id: 'other',
        label: 'Other Documents',
        description: 'Additional supporting documents',
    },
} as const

export const DOCUMENT_TYPES: DocumentTypeConfig[] = [
    // Personal Documents
    {
        id: 'NIC',
        label: 'National Identity Card (NIC)',
        section: 'personal',
        uploadMode: 'front-back',
        fileTypes: 'image',
        acceptedExtensions: '.jpg,.jpeg,.png',
        description: 'Upload both front and back of your NIC',
    },
    {
        id: 'driving license',
        label: 'Driving License',
        section: 'personal',
        uploadMode: 'front-back',
        fileTypes: 'image',
        acceptedExtensions: '.jpg,.jpeg,.png',
        description: 'Upload both front and back of your driving license',
    },
    {
        id: 'birth certificate',
        label: 'Birth Certificate',
        section: 'personal',
        uploadMode: 'single',
        fileTypes: 'pdf',
        acceptedExtensions: '.pdf',
    },
    {
        id: 'grama niladhari certificate',
        label: 'Grama Niladhari Certificate',
        section: 'personal',
        uploadMode: 'single',
        fileTypes: 'pdf',
        acceptedExtensions: '.pdf',
    },
    {
        id: 'bank pass book',
        label: 'Bank Pass Book',
        section: 'personal',
        uploadMode: 'single',
        fileTypes: 'image',
        acceptedExtensions: '.jpg,.jpeg,.png',
        description: 'Upload the first page with account details',
    },
    {
        id: 'CV',
        label: 'Curriculum Vitae (CV)',
        section: 'personal',
        uploadMode: 'single',
        fileTypes: 'pdf',
        acceptedExtensions: '.pdf',
    },
    {
        id: 'passport',
        label: 'Passport',
        section: 'personal',
        uploadMode: 'single',
        fileTypes: 'image',
        acceptedExtensions: '.jpg,.jpeg,.png',
        description: 'Upload the photo page of your passport',
    },
    {
        id: 'visa',
        label: 'Visa',
        section: 'personal',
        uploadMode: 'single',
        fileTypes: 'image',
        acceptedExtensions: '.jpg,.jpeg,.png',
    },

    // Education & Experience
    {
        id: 'educational certificates',
        label: 'Educational Certificates',
        section: 'education',
        uploadMode: 'multiple',
        fileTypes: 'both',
        acceptedExtensions: '.pdf,.jpg,.jpeg,.png',
        description: 'Upload all your educational certificates',
    },
    {
        id: 'professional certificates',
        label: 'Professional Certificates',
        section: 'education',
        uploadMode: 'multiple',
        fileTypes: 'both',
        acceptedExtensions: '.pdf,.jpg,.jpeg,.png',
        description: 'Upload professional certifications and training certificates',
    },
    {
        id: 'previous service records',
        label: 'Previous Service Records',
        section: 'education',
        uploadMode: 'multiple',
        fileTypes: 'both',
        acceptedExtensions: '.pdf,.jpg,.jpeg,.png',
        description: 'Upload experience letters and service records',
    },

    // Other
    {
        id: 'other',
        label: 'Other Documents',
        section: 'other',
        uploadMode: 'multiple',
        fileTypes: 'both',
        acceptedExtensions: '.pdf,.jpg,.jpeg,.png',
    },
]

export function getDocumentConfig(documentType: string): DocumentTypeConfig | undefined {
    return DOCUMENT_TYPES.find(dt => dt.id === documentType)
}

export function getDocumentsBySection(section: DocumentSection): DocumentTypeConfig[] {
    return DOCUMENT_TYPES.filter(dt => dt.section === section)
}

export function validateFileType(file: File, config: DocumentTypeConfig): { valid: boolean; error?: string } {
    const fileExt = `.${file.name.split('.').pop()?.toLowerCase()}`
    const acceptedExts = config.acceptedExtensions.split(',')

    if (!acceptedExts.includes(fileExt)) {
        const fileTypeLabel = config.fileTypes === 'pdf' ? 'PDF files' :
            config.fileTypes === 'image' ? 'Image files (JPG, PNG)' :
                'PDF or Image files'
        return {
            valid: false,
            error: `Only ${fileTypeLabel} are allowed for ${config.label}`,
        }
    }

    return { valid: true }
}
