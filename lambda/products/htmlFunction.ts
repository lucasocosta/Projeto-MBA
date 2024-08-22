import {
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
    Context,
} from "aws-lambda";

export async function handler(
    event: APIGatewayProxyEvent,
    context: Context
): Promise<APIGatewayProxyResult> {
    const lambdaRequestId = context.awsRequestId;
    const apiRequestId = event.requestContext.requestId;

    console.log(
        `API Gateway RequestId ${apiRequestId} - Lambda RequestId ${lambdaRequestId}`
    );

    if (event.resource === "/html") {
        console.log("GET /html");

        const html = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Download PDF</title>
        </head>
        <body>
            <h2>Download PDF</h2>
        
            <label for="documentId">Document ID:</label>
            <input type="number" id="documentId" placeholder="Enter Document ID" required><br><br>
        
            <label for="year">Year:</label>
            <input type="number" id="year" placeholder="Enter Year" required><br><br>
        
            <button id="downloadBtn" disabled>Download PDF</button>
        
            <script>
                async function fetchSignedUrl(documentId, year) {
                    try {
                        // URL da sua função Lambda que retorna a URL assinada
                        const response = await fetch('https://vd27ypep8i.execute-api.us-east-1.amazonaws.com/prod/lambda1?document_id='+documentId+'&year='+year);
                        
                        if (!response.ok) {
                            throw new Error('Failed to fetch signed URL');
                        }
        
                        const data = await response.json();
                        return data.url; // URL assinada
                    } catch (error) {
                        console.error('Error fetching signed URL:', error);
                        alert('Could not retrieve the PDF URL.');
                    }
                }
        
                document.getElementById('downloadBtn').addEventListener('click', async () => {
                    const documentId = document.getElementById('documentId').value;
                    const year = document.getElementById('year').value;
        
                    if (documentId && year) {
                        const signedUrl = await fetchSignedUrl(documentId, year);
        
                        if (signedUrl) {
                            // Abre o PDF em uma nova aba
                            window.open(signedUrl, '_blank');
                        }
                    } else {
                        alert('Please enter both Document ID and Year.');
                    }
                });
        
                // Habilita o botão quando ambos os campos são preenchidos
                document.querySelectorAll('input').forEach(input => {
                    input.addEventListener('input', () => {
                        const documentId = document.getElementById('documentId').value;
                        const year = document.getElementById('year').value;
                        document.getElementById('downloadBtn').disabled = !(documentId && year);
                    });
                });
            </script>
        </body>
        </html>
        `;

        return {
            statusCode: 200,
            body: html,
            headers: {
                "Content-Type": "text/html",
            },
        };
    }

    return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid resource path" }),
    };
}
