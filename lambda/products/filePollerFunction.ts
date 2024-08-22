import {
  Context,
  SNSEvent,
} from "aws-lambda";
import S3 = require("aws-sdk/clients/s3");

const bucketName = process.env.BUCKET_NAME || "";
const htmlToPdfBucket = process.env.BUCKET_NAME_HTML_TO_PDF || "";

if (!bucketName || !htmlToPdfBucket) {
  throw new Error("Environment variables BUCKET_NAME or BUCKET_NAME_HTML_TO_PDF are not set");
}

const s3 = new S3();

export async function handler(
  event: SNSEvent,
  context: Context
): Promise<void> {
  const lambdaRequestId = context.awsRequestId;
  const apiRequestId = event.Records[0].Sns.MessageId;
  console.log(
    `SNS RequestId ${apiRequestId} - Lambda RequestId ${lambdaRequestId}`
  );

  for (const record of event.Records) {
    console.log(`SNS MessageId ${record.Sns.MessageId}`);
    console.log(`SNS Message ${record.Sns.Message}`);
    await copyFile(JSON.parse(record.Sns.Message));
  }
}

async function copyFile(params: any) {
  let data;

  // Check if the data is already an object, otherwise parse it
  if (typeof params?.data === 'string') {
    try {
      data = JSON.parse(params.data);
    } catch (parseError) {
      console.error('Error parsing data field:', parseError);
      return;
    }
  } else {
    data = params.data;
  }

  const documentId = data?.documentId;
  const year = data?.year;

  if (!documentId || !year) {
    console.error('Missing documentId or year in the parameters');
    return;
  }

  const sourceKey = `${documentId}-${year}.pdf`;
  const destinationKey = `${documentId}-${year}.pdf`;

  console.log(`Copying file ${documentId}-${year}.pdf from ${sourceKey} to ${destinationKey}`);

  try {
    await s3.headObject({
      Bucket: bucketName,
      Key: destinationKey,
    }).promise();

    console.log(`File already exists in destination bucket: ${bucketName}`);
  } catch (headError: any) {
    if (headError.code === 'NotFound') {
      try {
        await s3.copyObject({
          CopySource: `${htmlToPdfBucket}/${sourceKey}`,
          Bucket: bucketName,
          Key: destinationKey,
        }).promise();

        console.log(`File copied from ${htmlToPdfBucket} to ${bucketName}`);
      } catch (copyError) {
        console.error(`Error copying file from ${htmlToPdfBucket} to ${bucketName} for documentId ${documentId}, year ${year}:`, copyError);
      }
    } else {
      console.error(`Error checking file existence in bucket ${bucketName} for key ${destinationKey}:`, headError);
    }
  }
}
