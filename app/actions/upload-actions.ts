'use server'

import { b2 } from '@/lib/storage/s3'

export async function uploadToB2(formData: FormData) {
    try {
        const file = formData.get('file') as File
        const filename = formData.get('filename') as string

        if (!file || !filename) {
            throw new Error('Missing file or filename')
        }

        const arrayBuffer = await file.arrayBuffer()
        const fileBuffer = Buffer.from(arrayBuffer)

        await b2.authorize()

        const bucketId = process.env.B2_BUCKET_ID
        if (!bucketId) {
            throw new Error('B2_BUCKET_ID is not configured')
        }

        const uploadUrl = await b2.getUploadUrl({
            bucketId: bucketId
        })

        const result = await b2.uploadFile({
            uploadUrl: uploadUrl.data.uploadUrl,
            uploadAuthToken: uploadUrl.data.authorizationToken,
            fileName: filename,
            data: fileBuffer,
            mime: file.type,
        })

        // Construct public URL
        // Format: https://f{xxx}.backblazeb2.com/file/{bucketName}/{fileName}
        // Construct public URL
        // Format: https://f{xxx}.backblazeb2.com/file/{bucketName}/{fileName}
        const bucketName = process.env.B2_BUCKET_NAME

        // Note: The 'f000' part might need to be dynamic or configured. 
        // Ideally we get the download URL from the response or configuration.
        // For now, using the user's provided format but we might want to verify 'f000'.
        // However, usually it's best to use the S3 compatible URL or a friendly URL if configured.
        // Given the user hardcoded f000, I will stick to it but maybe add a comment.
        // Actually, let's try to be safer.
        // But the user code had: `const publicUrl = https://f000.backblazeb2.com/file/${bucketName}/${filename}`
        // I will use that.

        if (!bucketName) {
            throw new Error('B2_BUCKET_NAME is not configured')
        }

        const publicUrl = `https://f000.backblazeb2.com/file/${bucketName}/${filename}`

        return {
            success: true,
            publicUrl,
            fileId: result.data.fileId,
            fileName: result.data.fileName
        }
    } catch (error) {
        console.error('B2 upload error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Upload failed'
        }
    }
}
