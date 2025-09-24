import { S3Client } from "@aws-sdk/client-s3";
declare const s3Client: S3Client;
export declare const S3_BUCKET: string;
export declare const getS3Url: (key: string) => string;
export default s3Client;
