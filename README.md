# Freight Notification Service

This repository contains a test app for a Freight Notification Service.

This version of the service is very simple. It finds a route between two locations, and if the route provider service determines there is a traffic delay, it sends a notification to the customer.

## Assumptions

For the sake of simplicity, this app makes the following assumptions.

- Checking for delays is a one-off operation. We don't need to respond to changes in traffic.
- The route waypoints are given as input to the program.
- There is only one customer.
- This app will ever only run in development.

## Running the app

1. Copy `.env.example` into `.env` and fill in the gaps

   ```
   cp .env{.example,}
   sed -i '' -e "s/<EMAIL>/$(git config --get user.email)/g" .env
   # ^^ ...or do it by hand
   ```

2. Start the temporal server (assumes the [temporal CLI](https://docs.temporal.io/cli#install) is installed)

   ```
   temporal server start-dev --db-filename temporal.db
   ```

3. Start a temporal worker

   ```
   npm run worker
   ```

4. Run the service

   ```
   npm run service -- "Amsterdam" "Berlin" "Warsaw" ...
   ```
