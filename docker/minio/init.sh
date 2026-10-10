#!/bin/sh
set -eu

mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null
mc mb --ignore-existing "local/$S3_BUCKET" >/dev/null
mc anonymous set none "local/$S3_BUCKET" >/dev/null

cat > /tmp/app-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {"Effect":"Allow","Action":["s3:ListBucket","s3:GetBucketLocation"],"Resource":["arn:aws:s3:::$S3_BUCKET"]},
    {"Effect":"Allow","Action":["s3:GetObject","s3:PutObject","s3:DeleteObject","s3:AbortMultipartUpload","s3:ListMultipartUploadParts"],"Resource":["arn:aws:s3:::$S3_BUCKET/*"]}
  ]
}
EOF

mc admin user add local "$S3_ACCESS_KEY_ID" "$S3_SECRET_ACCESS_KEY" >/dev/null
mc admin policy create local livingmemories-app /tmp/app-policy.json >/dev/null
mc admin policy attach local livingmemories-app --user "$S3_ACCESS_KEY_ID" >/dev/null
rm -f /tmp/app-policy.json
echo "Private bucket and application credentials initialized."
