# Freight Notification Service

This repository contains a test app for a Freight Notification Service.

This version of the service is very simple. It finds a route between two locations, and if the route provider service determines there is a traffic delay, it sends a notification to the customer.

## Assumptions

For the sake of simplicity, this app makes the following assumptions.

- Checking for delays is a one-off operation. We don't need to respond to changes in traffic.
- The route waypoints are given as input to the program.
- Some values are static (i.e. the "From" email field, the customer name, or our company name).
- This app will ever only run in development. No need to specify the Temporal host.

## Prerequisites

The app uses [Mapbox](https://www.mapbox.com) for geolocation and navigation, [Resend](https://resend.com/) for emails, and [OpenAI](https://platform.openai.com) for composing email messages. API keys are needed for all of them.

## Running the app

1. Copy `.env.example` into `.env` and fill in the gaps

   ```
   cp .env{.example,}
   sed -i '' -e "s/<EMAIL>/$(git config --get user.email)/g" .env # Recommended for testing
   ```

2. Start the temporal server (assumes the [temporal CLI](https://docs.temporal.io/cli#install) is installed)

   ```
   temporal server start-dev --db-filename temporal.db
   ```

3. Start a temporal worker

   ```
   npm run worker
   ```

4. Run the workflow

   ```
   npm run workflow -- "Amsterdam, The Netherlands" "Warsaw, Poland" ...
   ```

## Running the tests

The app uses Node's builtin test functions. To run the tests, execute:

```
npm test
```
