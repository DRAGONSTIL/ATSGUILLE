import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const region = process.env.S3_REGION
const bucket = process.env.S3_BUCKET
const accessKeyId = process.env.S3_ACCESS_KEY_ID
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY

function assertStorageConfig() {
  if (!region || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error('S3 storage is not configured. Set S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.')
  }
}

function createClient() {
  assertStorageConfig()

  return new S3Client({
    region,
    credentials: {
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
    },
  })
}

export async function uploadDocumentObject(params: {
  key: string
  contentType: string
  body: Buffer
}) {
  const client = createClient()

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    })
  )
}

export async function deleteDocumentObject(key: string) {
  const client = createClient()

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  )
}

export async function createSignedDownloadUrl(key: string, expiresInSeconds = 300) {
  const client = createClient()

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds })
}
