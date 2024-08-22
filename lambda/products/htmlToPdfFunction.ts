import {
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
    Context,
} from "aws-lambda";
import { S3 } from 'aws-sdk';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const htmlToPdfBucket = process.env.BUCKET_NAME_HTML_TO_PDF!;
const s3 = new S3();

export interface Content {
    documentId: number;
    year: number;
    balance: number;
}

export async function handler(
    event: APIGatewayProxyEvent,
    context: Context
): Promise<APIGatewayProxyResult> {
    const lambdaRequestId = context.awsRequestId;
    const apiRequestId = event.requestContext.requestId;
    const body = JSON.parse(event.body || "{}");
    const documentId = body?.documentId;
    const year = body?.year;
    const balance = body?.balance;

    if (!documentId || !year || !balance) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing required parameters" }),
        };
    }

    console.log(
        `API Gateway RequestId ${apiRequestId} - Lambda RequestId ${lambdaRequestId}`
    );

    console.log(
        `API BUCKET ${htmlToPdfBucket} - Lambda RequestId ${lambdaRequestId}`
    );

    if (event.resource === "/htmlToPdf") {
        console.log("POST /htmlToPdf");

        const destinationKey = `${documentId}-${year}.pdf`;

        try {
            await createPdfAndUploadToS3({ documentId, year, balance }, htmlToPdfBucket, destinationKey);

            return {
                statusCode: 200,
                body: JSON.stringify({ message: "File created" }),
            };
        } catch (copyError) {
            console.error("Error copying file:", copyError);
            return {
                statusCode: 500,
                body: JSON.stringify({ message: "Error generating file" }),
            };
        }
    }

    return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid resource path" }),
    };
}

async function createPdfAndUploadToS3(body: Content, bucketName: string, destinationKey: string) {
    try {
        const { documentId, year, balance } = body;
        const pdfDoc = await PDFDocument.create();
        const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

        const page = pdfDoc.addPage([600, 400]);
        const { width, height } = page.getSize();
        const fontSize = 30;

        page.drawText('Informe de rendimento', {
            x: 50,
            y: height - 4 * fontSize,
            size: fontSize,
            color: rgb(0, 0.53, 0.71),
            font: timesRomanFont,
        });

        page.drawText(`Document ID: ${documentId}\nYear: ${year}\nBalance: ${balance}`, {
            x: 50,
            y: height - 6 * fontSize,
            size: fontSize / 2,
            color: rgb(0, 0, 0),
            font: timesRomanFont,
        });

        const pdfBytes = await pdfDoc.save();

        await s3.putObject({
            Bucket: bucketName,
            Key: destinationKey,
            Body: pdfBytes,
            ContentType: 'application/pdf',
        }).promise();

        console.log(`File created in ${bucketName}`);
    } catch (error) {
        console.error('Error creating PDF and uploading to S3:', error);
        throw error;
    }
}