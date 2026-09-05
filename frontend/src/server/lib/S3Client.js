import AWS from 'aws-sdk';
import { env } from '../config/env.js';

// Thin wrapper around `aws-sdk`'s S3 client. Application code depends on
// this class, never on `aws-sdk` directly. Only actually used when
// env.fileStorageDriver === 's3' (see services/uploadService.js).
export class S3Client {
  constructor({ region, bucket, accessKeyId, secretAccessKey } = {}) {
    this.bucket = bucket ?? env.aws.s3Bucket;
    this.s3 = new AWS.S3({
      region: region ?? env.aws.region,
      accessKeyId: accessKeyId ?? env.aws.accessKeyId,
      secretAccessKey: secretAccessKey ?? env.aws.secretAccessKey,
    });
  }

  async uploadObject({ key, body, contentType }) {
    await this.s3
      .putObject({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
      .promise();

    return this.getObjectUrl(key);
  }

  getObjectUrl(key) {
    return `https://${this.bucket}.s3.${env.aws.region}.amazonaws.com/${key}`;
  }
}

export const s3Client = new S3Client();
