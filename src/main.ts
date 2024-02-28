import * as core from '@actions/core'
import * as github from '@actions/github'
import * as pii from './pii_detector'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {

    const subKey = core.getInput('azure-language-key', { required: true })
    const url = core.getInput('azure-language-endpoint', { required: true })
    const categories = core
      .getInput('categories', { required: true })
      .toLowerCase()
      .split('|')
    const gitHubToken = core.getInput('github-token', { required: true })
    const context = github.context

    console.log(context.payload)

    if (!categories || categories.length == 0)
      throw new Error('No categories defined')

    if (!subKey)
      throw new Error('No Azure Language Service subscription key defined')

    if (!url) throw new Error('No Azure Language Service endpoint defined')

    const client = github.getOctokit(gitHubToken)
    let textToCheck
    let containsPii = false
    let issueNumber = 0

    if (context.payload.issue && (context.payload.action === 'opened' || context.payload.action === 'edited')) {
      //An issue was opened or updated
      textToCheck = context.payload.issue.body;
      issueNumber = context.issue.number;
    }

    if (context.payload.pull_request && (context.payload.action === 'opened' || context.payload.action === 'edited')) {
      //A pull request was opened or updated
      textToCheck = context.payload.pull_request.body;
      issueNumber = context.payload.pull_request.number;
    }

    if (context.payload.comment && (context.payload.action === 'created' || context.payload.action === 'edited')) {
      //A comment was added to the issue/pull request
      textToCheck = context.payload.comment.body;
      issueNumber = context.issue.number;
    }


    // Log the current timestamp, wait, then log the new timestamp
    core.debug(new Date().toTimeString())

    const response = await pii.callPiiDetectionEndpoint(textToCheck, url, subKey)

    if (response) {
      console.log("\n\n------------------------------------------------------");


      response.results.documents.forEach(document => {
        console.log(`Document ID: ${document.id}`)
        console.log(`Redacted Text: ${document.redactedText}`)
        document.entities.forEach(entity => {

          let log = `Category: ${entity.category} detected with ${entity.confidenceScore * 100}% confidene in the following text: ${entity.text}`

          if (entity.confidenceScore > 0.6) {
            containsPii = true
          } else {
            log = `${log} - SKIPPING`
          }
          console.log(log)


          console.log(`Entity: ${entity.text}`)
          console.log(`Category: ${entity.category}`)
          console.log(`Offset: ${entity.offset}`)
          console.log(`Length: ${entity.length}`)
          console.log(`Confidence Score: ${entity.confidenceScore}`)
        })
      })
      core.setOutput("results", JSON.stringify(response));

      console.log("\n\n------------------------------------------------------");
    }

    core.debug(new Date().toTimeString())

    // Set outputs for other workflow steps to use
    core.setOutput('time', new Date().toTimeString())
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}


