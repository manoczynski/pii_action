import('node-fetch')

export interface Document {
  id: string
  language: string
  text: string
}

export interface AnalysisInput {
  documents: Document[]
}

export interface PiiEntityRecognition {
  kind: string
  parameters: {
    modelVersion: string
  }
  analysisInput: AnalysisInput
}

export interface ResponseDocumentRoot {
  kind: string
  results: {
    documents: ResponseDocument[]
    errors: any[]
    modelVersion: Date
  }
}

export interface ResponseDocument {
  redactedText: string
  id: string
  entities: Entity[]
  warnings: any[]
}

export interface Entity {
  text: string
  category: string
  offset: number
  length: number
  confidenceScore: number
}

export async function callPiiDetectionEndpoint(
  textToCheck: string,
  azurLanguageEndpoint: string,
  azureLanguageSubscriptionKey: string
): Promise<ResponseDocumentRoot> {
  try {
    let url = `${azurLanguageEndpoint}/language/:analyze-text?api-version=2022-05-01`

    let documents: Document[] = [
      {
        id: '1',
        language: 'en',
        text: textToCheck
      }
    ]

    let piiEntityRecognition: PiiEntityRecognition = {
      kind: 'PiiEntityRecognition',
      parameters: {
        modelVersion: 'latest'
      },
      analysisInput: {
        documents: documents
      }
    }

    return fetch(url, {
      method: 'POST',
      body: JSON.stringify(piiEntityRecognition),
      headers: {
        'Ocp-Apim-Subscription-Key': azureLanguageSubscriptionKey,
        'Content-Type': 'application/json'
      }
    })
      .then(res => res.json())
      .then(res => {
        return res as ResponseDocumentRoot
      })
  } catch (error) {
    console.log(error)
    throw error
  }
}
