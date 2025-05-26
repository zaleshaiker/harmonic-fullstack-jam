# Welcome to the Harmonic Fullstack Jam! :D

Please familiarize yourself with any docs provided to you before continuing.

In this repo, you'll find 2 deployable services:

1. Backend - dockerized deployable that will spin up a Python backend with FastAPI, Postgres SQL DB and some seeded data.
2. Frontend - locally deployable app via Vite with TypeScript/React

Please refer to the individual READMEs in the respective repos to get started!

Enjoy :D

---

In my implementation, I focused on user experience. I tested out the add all functionality locally and found it to take multiple minutes, I knew I wanted to ensure that the user was not waiting watching an infinite loading indicator. Because of this, I decided to take an async approach to the API design, I built a single API to add companies to a collection by either providing a list of company IDs (when a user selects a handful of companies from the table) or by providing another collection ID (for adding the entirety of one collection to another). Both approaches generates a bulk add background job and returns the job ID so that the front end can poll to see the progress of the action.

The tradeoff with this API design is that there is an overhead to setting up the bulk add job that may not be necessary for adding a small number of companies. This also applies to the front end which needs to make more network calls than may be necessary for smaller actions. If I could continue building this feature out, I would first like to take a better approach with error handling. So far the only error handling that's present is input validation, I'd like to add better error handling for unexpected 5xx errors. I would also like to add tests around the APIs, I don't feel very confident in them at the moment given the time constraint. Another area I'd like to improve is the front end user experience, there seems to be some lag and unnecessary network calls that I would like to clean up before releasing to users. Finally, I implemented a cancel bulk add job API but didn't add it to the front end because I couldn't figure out the best way to present it to the user. This would be another area I'd like to focus on to all the user to have more flexibility with controlling the async job.

## Demo Video

https://youtu.be/m5MsbDirQ2k
