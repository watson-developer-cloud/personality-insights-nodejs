# Personality Insights Nodejs Starter Application
[![Build Status](https://travis-ci.org/watson-developer-cloud/personality-insights-nodejs.svg?branch=master)](http://travis-ci.org/watson-developer-cloud/personality-insights-nodejs)
[![codecov.io](https://codecov.io/github/watson-developer-cloud/personality-insights-nodejs/coverage.svg?branch=master)](https://codecov.io/github/watson-developer-cloud/personality-insights-nodejs?branch=master)

  The IBM Watson [Personality Insights][service_url] service uses linguistic analysis to extract cognitive and social characteristics from input text such as email, text messages, tweets, forum posts, and more. By deriving cognitive and social preferences, the service helps users to understand, connect to, and communicate with other people on a more personalized level.

## Choose your development enviroment
- **Bluemix DevOps Sevices** - integrated agile planning, coding, building, and deploy to Bluemix  OR
- **CLI Cloud Foundry** - lovers of command-line tools and their favorite text editor with Bluemix

## Getting Started using Bluemix DevOps Services

1. Create a Bluemix Account

  [Sign up][sign_up] in Bluemix, or use an existing account. Watson Services in Beta are free to use.
  
2. Click [![Deploy to Bluemix](https://bluemix.net/deploy/button.png)](https://bluemix.net/deploy?repository=https://github.com/watson-developer-cloud/personality-insights-nodejs) ![Bluemix Deployments](https://deployment-tracker.mybluemix.net/stats/063c9ea15ab22e31930d4c91909186d9/badge.svg)

3. LOG IN using your Bluemix Account and then click DEPLOY to deploy the app and create a private DevOps Services project for you.

5. Click the EDIT CODE button to setup your workspace

4. **Optional:** See [Setting Up Twitter Application](#SettingUpTwitterApplication) section to enable live twitter crawling.

5. Click the GIT icon in the left column navigation toolbar to commit your changes.

6. Click the BUILD & DEPLOY button to deploy your app to Bluemix


## Getting Started using CLI Cloud Foundry

1. Create a Bluemix Account

  [Sign up][sign_up] in Bluemix, or use an existing account. Watson Services in Beta are free to use.

2. Download and install the [Cloud-foundry CLI][cloud_foundry] tool

3. Edit the `manifest.yml` file and change the `<application-name>` to something unique.

  ```none
  applications:
  - services:
    - personality-insights
    name: <application-name>
    command: npm start
    path: .
    memory: 256M
  ```
  The name you use will determinate your application url initially, e.g. `<application-name>.mybluemix.net`.

4. **Optional:** See [Setting Up Twitter Application](#SettingUpTwitterApplication) section to enable live twitter crawling.

5. Connect to Bluemix in the command line tool
  ```sh
  $ cf api https://api.ng.bluemix.net
  $ cf login -u <your user ID>
  ```

6. Create the Personality Insights service in Bluemix

  ```sh
  $ cf create-service personality_insights tiered personality-insights-service
  ```

7. Push it live!

  ```sh
  $ cf push
  ```

See the full [Getting Started][getting_started] documentation for more details, including code snippets and references.

## Running locally
  The application uses [Node.js](http://nodejs.org/) and [npm](https://www.npmjs.com/) so you will have to download and install them as part of the steps below.

1. Copy the credentials from your `personality-insights-service` service in Bluemix to `credentials.json`, you can see the credentials using:

    ```sh
    $ cf env <application-name>
    ```
    Example output:
    ```sh
    System-Provided:
    {
    "VCAP_SERVICES": {
      "personality_insights": [{
          "credentials": {
            "url": "<url>",
            "password": "<password>",
            "username": "<username>"
          },
        "label": "personality_insights",
        "name": "personality-insights-service",
        "plan": "IBM Watson Personality Insights Monthly Plan"
     }]
    }
    }
    ```

    You need to copy `username`, `password` and `url`.

2. See [Setting Up Twitter Application](#SettingUpTwitterApplication) section to enable live twitter crawling.

3. Install [Node.js](http://nodejs.org/)
4. Go to the project folder in a terminal and run:
    `npm install`
5. Start the application
6.  `npm start`
7. Go to `http://localhost:3000`

## Setting Up Twitter Application

First you need to [Create a Twitter application][create_twitter_app] and add your application's callback URL:
- For Bluemix environment: `<application-name>.mybluemix.net/auth/twitter/callback`
- For Local environment: `server.local:3000/auth/twitter/callback` (be sure to configure `hosts` file so `server.local` points `127.0.0.1`)

Edit the `credentials.json` file and change the `<consumer_key>` and `<consumer_secret>` tokens with the one from your twitter's application.

```js
{
  ...
  "twitter" : {
    "application" : {
      "consumer_key" : "<consumer_key>",
      "consumer_secret" : "<consumer_secret>"
    }
  }
  ...
}
```

## Troubleshooting

To troubleshoot your Bluemix app the main useful source of information are the logs, to see them, run:

  ```sh
  $ cf logs <application-name> --recent
  ```

## License

  This sample code is licensed under Apache 2.0. Full license text is available in [LICENSE](LICENSE).
  This sample code uses d3 and jQuery, both distributed under MIT license.

## Contributing

  See [CONTRIBUTING](CONTRIBUTING.md).

## Open Source @ IBM
Find more open source projects on the [IBM Github Page](http://ibm.github.io/)

### Privacy Notice

This node sample web application includes code to track deployments to Bluemix and other Cloud Foundry platforms. The following information is sent to a [Deployment Tracker][deploy_track_url] service on each deployment:

* Application Name (`application_name`)
* Space ID (`space_id`)
* Application Version (`application_version`)
* Application URIs (`application_uris`)

This data is collected from the `VCAP_APPLICATION` environment variable in IBM Bluemix and other Cloud Foundry platforms. This data is used by IBM to track metrics around deployments of sample applications to IBM Bluemix. Only deployments of sample applications that include code to ping the Deployment Tracker service will be tracked.

### Disabling Deployment Tracking

Deployment tracking can be disabled by removing `require('cf-deployment-tracker-client').track();` from the beginning of the `server.js` file at the root of this repo.


[deploy_track_url]: https://github.com/cloudant-labs/deployment-tracker
[create_twitter_app]: https://apps.twitter.com/app/new
[service_url]: http://www.ibm.com/smarterplanet/us/en/ibmwatson/developercloud/personality-insights.html
[cloud_foundry]: https://github.com/cloudfoundry/cli
[getting_started]: http://www.ibm.com/smarterplanet/us/en/ibmwatson/developercloud/doc/getting_started/
[sign_up]: https://console.ng.bluemix.net/registration/
