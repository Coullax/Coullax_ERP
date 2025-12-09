declare module 'backblaze-b2' {
    export default class B2 {
        constructor(options: { applicationKeyId: string; applicationKey: string });
        authorize(): Promise<void>;
        getUploadUrl(options: { bucketId: string }): Promise<{
            data: {
                uploadUrl: string;
                authorizationToken: string;
            };
        }>;
        uploadFile(options: {
            uploadUrl: string;
            uploadAuthToken: string;
            fileName: string;
            data: Buffer;
            mime: string;
        }): Promise<{
            data: {
                fileId: string;
                fileName: string;
            };
        }>;
    }
}
